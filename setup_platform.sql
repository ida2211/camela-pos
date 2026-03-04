-- Setup Platform Fields for Sales Table
-- Run this in Supabase Dashboard SQL Editor

-- Step 1: Add platform and platform_fee columns
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'regular' CHECK (platform IN ('regular', 'tiktok', 'shopee')),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(15,2) DEFAULT 0.00;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform);

-- Step 3: Update existing records to have 'regular' as default platform
UPDATE sales 
SET platform = 'regular' 
WHERE platform IS NULL;

-- Step 4: Verify the setup
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('platform', 'platform_fee');
