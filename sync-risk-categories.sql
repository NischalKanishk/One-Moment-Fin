-- SQL script to sync existing leads with risk_bucket data to risk_category
-- This ensures all leads with assessment data show the correct risk category in the frontend

-- Update leads that have risk_bucket but are missing risk_category
UPDATE leads 
SET risk_category = 
  CASE 
    WHEN risk_bucket = 'low' THEN 'Conservative'
    WHEN risk_bucket = 'medium' THEN 'Moderate'
    WHEN risk_bucket = 'high' THEN 'Aggressive'
    ELSE 'Not Assessed'
  END
WHERE risk_bucket IS NOT NULL 
  AND (risk_category IS NULL OR risk_category = '');

-- Verify the update
SELECT 
  id,
  full_name,
  risk_bucket,
  risk_category,
  risk_score,
  CASE 
    WHEN risk_bucket = 'low' THEN 'Conservative'
    WHEN risk_bucket = 'medium' THEN 'Moderate'
    WHEN risk_bucket = 'high' THEN 'Aggressive'
    ELSE 'Not Assessed'
  END as expected_risk_category
FROM leads 
WHERE risk_bucket IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Count leads by risk category
SELECT 
  risk_category,
  COUNT(*) as lead_count
FROM leads 
WHERE risk_category IS NOT NULL
GROUP BY risk_category
ORDER BY lead_count DESC;
