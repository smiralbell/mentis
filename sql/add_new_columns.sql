-- Add new columns to organizations table
-- Run this if you already created the organizations table before adding these fields

-- Add approximate student count column
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS approx_student_count INTEGER;

-- Add admin code column
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_code VARCHAR(100);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('approx_student_count', 'admin_code');




