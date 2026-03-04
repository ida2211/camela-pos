-- Create Hutang (Debts) Table
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  person_name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
  paid_amount DECIMAL(15,2) DEFAULT 0.00
);

-- Create Tabungan (Savings) Table
CREATE TABLE IF NOT EXISTS savings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  balance_after DECIMAL(15,2) NOT NULL,
  note TEXT
);

-- Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_person_name ON debts(person_name);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
CREATE INDEX IF NOT EXISTS idx_savings_type ON savings(type);
CREATE INDEX IF NOT EXISTS idx_savings_created_at ON savings(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for Debts
CREATE POLICY "Users can view all debts" ON debts FOR SELECT USING (true);
CREATE POLICY "Users can insert debts" ON debts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update debts" ON debts FOR UPDATE WITH CHECK (true);
CREATE POLICY "Users can delete debts" ON debts FOR DELETE WITH CHECK (true);

-- Create RLS Policies for Savings
CREATE POLICY "Users can view all savings" ON savings FOR SELECT USING (true);
CREATE POLICY "Users can insert savings" ON savings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update savings" ON savings FOR UPDATE WITH CHECK (true);
CREATE POLICY "Users can delete savings" ON savings FOR DELETE WITH CHECK (true);

-- Grant permissions
GRANT ALL ON debts TO authenticated;
GRANT ALL ON savings TO authenticated;
GRANT SELECT ON debts TO anon;
GRANT SELECT ON savings TO anon;
