-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define an ENUM type for fixed Expense Types
CREATE TYPE expense_type AS ENUM ('Need', 'Want', 'Investment');

-- Table for storing user-defined categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (user_id, name)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own categories" ON categories
    FOR ALL
    USING (auth.uid() = user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Table for storing user-defined payment methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (user_id, name)
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own payment methods" ON payment_methods
    FOR ALL
    USING (auth.uid() = user_id);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- Table for storing the actual expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE RESTRICT NOT NULL,
    notes TEXT,
    type expense_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own expenses" ON expenses
    FOR ALL
    USING (auth.uid() = user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_timestamp ON expenses(timestamp);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_payment_method_id ON expenses(payment_method_id);
CREATE INDEX idx_expenses_type ON expenses(type);

-- Trigger function to auto-update 'updated_at'
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_categories
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_payment_methods
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_expenses
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
