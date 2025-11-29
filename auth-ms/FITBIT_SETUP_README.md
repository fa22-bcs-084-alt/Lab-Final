# Fitbit Integration - Backend Setup Complete ✅

## 📁 Files Created/Modified

### New Files:
1. **`src/auth/fitbit.strategy.ts`** - Passport strategy for Fitbit OAuth
2. **`src/fitbit/fitbit.service.ts`** - Service for Fitbit API calls and token management
3. **`src/fitbit/fitbit.module.ts`** - Fitbit module configuration
4. **`src/fitbit/fitbit.scheduler.ts`** - Cron job for automatic data fetching every 30 minutes
5. **`SUPABASE_FITBIT_TABLE.sql`** - SQL script for creating Supabase tables
6. **`FRONTEND_FITBIT_INTEGRATION_GUIDE.md`** - Complete guide for frontend developer

### Modified Files:
1. **`src/auth/auth.service.ts`** - Added Fitbit OAuth callback handler
2. **`src/auth/auth.controller.ts`** - Added `/fitbit` and `/fitbit/callback` routes
3. **`src/auth/auth.module.ts`** - Registered FitbitStrategy and FitbitModule
4. **`src/app.module.ts`** - Added ScheduleModule and FitbitModule
5. **`.env`** - Added Fitbit environment variables
6. **`package.json`** - Added dependencies (passport-fitbit-oauth2, @nestjs/schedule, axios)

---

## 🚀 Setup Instructions

### 1. Install Dependencies (Already Done)
```bash
npm install
```

### 2. Register Fitbit Application
1. Go to https://dev.fitbit.com/apps/new
2. Create a new application with these settings:
   - **Callback URL**: `http://localhost:4001/auth/fitbit/callback`
   - **OAuth 2.0 Application Type**: Server
   - **Default Access Type**: Read & Write

3. Copy the credentials and update `.env`:
   ```env
   FITBIT_CLIENT_ID=your_actual_fitbit_client_id
   FITBIT_CLIENT_SECRET=your_actual_fitbit_client_secret
   FITBIT_CALLBACK_URL=http://localhost:4001/auth/fitbit/callback
   ```

### 3. Create Supabase Tables
1. Open Supabase Dashboard → SQL Editor
2. Run the SQL from `SUPABASE_FITBIT_TABLE.sql`
3. This creates:
   - `fitbit_tokens` - Stores OAuth tokens
   - `fitbit_activity_data` - Stores fetched health data

### 4. Start the Server
```bash
npm run start:dev
```

---

## 🔄 How It Works

### OAuth Flow:
1. User clicks "Connect with Fitbit" on frontend
2. Frontend redirects to: `http://localhost:4001/auth/fitbit?state={jwt_token}`
3. Backend redirects to Fitbit authorization page
4. User authorizes the app
5. Fitbit redirects to: `http://localhost:4001/auth/fitbit/callback?code=...`
6. Backend exchanges code for access/refresh tokens
7. Tokens saved to `fitbit_tokens` table
8. Backend redirects to: `http://localhost:3000/patient/dashboard?fitbit=connected`

### Automatic Data Fetching:
- **Cron Job**: Runs every 30 minutes (at 0 and 30 minutes past each hour)
- **Process**: Fetches data for ALL users with Fitbit tokens
- **Data Collected**:
  - Daily steps
  - Calories burned
  - Distance traveled
  - Active minutes
  - Heart rate zones
  - Sleep data
- **Storage**: Saved to `fitbit_activity_data` table
- **Console Output**: Prints fetched data for each user

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/fitbit` | Initiates Fitbit OAuth flow |
| GET | `/auth/fitbit/callback` | Handles Fitbit OAuth callback |

---

## 🗄️ Database Tables

### `fitbit_tokens`
Stores OAuth tokens for each user:
- `user_id` - Reference to users table
- `fitbit_user_id` - Fitbit user ID
- `access_token` - OAuth access token
- `refresh_token` - OAuth refresh token
- `expires_at` - Token expiration timestamp

### `fitbit_activity_data`
Stores daily health data:
- `user_id` - Reference to users table
- `date` - Data date
- `steps` - Daily steps
- `calories_burned` - Calories burned
- `distance` - Distance traveled
- `active_minutes` - Active minutes
- `heart_rate_zones` - Heart rate data (JSON)
- `sleep_data` - Sleep data (JSON)
- `raw_data` - Complete raw response (JSON)

---

## 🧪 Testing

### 1. Test OAuth Flow:
```bash
# Start server
npm run start:dev

