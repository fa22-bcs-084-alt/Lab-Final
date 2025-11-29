# Frontend Integration Guide: Fitbit OAuth

## Overview
This guide explains how to integrate Fitbit OAuth authentication in your frontend application, similar to the existing Google OAuth implementation.

---

## 🔧 Prerequisites

1. **Backend Setup Complete**: Ensure the backend Fitbit integration is deployed and running on port 4001
2. **Fitbit Developer Account**: You need to register your app at https://dev.fitbit.com/apps
3. **Environment Variables**: Update your `.env` file with Fitbit credentials

---

## 📋 Step 1: Register Your Fitbit App

1. Go to https://dev.fitbit.com/apps/new
2. Fill in the application details:
   - **Application Name**: Hygieia Health Platform
   - **Description**: Health and fitness tracking application
   - **Application Website**: http://localhost:3000 (or your production URL)
   - **Organization**: Your organization name
   - **OAuth 2.0 Application Type**: `Server`
   - **Callback URL**: `http://localhost:4001/auth/fitbit/callback`
   - **Default Access Type**: `Read-Only` or `Read & Write` (depending on your needs)

3. After registration, you'll receive:
   - **OAuth 2.0 Client ID**
   - **Client Secret**

4. Add these to your backend `.env` file:
   ```env
   FITBIT_CLIENT_ID=your_actual_client_id_here
   FITBIT_CLIENT_SECRET=your_actual_client_secret_here
   FITBIT_CALLBACK_URL=http://localhost:4001/auth/fitbit/callback
   ```

---

## 🗄️ Step 2: Create Supabase Tables

Go to your Supabase Dashboard → SQL Editor and run the SQL from `SUPABASE_FITBIT_TABLE.sql`:

```sql
-- This creates two tables:
-- 1. fitbit_tokens: Stores OAuth tokens
-- 2. fitbit_activity_data: Stores fetched health data
```

---

## 💻 Step 3: Frontend Implementation

### Option A: React/Next.js Implementation

#### 1. Create a Fitbit Connect Button Component

```tsx
// components/FitbitConnectButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FitbitConnectButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleFitbitConnect = () => {
    setLoading(true)
    
    // Get user's JWT token from localStorage/cookies
    const token = localStorage.getItem('authToken')
    
    if (!token) {
      alert('Please login first')
      router.push('/login')
      return
    }

    // Redirect to backend Fitbit OAuth endpoint with state parameter
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
    window.location.href = `${backendUrl}/auth/fitbit?state=${token}`
  }

  return (
    <button
      onClick={handleFitbitConnect}
      disabled={loading}
      className="flex items-center gap-2 px-6 py-3 bg-[#00B0B9] text-white rounded-lg hover:bg-[#009DA5] transition-colors disabled:opacity-50"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <FitbitIcon />
          <span>Connect with Fitbit</span>
        </>
      )}
    </button>
  )
}

// Fitbit Icon Component
function FitbitIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 18c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3-3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-9-3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-15-3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/>
    </svg>
  )
}
```

#### 2. Add Button to Dashboard

```tsx
// app/patient/dashboard/page.tsx
import FitbitConnectButton from '@/components/FitbitConnectButton'
import GoogleConnectButton from '@/components/GoogleConnectButton'

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Connect Your Health Accounts</h1>
      
      <div className="space-y-4">
        {/* Existing Google OAuth */}
        <GoogleConnectButton />
        
        {/* New Fitbit OAuth */}
        <FitbitConnectButton />
      </div>
    </div>
  )
}
```

#### 3. Handle OAuth Callback

Update your dashboard page to handle the callback:

```tsx
// app/patient/dashboard/page.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function Dashboard() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const fitbitStatus = searchParams.get('fitbit')
    
    if (fitbitStatus === 'connected') {
      // Show success message
      alert('Fitbit connected successfully! Your data will be synced automatically.')
      
      // Remove query parameter
      window.history.replaceState({}, '', '/patient/dashboard')
    }
  }, [searchParams])

  return (
    // ... your dashboard UI
  )
}
```

---

### Option B: Vanilla JavaScript Implementation

```html
<!-- dashboard.html -->
<button id="fitbit-btn" class="btn-fitbit">
  <img src="/icons/fitbit.svg" alt="Fitbit" />
  Connect with Fitbit
</button>

<script>
  document.getElementById('fitbit-btn').addEventListener('click', () => {
    const token = localStorage.getItem('authToken')
    
    if (!token) {
      alert('Please login first')
      window.location.href = '/login'
      return
    }

    // Redirect to Fitbit OAuth
    const backendUrl = 'http://localhost:4001'
    window.location.href = `${backendUrl}/auth/fitbit?state=${token}`
  })

  // Handle callback
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('fitbit') === 'connected') {
    alert('Fitbit connected successfully!')
    window.history.replaceState({}, '', '/dashboard')
  }
</script>
```

