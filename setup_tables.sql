-- Step 1: Create Tables
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

CREATE TABLE IF NOT EXISTS savings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  balance_after DECIMAL(15,2) NOT NULL,
  note TEXT
);

-- Step 2: Create Indexes
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_person_name ON debts(person_name);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
CREATE INDEX IF NOT EXISTS idx_savings_type ON savings(type);
CREATE INDEX IF NOT EXISTS idx_savings_created_at ON savings(created_at);

-- Step 3: Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
