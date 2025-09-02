import { supabase } from '../config/supabase';

// Type definitions for framework configurations
export type WeightedSumConfig = {
  engine: 'weighted_sum';
  questions: { 
    qkey: string; 
    map?: Record<string, number>; 
    type?: string; 
    transform?: string; 
    max?: number;
    scale?: number[];
    scores?: number[];
  }[];
  bands: { min: number; max: number; bucket: string }[];
  scale_max?: number;
};

export type ThreePillarConfig = {
  engine: 'three_pillar';
  pillars: {
    capacity: { 
      inputs: Array<{
        qkey: string;
        map?: Record<string, number>;
        type?: string;
        transform?: string;
        scale?: number[];
        scores?: number[];
      }>; 
      weights: Record<string, number> 
    };
    tolerance: { 
      inputs: Array<{
        qkey: string;
        map?: Record<string, number>;
        type?: string;
        transform?: string;
        scale?: number[];
        scores?: number[];
      }>; 
      weights: Record<string, number> 
    };
    need: { 
      inputs: Array<{
        qkey: string;
        map?: Record<string, number>;
        type?: string;
        transform?: string;
        scale?: number[];
        scores?: number[];
      }>; 
      weights: Record<string, number> 
    };
  };
  decision: {
    formula: 'min(capacity, tolerance)';
    warnings?: { if: string; message: string }[];
    bucket_bands: { min: number; max: number; bucket: string }[];
  };
};

export type FrameworkConfig = WeightedSumConfig | ThreePillarConfig;

export type ScoringResult = {
  score: number | null;
  bucket: string | null;
  rubric: {
    capacity?: number;
    tolerance?: number;
    need?: number;
    warnings?: string[];
    [key: string]: any;
  };
};

/**
 * Score a submission using the specified framework configuration
 */
export function scoreSubmission(cfg: FrameworkConfig, answers: Record<string, any>): ScoringResult {
  try {
    if (cfg.engine === 'weighted_sum') {
      return scoreWeightedSum(cfg, answers);
    } else if (cfg.engine === 'three_pillar') {
      return scoreThreePillar(cfg, answers);
    } else {
      throw new Error(`Unsupported scoring engine: ${(cfg as any).engine}`);
    }
  } catch (error) {
    console.error('Error scoring submission:', error);
    return {
      score: null,
      bucket: null,
      rubric: { error: 'Scoring failed' }
    };
  }
}

/**
 * Score using weighted sum approach
 */
function scoreWeightedSum(cfg: WeightedSumConfig, answers: Record<string, any>): ScoringResult {
  let totalScore = 0;
  const scoredQuestions: Record<string, any> = {};

  for (const question of cfg.questions) {
    const answer = answers[question.qkey];
    if (answer === undefined || answer === null) {
      continue;
    }

    let score = 0;
    
    if (question.map && question.map[answer] !== undefined) {
      // Direct mapping
      score = question.map[answer];
    } else if (question.type === 'percent') {
      // Percentage transformation
      const numValue = parseFloat(answer);
      if (!isNaN(numValue)) {
        if (question.transform === '100 - value') {
          score = 100 - numValue;
        } else {
          score = numValue;
        }
        if (question.max !== undefined) {
          score = Math.min(score, question.max);
        }
      }
    } else if (question.type === 'scale' && question.scale && question.scores) {
      // Scale-based scoring
      const numValue = parseFloat(answer);
      if (!isNaN(numValue)) {
        const scaleIndex = question.scale.findIndex((s: number) => numValue <= s);
        if (scaleIndex >= 0 && question.scores[scaleIndex] !== undefined) {
          score = question.scores[scaleIndex];
        }
      }
    }

    scoredQuestions[question.qkey] = { answer, score };
    totalScore += score;
  }

  // Determine bucket
  let bucket = null;
  for (const band of cfg.bands) {
    if (totalScore >= band.min && totalScore <= band.max) {
      bucket = band.bucket;
      break;
    }
  }

  return {
    score: totalScore,
    bucket,
    rubric: {
      totalScore,
      scoredQuestions,
      bands: cfg.bands
    }
  };
}

/**
 * Score using three pillar approach
 */
function scoreThreePillar(cfg: ThreePillarConfig, answers: Record<string, any>): ScoringResult {
  const capacity = calculatePillarScore(cfg.pillars.capacity, answers);
  const tolerance = calculatePillarScore(cfg.pillars.tolerance, answers);
  const need = calculatePillarScore(cfg.pillars.need, answers);

  // Calculate final score using min(capacity, tolerance)
  const finalScore = Math.min(capacity, tolerance);

  // Determine bucket
  let bucket = null;
  for (const band of cfg.decision.bucket_bands) {
    if (finalScore >= band.min && finalScore <= band.max) {
      bucket = band.bucket;
      break;
    }
  }

  // Check for warnings
  const warnings: string[] = [];
  if (cfg.decision.warnings) {
    for (const warning of cfg.decision.warnings) {
      if (warning.if === 'need > capacity + 10' && need > capacity + 10) {
        warnings.push(warning.message);
      }
    }
  }

  return {
    score: finalScore,
    bucket,
    rubric: {
      capacity,
      tolerance,
      need,
      finalScore,
      warnings,
      bucket_bands: cfg.decision.bucket_bands
    }
  };
}

