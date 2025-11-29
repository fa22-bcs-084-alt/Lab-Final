# 🧪 Fitbit API Test Routes

## Test Routes (No Database Storage - Real-time API calls)

### 1. Get Fitbit Data for Specific User

```bash
GET http://localhost:4001/auth/fitbit/test/:userId
```

**Example:**
```bash
curl http://localhost:4001/auth/fitbit/test/your-user-id-here
```

**Response:**
```json
{
  "success": true,
  "userId": "abc-123",
  "data": {
    "activity": {
      "steps": 8543,
      "caloriesOut": 2156,
      "distances": [...],
      "fairlyActiveMinutes": 30,
      "veryActiveMinutes": 15
    },
    "heartRate": {
      "activities-heart": [...]
    },
    "sleepData": {
      "sleep": [...],
      "summary": {...}
    }
  },
  "message": "Real-time Fitbit data fetched successfully"
}
```

### 2. Get Fitbit Data for ALL Users

```bash
GET http://localhost:4001/auth/fitbit/test-all
```

**Example:**
```bash
curl http://localhost:4001/auth/fitbit/test-all
```

**Response:**
```json
{
  "success": true,
  "totalUsers": 2,
  "data": [
    {
      "userId": "user-1",
      "fitbitUserId": "CWQNST",
      "data": {
        "activity": {...},
        "heartRate": {...},
        "sleepData": {...}
      },
      "fetchedAt": "2025-11-28T18:30:00.000Z"
    },
    {
      "userId": "user-2",
      "fitbitUserId": "ABCD123",
      "data": {...},
      "fetchedAt": "2025-11-28T18:30:05.000Z"
    }
  ],
  "message": "Real-time Fitbit data fetched for all users"
}
```

## Testing in Browser

**Single User:**
```
http://localhost:4001/auth/fitbit/test/YOUR_USER_ID
```

**All Users:**
```
http://localhost:4001/auth/fitbit/test-all
```

## Testing with Postman

1. Open Postman
2. Create GET request
3. Enter URL: `http://localhost:4001/auth/fitbit/test-all`
4. Click Send
5. View JSON response

## Notes

- ✅ Data is fetched in **real-time** from Fitbit API
- ✅ No data is stored in database (as per your request)
- ✅ Automatically refreshes tokens if expired
- ✅ Returns data for today's date
- ⚠️ Requires users to have connected Fitbit first via OAuth

## Data Included

Each user's data contains:
- **Steps**: Daily step count
- **Calories**: Calories burned today
- **Distance**: Distance traveled (km/miles)
- **Active Minutes**: Fairly + Very active minutes
- **Heart Rate**: Heart rate zones and resting HR
- **Sleep**: Sleep duration, stages, efficiency

## Error Handling

If a user's token is invalid or expired, the response will include an error:

```json
{
  "userId": "user-3",
  "fitbitUserId": "XYZ789",
  "error": "Failed to refresh token: unauthorized_client",
  "fetchedAt": "2025-11-28T18:30:10.000Z"
}
```

---

**Start your server and test the routes!** 🚀
