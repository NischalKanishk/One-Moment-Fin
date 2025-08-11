export interface ScoringConfig {
  weights: Record<string, number | Record<string, number>>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface ScoringResult {
  score: number;
  risk_category: 'low' | 'medium' | 'high';
  breakdown?: Record<string, number>;
}

/**
 * Calculate risk score based on answers and scoring configuration
 */
export function calculateRiskScore(
  answers: Record<string, any>, 
  scoring: ScoringConfig
): ScoringResult {
  let totalScore = 0;
  const breakdown: Record<string, number> = {};

  // Calculate weighted score for each field
  for (const [field, weight] of Object.entries(scoring.weights)) {
    const answer = answers[field];
    if (answer === undefined || answer === null || answer === '') {
      continue;
    }

    let fieldScore = 0;

    if (typeof weight === 'number') {
      // Simple numeric weight
      if (typeof answer === 'number') {
        fieldScore = answer * weight;
      } else if (typeof answer === 'string' && !isNaN(Number(answer))) {
        fieldScore = Number(answer) * weight;
      }
    } else if (typeof weight === 'object') {
      // Lookup table for categorical values
      fieldScore = weight[answer] || 0;
    }

    breakdown[field] = fieldScore;
    totalScore += fieldScore;
  }

  // Determine risk category based on thresholds
  let risk_category: 'low' | 'medium' | 'high';
  if (totalScore <= scoring.thresholds.low) {
    risk_category = 'low';
  } else if (totalScore <= scoring.thresholds.medium) {
    risk_category = 'medium';
  } else {
    risk_category = 'high';
  }

  return {
    score: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
    risk_category,
    breakdown
  };
}

/**
 * Get default scoring configuration
 */
export function getDefaultScoring(): ScoringConfig {
  return {
    weights: {
      volatilityTolerance: 10,
      horizon: {
        '<1y': 0,
        '1-3y': 5,
        '3-5y': 8,
        '>5y': 10
      }
    },
    thresholds: {
      low: 0,
      medium: 12,
      high: 18
    }
  };
}

/**
 * Validate scoring configuration
 */
export function validateScoringConfig(scoring: any): scoring is ScoringConfig {
  if (!scoring || typeof scoring !== 'object') {
    return false;
  }

  if (!scoring.weights || typeof scoring.weights !== 'object') {
    return false;
  }

  if (!scoring.thresholds || typeof scoring.thresholds !== 'object') {
    return false;
  }

  const { thresholds } = scoring;
  if (typeof thresholds.low !== 'number' || 
      typeof thresholds.medium !== 'number' || 
      typeof thresholds.high !== 'number') {
    return false;
  }

  // Ensure thresholds are in ascending order
  if (thresholds.low >= thresholds.medium || thresholds.medium >= thresholds.high) {
    return false;
  }

  return true;
}

/**
 * Convert legacy question-based scoring to new format
 */
export function convertLegacyScoring(questions: Array<{ weight: number }>): ScoringConfig {
  const totalWeight = questions.reduce((sum, q) => sum + (q.weight || 1), 0);
  const maxScore = totalWeight * 5; // Assuming 1-5 scale
  
  return {
    weights: questions.reduce((acc, q, index) => {
      acc[`question_${index + 1}`] = q.weight || 1;
      return acc;
    }, {} as Record<string, number>),
    thresholds: {
      low: maxScore * 0.33,
      medium: maxScore * 0.66,
      high: maxScore
    }
  };
}
