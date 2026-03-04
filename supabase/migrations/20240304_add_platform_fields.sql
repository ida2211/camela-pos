-- Add platform and platform_fee fields to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'regular' CHECK (platform IN ('regular', 'tiktok', 'shopee')),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(15,2) DEFAULT 0.00;

-- Create index for platform field
CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform);
