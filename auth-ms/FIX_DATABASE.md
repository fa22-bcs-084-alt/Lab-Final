# 🛠️ Fix Fitbit Database Error

## ❌ **The Problem**

You're getting this error:
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

This happens because the `fitbit_tokens` table doesn't have a **UNIQUE constraint** on `user_id`.

---

## ✅ **The Solution**

### **Option 1: Drop and Recreate Table (Recommended if no data)**

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Drop the old table
DROP TABLE IF EXISTS fitbit_tokens CASCADE;
DROP TABLE IF EXISTS fitbit_activity_data CASCADE;

-- Create new table with correct constraints
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
```

---

### **Option 2: Add Constraint to Existing Table (If you have data)**

```sql
-- Add unique constraint to existing table
ALTER TABLE fitbit_tokens 
ADD CONSTRAINT fitbit_tokens_user_id_key UNIQUE (user_id);

ALTER TABLE fitbit_tokens 
ADD CONSTRAINT fitbit_tokens_fitbit_user_id_key UNIQUE (fitbit_user_id);
```

---

## 🔄 **After Running SQL**

1. ✅ Restart your backend server
2. ✅ Try connecting Fitbit again
3. ✅ Should work now!

---

## 📋 **What Changed**

**Before:**
```sql
fitbit_user_id VARCHAR(255) UNIQUE NOT NULL
```

**After:**
```sql
fitbit_user_id VARCHAR(255) NOT NULL,
...
UNIQUE(user_id),           -- ✅ Added this
UNIQUE(fitbit_user_id)     -- ✅ Explicit constraint
```

The `UNIQUE(user_id)` constraint allows the `.upsert({ onConflict: 'user_id' })` to work properly.

---

## 🚨 **User Not Found Error**

If you see:
```
❌ User not found in database: someuser@example.com
?error=user_not_found&message=Please signup first
```

This means the user **doesn't exist in your `users` table**. They need to:
1. ✅ Sign up for your app first
2. ✅ Then connect Fitbit

**The frontend should check:**
- User is logged in ✅
- User email matches database email ✅

---

**That's it!** Run the SQL and try again. 🎉
