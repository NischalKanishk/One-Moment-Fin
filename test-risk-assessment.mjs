#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CFA Three Pillar Scoring Logic
function calculateCFAThreePillar(answers) {
  console.log('🔍 Calculating CFA Three Pillar Risk Assessment...\n');
  
  // CAPACITY CALCULATION (40% weight)
  console.log('📊 CAPACITY CALCULATION:');
  
  // Age scoring
  const ageScores = {
    '<25': 85, '25-35': 75, '36-50': 60, '51+': 40
  };
  const ageScore = ageScores[answers.age] || 0;
  console.log(`   Age (${answers.age}): ${ageScore} points`);
  
  // EMI Ratio scoring (100 - value)
  const emiScore = answers.emi_ratio ? (100 - parseInt(answers.emi_ratio)) : 0;
  console.log(`   EMI Ratio (${answers.emi_ratio}%): ${emiScore} points (100 - ${answers.emi_ratio})`);
  
  // Liquidity Withdrawal scoring (100 - value)
  const liquidityScore = answers.liquidity_withdrawal_2y ? (100 - parseInt(answers.liquidity_withdrawal_2y)) : 0;
  console.log(`   Liquidity Withdrawal (${answers.liquidity_withdrawal_2y}%): ${liquidityScore} points (100 - ${answers.liquidity_withdrawal_2y})`);
  
  // Income Security scoring
  const incomeScores = {
    'Very secure': 90, 'Fairly secure': 70, 'Somewhat secure': 50, 'Not secure': 25
  };
  const incomeScore = incomeScores[answers.income_security] || 0;
  console.log(`   Income Security (${answers.income_security}): ${incomeScore} points`);
  
  // Calculate weighted capacity
  const capacity = (ageScore * 0.25) + (emiScore * 0.25) + (liquidityScore * 0.3) + (incomeScore * 0.2);
  console.log(`   📈 CAPACITY SCORE: ${capacity.toFixed(1)} points\n`);
  
  // TOLERANCE CALCULATION (35% weight)
  console.log('🎯 TOLERANCE CALCULATION:');
  
  // Market Knowledge scoring
  const knowledgeScores = {
    'High': 60, 'Medium': 40, 'Low': 20
  };
  const knowledgeScore = knowledgeScores[answers.market_knowledge] || 0;
  console.log(`   Market Knowledge (${answers.market_knowledge}): ${knowledgeScore} points`);
  
  // Drawdown Reaction scoring
  const drawdownScores = {
    'Buy more': 85, 'Do nothing': 60, 'Sell': 20
  };
  const drawdownScore = drawdownScores[answers.drawdown_reaction] || 0;
  console.log(`   Drawdown Reaction (${answers.drawdown_reaction}): ${drawdownScore} points`);
  
  // Gain/Loss Tradeoff scoring
  const tradeoffScores = {
    'Loss25Gain50': 85, 'Loss8Gain22': 60, 'NoLossEvenIfLowGain': 20
  };
  const tradeoffScore = tradeoffScores[answers.gain_loss_tradeoff] || 0;
  console.log(`   Gain/Loss Tradeoff (${answers.gain_loss_tradeoff}): ${tradeoffScore} points`);
  
  // Calculate weighted tolerance
  const tolerance = (knowledgeScore * 0.2) + (drawdownScore * 0.45) + (tradeoffScore * 0.35);
  console.log(`   📈 TOLERANCE SCORE: ${tolerance.toFixed(1)} points\n`);
  
  // NEED CALCULATION (25% weight)
  console.log('💰 NEED CALCULATION:');
  
  // Goal Required Return scoring
  const returnScores = {
    '0': 10, '4': 30, '6': 45, '8': 60, '10': 75, '12': 85, '15': 95
  };
  const returnScore = returnScores[answers.goal_required_return] || 0;
  console.log(`   Goal Required Return (${answers.goal_required_return}%): ${returnScore} points`);
  
  const need = returnScore;
  console.log(`   📈 NEED SCORE: ${need.toFixed(1)} points\n`);
  
  // FINAL DECISION
  console.log('🎯 FINAL DECISION:');
  const decision = Math.min(capacity, tolerance);
  console.log(`   Decision = min(capacity, tolerance) = min(${capacity.toFixed(1)}, ${tolerance.toFixed(1)}) = ${decision.toFixed(1)}`);
  
  // Risk Bucket
  let bucket = '';
  if (decision <= 35) bucket = 'Conservative';
  else if (decision <= 55) bucket = 'Moderate';
  else if (decision <= 75) bucket = 'Growth';
  else bucket = 'Aggressive';
  
  console.log(`   🏷️ RISK BUCKET: ${bucket} (${decision.toFixed(1)} points)`);
  
  // Warnings
  if (need > capacity + 10) {
    console.log(`   ⚠️ WARNING: Required return (${need}) exceeds risk capacity (${capacity.toFixed(1)}) + 10`);
    console.log(`      Recommendation: Revisit goals/savings.`);
  }
  
  return {
    capacity: Math.round(capacity),
    tolerance: Math.round(tolerance),
    need: Math.round(need),
    decision: Math.round(decision),
    bucket: bucket,
    warnings: need > capacity + 10 ? ['Required return exceeds risk capacity; revisit goals/savings.'] : []
  };
}

