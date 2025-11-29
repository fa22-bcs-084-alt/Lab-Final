====================================
SUPABASE TABLE CREATION INSTRUCTIONS
====================================

Go to your Supabase Dashboard -> SQL Editor and run the following SQL:

-----------------------------------
-- Table 1: fitbit_tokens
-----------------------------------

CREATE TABLE IF NOT EXISTS fitbit_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fitbit_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(fitbit_user_id)
);

CREATE INDEX idx_fitbit_tokens_user_id ON fitbit_tokens(user_id);
CREATE INDEX idx_fitbit_tokens_fitbit_user_id ON fitbit_tokens(fitbit_user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fitbit_tokens_updated_at
BEFORE UPDATE ON fitbit_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE fitbit_tokens IS 'Stores Fitbit OAuth tokens for authenticated users';


-----------------------------------
-- Table 2: fitbit_activity_data
-----------------------------------

CREATE TABLE IF NOT EXISTS fitbit_activity_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER,
  calories_burned INTEGER,
  distance DECIMAL(10, 2),
  active_minutes INTEGER,
  heart_rate_zones JSONB,
  sleep_data JSONB,
  weight DECIMAL(10, 2),
  bmi DECIMAL(10, 2),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_fitbit_activity_user_date ON fitbit_activity_data(user_id, date DESC);

COMMENT ON TABLE fitbit_activity_data IS 'Stores Fitbit activity and health data fetched from API';

====================================
END OF SQL
====================================