---

## 🔄 Step 4: Backend OAuth Flow Explanation

Here's what happens when user clicks "Connect with Fitbit":

1. **Frontend** → Redirects to `http://localhost:4001/auth/fitbit?state={jwt_token}`
2. **Backend** → Redirects to Fitbit authorization page
3. **User** → Authorizes the app on Fitbit
4. **Fitbit** → Redirects back to `http://localhost:4001/auth/fitbit/callback?code=...`
5. **Backend** → Exchanges code for access/refresh tokens
6. **Backend** → Saves tokens to Supabase `fitbit_tokens` table
7. **Backend** → Redirects to `http://localhost:3000/patient/dashboard?fitbit=connected`
8. **Frontend** → Shows success message

---

## 📊 Step 5: Automatic Data Sync

The backend automatically fetches Fitbit data every 30 minutes for all connected users using a cron job. The data includes:

- **Steps**: Daily step count
- **Calories**: Calories burned
- **Distance**: Distance traveled
- **Active Minutes**: Fairly + very active minutes
- **Heart Rate**: Heart rate zones and resting heart rate
- **Sleep**: Sleep duration and quality

Data is stored in the `fitbit_activity_data` table in Supabase.

---

## 🧪 Step 6: Testing

1. **Start Backend**:
   ```bash
   cd auth-ms
   npm run start:dev
   ```

2. **Start Frontend**:
   ```bash
   npm run dev
   ```

3. **Test Flow**:
   - Login to your app
   - Click "Connect with Fitbit"
   - Authorize on Fitbit
   - Verify redirect back to dashboard
   - Check Supabase for saved tokens

4. **Check Cron Job**:
   - Wait for 30 minutes OR
   - Manually trigger by calling the scheduler service
   - Check console logs for fetched data

---

## 🎨 Styling Examples

### Tailwind CSS Button
```tsx
<button className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#00B0B9] to-[#00D4DD] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
  <FitbitIcon />
  Connect Fitbit
</button>
```

### CSS Modules
```css
.fitbitButton {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #00B0B9 0%, #00D4DD 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.fitbitButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 176, 185, 0.3);
}
```

---

## 📱 Step 7: Display Fitbit Data (Optional)

Create a component to display synced Fitbit data:

```tsx
// components/FitbitDashboard.tsx
'use client'

import { useEffect, useState } from 'react'

export default function FitbitDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFitbitData()
  }, [])

  const fetchFitbitData = async () => {
    try {
      // Call your API endpoint to get Fitbit data
      const response = await fetch(`/api/fitbit/data?userId=${userId}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch Fitbit data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading Fitbit data...</div>
  if (!data) return <div>No Fitbit data available</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Steps" value={data.steps} icon="👟" />
      <StatCard title="Calories" value={data.calories_burned} icon="🔥" />
      <StatCard title="Distance" value={`${data.distance} km`} icon="📍" />
      <StatCard title="Active Minutes" value={data.active_minutes} icon="⏱️" />
    </div>
  )
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
    </div>
  )
}
```

---

## 🚨 Troubleshooting

### Issue: "Invalid authentication" error
**Solution**: Ensure JWT token is being passed correctly in the state parameter

### Issue: Callback URL mismatch
**Solution**: Verify callback URL in Fitbit app settings matches your backend URL exactly

### Issue: No data fetched
**Solution**: Check Supabase tables and backend logs for errors

### Issue: Cron job not running
**Solution**: Ensure ScheduleModule is imported in app.module.ts

---

## 🔒 Security Notes

- Never expose Fitbit Client Secret in frontend code
- Always validate JWT tokens on backend before saving Fitbit tokens
- Use HTTPS in production
- Implement rate limiting on OAuth endpoints
- Store tokens securely in Supabase with proper RLS policies

---

## 📚 Additional Resources

- [Fitbit OAuth 2.0 Documentation](https://dev.fitbit.com/build/reference/web-api/oauth2/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [NestJS Schedule Module](https://docs.nestjs.com/techniques/task-scheduling)

---

## ✅ Checklist

- [ ] Register Fitbit app and get credentials
- [ ] Update backend `.env` with Fitbit credentials
- [ ] Create Supabase tables using provided SQL
- [ ] Implement frontend button component
- [ ] Test OAuth flow end-to-end
- [ ] Verify data is being fetched every 30 minutes
- [ ] Check Supabase tables for stored data
- [ ] (Optional) Display Fitbit data in dashboard

---

## 🎯 Summary

Your frontend developer needs to:

1. Add a "Connect with Fitbit" button
2. On click, redirect to `http://localhost:4001/auth/fitbit?state=${jwt_token}`
3. Handle callback at dashboard with `?fitbit=connected` parameter
4. Show success message to user
5. (Optional) Display synced Fitbit data

That's it! The backend handles everything else automatically. 🎉
