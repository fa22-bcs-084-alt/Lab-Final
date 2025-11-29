# Frontend Fitbit Integration - Simple Guide

## 🎯 Quick Implementation

### Step 1: Add the Button

```tsx
// React/Next.js Component
'use client'

export default function FitbitConnectButton() {
  const handleFitbitConnect = () => {
    // Get user's JWT token from wherever you store it
    const token = localStorage.getItem('authToken') // or from cookies/context
    
    if (!token) {
      alert('Please login first')
      return
    }

    // Redirect to backend Fitbit OAuth
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001'
    window.location.href = `${backendUrl}/auth/fitbit?token=${token}`
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

### Step 2: Handle Success Redirect

```tsx
// In your dashboard page
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
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (error) {
      alert(`❌ Error: ${error}`)
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

## 📝 Vanilla JavaScript Version

```html
<button id="fitbit-btn">Connect Fitbit</button>

<script>
  document.getElementById('fitbit-btn').addEventListener('click', () => {
    const token = localStorage.getItem('authToken')
    
    if (!token) {
      alert('Please login first')
      return
    }

    window.location.href = `http://localhost:4001/auth/fitbit?token=${token}`
  })

  // Handle callback
  const params = new URLSearchParams(window.location.search)
  if (params.get('fitbit') === 'connected') {
    alert('✅ Fitbit connected!')
    window.history.replaceState({}, '', window.location.pathname)
  }
</script>
```

## 🔄 Flow

1. User clicks "Connect Fitbit" button
2. Frontend redirects to: `http://localhost:4001/auth/fitbit?token={jwt}`
3. Backend redirects to Fitbit authorization
4. User authorizes
5. Fitbit redirects back to backend
6. Backend saves tokens to database
7. Backend redirects to: `http://localhost:3000?fitbit=connected`
8. Frontend shows success message

## 🎨 Styled Button Example

```tsx
<button 
  onClick={handleFitbitConnect}
  className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#00B0B9] to-[#00D4DD] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 18c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3-3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/>
  </svg>
  Connect Fitbit
</button>
```

That's it! 🎉