/**
 * Calculate score for a single pillar (capacity, tolerance, or need)
 */
function calculatePillarScore(pillar: { inputs: any[]; weights: Record<string, number> }, answers: Record<string, any>): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const input of pillar.inputs) {
    const answer = answers[input.qkey];
    if (answer === undefined || answer === null) {
      continue;
    }

    let score = 0;
    
    if (input.map && input.map[answer] !== undefined) {
      // Direct mapping
      score = input.map[answer];
    } else if (input.type === 'multiple' && input.transform === 'score_goals_complexity') {
      // Score multiple investment goals based on complexity
      score = scoreGoalsComplexity(answer);
    } else if (input.type === 'text' && input.transform === 'parse_amount') {
      // Parse amount from text and score based on amount ranges
      score = parseAndScoreAmount(answer);
    } else if (input.type === 'percent') {
      // Percentage transformation
      const numValue = parseFloat(answer);
      if (!isNaN(numValue)) {
        if (input.transform === '100 - value') {
          score = 100 - numValue;
        } else {
          score = numValue;
        }
      }
    } else if (input.type === 'scale' && input.scale && input.scores) {
      // Scale-based scoring
      const numValue = parseFloat(answer);
      if (!isNaN(numValue)) {
        const scaleIndex = input.scale.findIndex((s: number) => numValue <= s);
        if (scaleIndex >= 0 && input.scores[scaleIndex] !== undefined) {
          score = input.scores[scaleIndex];
        }
      }
    }

    const weight = pillar.weights[input.qkey] || 1;
    totalScore += score * weight;
    totalWeight += weight;
  }

  // Return weighted average, or 0 if no weights
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Score investment goals based on complexity
 */
function scoreGoalsComplexity(goals: string[]): number {
  if (!goals || !Array.isArray(goals) || goals.length === 0) {
    return 0;
  }

  // Define goal complexity scores
  const goalScores: Record<string, number> = {
    'buying_home': 60,
    'children_education': 70,
    'retirement_planning': 80,
    'investment_growth': 90,
    'debt_repayment': 40,
    'starting_business': 95,
    'marriage': 50,
    'travel_leisure': 30,
    'supporting_parents': 60,
    'saving_down_payment': 50,
    'health_wellness': 70,
    'emergency_fund': 20
  };

  // Calculate average complexity score
  const totalScore = goals.reduce((sum, goal) => sum + (goalScores[goal] || 50), 0);
  return totalScore / goals.length;
}

/**
 * Parse amount from text and score based on amount ranges
 */
function parseAndScoreAmount(amountText: string): number {
  if (!amountText || typeof amountText !== 'string') {
    return 0;
  }

  // Extract numeric value from text
  const numericMatch = amountText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (!numericMatch) {
    return 0;
  }

  const amount = parseFloat(numericMatch[1].replace(/,/g, ''));
  
  // Score based on amount ranges (in INR)
  if (amount >= 1000000) return 90; // 10L+
  if (amount >= 500000) return 80;  // 5L+
  if (amount >= 100000) return 70;  // 1L+
  if (amount >= 50000) return 60;   // 50K+
  if (amount >= 25000) return 50;   // 25K+
  if (amount >= 10000) return 40;   // 10K+
  if (amount >= 5000) return 30;    // 5K+
  if (amount >= 1000) return 20;    // 1K+
  return 10; // Less than 1K
}

/**
 * Get CFA framework configuration
 */
export async function getCFAFrameworkConfig(): Promise<FrameworkConfig | null> {
  try {
    const { data, error } = await supabase
      .from('risk_frameworks')
      .select('config')
      .eq('code', 'cfa_three_pillar_v1')
      .single();

    if (error || !data) {
      console.error('Error fetching CFA framework config:', error);
      return null;
    }

    return data.config as FrameworkConfig;
  } catch (error) {
    console.error('Error fetching CFA framework config:', error);
    return null;
  }
}

/**
 * Get framework configuration by ID (backward compatibility)
 */
export async function getFrameworkConfig(frameworkVersionId: string): Promise<FrameworkConfig | null> {
  // For now, always return CFA framework config
  return getCFAFrameworkConfig();
}

/**
 * Get question details by qkey
 */
export async function getQuestionDetails(qkey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .select('*')
      .eq('qkey', qkey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Error fetching question details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching question details:', error);
    return null;
  }
}

/**
 * Get CFA framework questions
 */
export async function getCFAFrameworkQuestions(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('framework_questions')
      .select('*')
      .eq('framework_id', (await supabase
        .from('risk_frameworks')
        .select('id')
        .eq('code', 'cfa_three_pillar_v1')
        .single()).data?.id)
      .order('order_index');

    if (error) {
      console.error('Error fetching CFA framework questions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching CFA framework questions:', error);
    return [];
  }
}
