# Frontend Updates for Fitbit Integration

## 🔄 **What Changed**

The Fitbit connection now uses **user email** instead of JWT tokens. This is simpler and keeps your app's authentication separate from Fitbit OAuth.

---

## 📝 **Frontend Implementation**

### **React/Next.js Example**

```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext' // or wherever you store user data

export default function FitbitConnectButton() {
  const { user } = useAuth() // Get logged-in user's email

  const handleFitbitConnect = () => {
    if (!user?.email) {
      alert('Please login first')
      return
    }

    // Redirect to Fitbit OAuth with user's email
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
    window.location.href = `${backendUrl}/auth/fitbit?email=${encodeURIComponent(user.email)}`
  }

  return (
    <button 
      onClick={handleFitbitConnect}
      className="bg-[#00B0B9] text-white px-6 py-3 rounded-lg hover:bg-[#009DA5]"
    >
      🏃 Connect Fitbit
    </button>
  )
}
```

### **Handle Success/Error Redirects**

```tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function Dashboard() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const fitbitStatus = searchParams.get('fitbit')
    const error = searchParams.get('error')
    
    if (fitbitStatus === 'connected') {
      alert('✅ Fitbit connected successfully!')
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (error === 'no_email') {
      alert('❌ Error: Email not provided')
    } else if (error === 'user_not_found') {
      alert('❌ Error: User not found')
    } else if (error === 'fitbit_save_failed') {
      alert('❌ Error: Failed to save Fitbit connection')
    }
    
    if (error) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  return (
    <div>
      <h1>Dashboard</h1>
      <FitbitConnectButton />
    </div>
  )
}
```

---

## 🔧 **Vanilla JavaScript Example**

```html
<button id="fitbit-btn">Connect Fitbit</button>

<script>
  // Get user email from your app's state/localStorage/API
  const userEmail = localStorage.getItem('userEmail') // or from your auth system

  document.getElementById('fitbit-btn').addEventListener('click', () => {
    if (!userEmail) {
      alert('Please login first')
      return
    }

    // Redirect to Fitbit OAuth
    window.location.href = `http://localhost:4001/auth/fitbit?email=${encodeURIComponent(userEmail)}`
  })

  // Handle callback
  const params = new URLSearchParams(window.location.search)
  if (params.get('fitbit') === 'connected') {
    alert('✅ Fitbit connected!')
    window.history.replaceState({}, '', window.location.pathname)
  }
  if (params.get('error')) {
    alert(`❌ Error: ${params.get('error')}`)
    window.history.replaceState({}, '', window.location.pathname)
  }
</script>
```

---

## 🎯 **Key Points**

### **What the Frontend Needs:**
1. ✅ User's **email address** (from your login system)
2. ✅ A button that redirects to: `http://localhost:4001/auth/fitbit?email={user_email}`
3. ✅ Handle redirect back to dashboard with success/error messages

### **URL Format:**
```
http://localhost:4001/auth/fitbit?email=user@example.com
```

### **Success Redirect:**
```
http://localhost:3000/patient/dashboard?fitbit=connected
```

### **Error Redirects:**
- `?error=no_email` - Email not provided
- `?error=user_not_found` - User doesn't exist in database
- `?error=fitbit_save_failed` - Failed to save Fitbit tokens

---

## 🔄 **Complete Flow**

1. **User clicks "Connect Fitbit"** button
2. **Frontend gets user's email** from auth state/context
3. **Frontend redirects** to: `http://localhost:4001/auth/fitbit?email={email}`
4. **Backend verifies** user exists
5. **Backend redirects** to Fitbit authorization page
6. **User authorizes** on Fitbit
7. **Fitbit redirects back** to backend
8. **Backend saves** Fitbit tokens to database
9. **Backend redirects** to: `http://localhost:3000/patient/dashboard?fitbit=connected`
10. **Frontend shows** success message

---

## 💡 **Where to Get User Email**

Depending on your frontend setup:

### **From Context/State:**
```tsx
const { user } = useAuth()
const email = user.email
```

### **From localStorage:**
```js
const email = localStorage.getItem('userEmail')
```

### **From API Call:**
```tsx
const response = await fetch('/api/me')
const user = await response.json()
const email = user.email
```

---

## 🎨 **Styled Button Example**

```tsx
<button 
  onClick={handleFitbitConnect}
  className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#00B0B9] to-[#00D4DD] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 18c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3-3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/>
  </svg>
  Connect Fitbit
</button>
```

---

## ✅ **Testing Checklist**

- [ ] User email is correctly retrieved from auth system
- [ ] Button redirects to correct URL with email parameter
- [ ] User can authorize on Fitbit
- [ ] After authorization, redirected back to dashboard
- [ ] Success message displays correctly
- [ ] Error messages display correctly

---

## 🚨 **Important Notes**

1. ⚠️ **User must be logged in** to your app first
2. ⚠️ **Email must be URL-encoded** using `encodeURIComponent()`
3. ⚠️ Make sure user email matches the one in your database
4. ⚠️ Backend URL should be `http://localhost:4001` (or your production URL)

---

**That's it!** The implementation is now simpler and doesn't require JWT tokens in the URL. 🎉
