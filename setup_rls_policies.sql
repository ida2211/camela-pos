-- Step 4: Create RLS Policies for Debts
CREATE POLICY "Users can view all debts" ON debts FOR SELECT USING (true);
CREATE POLICY "Users can insert debts" ON debts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update debts" ON debts FOR UPDATE USING (true);
CREATE POLICY "Users can delete debts" ON debts FOR DELETE USING (true);

-- Step 5: Create RLS Policies for Savings
CREATE POLICY "Users can view all savings" ON savings FOR SELECT USING (true);
CREATE POLICY "Users can insert savings" ON savings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update savings" ON savings FOR UPDATE USING (true);
CREATE POLICY "Users can delete savings" ON savings FOR DELETE USING (true);

-- Step 6: Grant Permissions
GRANT ALL ON debts TO authenticated;
GRANT ALL ON savings TO authenticated;
GRANT SELECT ON debts TO anon;
GRANT SELECT ON savings TO anon;