# In browser, navigate to:
http://localhost:4001/auth/fitbit?state=YOUR_JWT_TOKEN
```

### 2. Check Logs:
```bash
# Look for cron job logs every 30 minutes:
🔄 Starting scheduled Fitbit data fetch for all users...
📊 Found X users with Fitbit tokens
⏳ Fetching data for user abc-123...
✅ Successfully fetched Fitbit data for user abc-123
📊 User abc-123 Data: { steps: 8543, calories: 2156, ... }
```

### 3. Verify Database:
Check Supabase tables:
- `fitbit_tokens` - Should have token entry
- `fitbit_activity_data` - Should have daily data

---

## 📝 Frontend Integration

Send the file **`FRONTEND_FITBIT_INTEGRATION_GUIDE.md`** to your frontend developer.

It contains:
- ✅ Complete setup instructions
- ✅ React/Next.js code examples
- ✅ Vanilla JavaScript examples
- ✅ Button styling examples
- ✅ OAuth flow explanation
- ✅ Troubleshooting guide

### Quick Frontend Implementation:
```tsx
// Button Component
<button onClick={() => {
  const token = localStorage.getItem('authToken')
  window.location.href = `http://localhost:4001/auth/fitbit?state=${token}`
}}>
  Connect with Fitbit
</button>

// Handle Callback
if (searchParams.get('fitbit') === 'connected') {
  alert('Fitbit connected successfully!')
}
```

---

## 🔒 Security Notes

- ✅ Tokens stored securely in Supabase
- ✅ JWT validation on callback
- ✅ Automatic token refresh before expiration
- ✅ Scoped access (only requested permissions)
- ⚠️ **Update Fitbit credentials in `.env` before deploying**
- ⚠️ **Use HTTPS in production**

---

## 📦 Dependencies Added

```json
{
  "passport-fitbit-oauth2": "^1.1.0",
  "@nestjs/schedule": "^4.x.x",
  "node-cron": "^3.x.x",
  "axios": "^1.x.x"
}
```

---

## 🎯 Next Steps

1. **Backend**:
   - [ ] Register Fitbit app and get credentials
   - [ ] Update `.env` with Fitbit credentials
   - [ ] Run SQL script in Supabase
   - [ ] Test OAuth flow
   - [ ] Monitor cron job logs

2. **Frontend**:
   - [ ] Share `FRONTEND_FITBIT_INTEGRATION_GUIDE.md` with frontend developer
   - [ ] Implement "Connect with Fitbit" button
   - [ ] Test OAuth flow end-to-end
   - [ ] Display Fitbit data (optional)

---

## 🐛 Troubleshooting

### Tokens not saving:
- Check Supabase table was created correctly
- Verify JWT token is valid
- Check backend logs for errors

### Cron job not running:
- Ensure ScheduleModule is imported in `app.module.ts` ✅
- Check server logs for cron execution
- Verify users exist in `fitbit_tokens` table

### OAuth redirect fails:
- Verify callback URL matches Fitbit app settings exactly
- Check FITBIT_CALLBACK_URL in `.env`
- Ensure port 4001 is accessible

---

## 📞 Support

For issues or questions:
1. Check backend logs: `npm run start:dev`
2. Verify Supabase tables are created
3. Test with Postman/browser
4. Review `FRONTEND_FITBIT_INTEGRATION_GUIDE.md`

---

## ✨ Features

- ✅ Fitbit OAuth 2.0 integration
- ✅ Automatic token refresh
- ✅ Cron job fetches data every 30 minutes
- ✅ Stores activity, heart rate, and sleep data
- ✅ Supports multiple users
- ✅ Error handling and logging
- ✅ Frontend integration guide included

---

**Setup Complete! 🎉**