// Test Scenarios
const testScenarios = [
  {
    name: "Young Conservative",
    answers: {
      age: '<25',
      emi_ratio: '20',
      liquidity_withdrawal_2y: '10',
      income_security: 'Very secure',
      market_knowledge: 'Low',
      drawdown_reaction: 'Sell',
      gain_loss_tradeoff: 'NoLossEvenIfLowGain',
      goal_required_return: '4'
    }
  },
  {
    name: "Middle-aged Growth",
    answers: {
      age: '36-50',
      emi_ratio: '30',
      liquidity_withdrawal_2y: '20',
      income_security: 'Fairly secure',
      market_knowledge: 'Medium',
      drawdown_reaction: 'Do nothing',
      gain_loss_tradeoff: 'Loss8Gain22',
      goal_required_return: '8'
    }
  },
  {
    name: "Aggressive Investor",
    answers: {
      age: '25-35',
      emi_ratio: '15',
      liquidity_withdrawal_2y: '5',
      income_security: 'Very secure',
      market_knowledge: 'High',
      drawdown_reaction: 'Buy more',
      gain_loss_tradeoff: 'Loss25Gain50',
      goal_required_return: '12'
    }
  },
  {
    name: "Retirement Conservative",
    answers: {
      age: '51+',
      emi_ratio: '5',
      liquidity_withdrawal_2y: '30',
      income_security: 'Somewhat secure',
      market_knowledge: 'Medium',
      drawdown_reaction: 'Sell',
      gain_loss_tradeoff: 'NoLossEvenIfLowGain',
      goal_required_return: '6'
    }
  },
  {
    name: "High Need, Low Capacity",
    answers: {
      age: '51+',
      emi_ratio: '40',
      liquidity_withdrawal_2y: '50',
      income_security: 'Not secure',
      market_knowledge: 'Low',
      drawdown_reaction: 'Sell',
      gain_loss_tradeoff: 'NoLossEvenIfLowGain',
      goal_required_return: '15'
    }
  }
];

async function runTests() {
  console.log('🧪 Testing CFA Three Pillar Risk Assessment\n');
  console.log('='.repeat(80));
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 SCENARIO ${i + 1}: ${scenario.name}`);
    console.log('='.repeat(50));
    
    const result = calculateCFAThreePillar(scenario.answers);
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Capacity: ${result.capacity}/100`);
    console.log(`   Tolerance: ${result.tolerance}/100`);
    console.log(`   Need: ${result.need}/100`);
    console.log(`   Decision: ${result.decision}/100`);
    console.log(`   Risk Profile: ${result.bucket}`);
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.join(', ')}`);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n🎉 All test scenarios completed!');
}

runTests().catch(console.error);
