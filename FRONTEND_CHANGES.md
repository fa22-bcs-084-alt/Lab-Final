# Frontend Changes Required for Appointment APIs

## Overview

The backend has been updated to include **location information** for appointments. This document covers changes to:

1. **Available Slots API** - Now returns location for each time slot
2. **Patient Appointments API** - Now returns location for physical appointments and link for online appointments

---

# 1. Available Slots API Changes

## Endpoint: `GET /appointments/available-slots`

**Query Parameters (unchanged):**
- `providerId` - The nutritionist/doctor ID
- `role` - The role (e.g., "nutritionist", "doctor")
- `date` - The date to check availability (YYYY-MM-DD format)

### Response Changes

**Before:**
```json
{
  "providerId": "123",
  "role": "nutritionist",
  "date": "2025-12-01",
  "availableSlots": [
    "09:00:00",
    "10:00:00",
    "11:00:00"
  ]
}
```

**After:**
```json
{
  "providerId": "123",
  "role": "nutritionist",
  "date": "2025-12-01",
  "location": "City Hospital - Wing A",
  "availableSlots": [
    {
      "time": "09:00:00",
      "location": "City Hospital - Wing A"
    },
    {
      "time": "10:00:00",
      "location": "City Hospital - Wing A"
    },
    {
      "time": "11:00:00",
      "location": "City Hospital - Wing A"
    }
  ]
}
```

### TypeScript Interface Updates

**Before:**
```typescript
interface AvailableSlotsResponse {
  providerId: string;
  role: string;
  date: string;
  availableSlots: string[];
  slots?: string[];
  message?: string;
}
```

**After:**
```typescript
interface TimeSlot {
  time: string;
  location: string;
}

interface AvailableSlotsResponse {
  providerId: string;
  role: string;
  date: string;
  location: string;  // NEW! The location for this working day
  availableSlots: TimeSlot[];  // CHANGED! Now array of objects instead of strings
  slots?: TimeSlot[];
  message?: string;
}
```

### Component Updates

**Before:**
```tsx
{availableSlots.map((slot) => (
  <button key={slot} onClick={() => selectSlot(slot)}>
    {formatTime(slot)}
  </button>
))}
```

**After:**
```tsx
{availableSlots.map((slot) => (
  <div key={slot.time} className="slot-card">
    <button onClick={() => selectSlot(slot.time)}>
      {formatTime(slot.time)}
    </button>
    <span className="slot-location">
      📍 {slot.location}
    </span>
  </div>
))}
```

---

# 2. Patient Appointments API Changes

## Endpoint: `GET /appointments/patient?patientId={id}`

The response now includes **location** for physical appointments and **link** for online appointments.

### Response Changes

**Before:**
```json
{
  "id": "appointment-123",
  "patientId": "patient-456",
  "doctorId": "nutritionist-789",
  "doctorRole": "nutritionist",
  "doctorDetails": { ... },
  "date": "2025-12-01",
  "time": "10:00:00",
  "status": "upcoming",
  "type": "consultation",
  "mode": "physical",
  "dataShared": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**After (Physical Appointment):**
```json
{
  "id": "appointment-123",
  "patientId": "patient-456",
  "doctorId": "nutritionist-789",
  "doctorRole": "nutritionist",
  "doctorDetails": { ... },
  "date": "2025-12-01",
  "time": "10:00:00",
  "status": "upcoming",
  "type": "consultation",
  "mode": "physical",
  "location": "City Hospital - Wing A",
  "dataShared": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**After (Online Appointment):**
```json
{
  "id": "appointment-456",
  "patientId": "patient-456",
  "doctorId": "nutritionist-789",
  "doctorRole": "nutritionist",
  "doctorDetails": { ... },
  "date": "2025-12-02",
  "time": "14:00:00",
  "status": "upcoming",
  "type": "consultation",
  "mode": "online",
  "link": "https://zoom.us/j/123456789",
  "dataShared": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### TypeScript Interface Updates

**Before:**
```typescript
interface PatientAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorRole: string;
  doctorDetails: DoctorDetails;
  date: string;
  time: string;
  status: string;
  type: string;
  notes?: string;
  report?: string;
  mode: string;
  dataShared: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**After:**
```typescript
interface PatientAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorRole: string;
  doctorDetails: DoctorDetails;
  date: string;
  time: string;
  status: string;
  type: string;
  notes?: string;
  report?: string;
  mode: 'physical' | 'online';
  location?: string;  // NEW! Present for physical appointments
  link?: string;      // NEW! Present for online appointments
  dataShared: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Component Updates

```tsx
// Appointment Card Component
const AppointmentCard = ({ appointment }) => {
  return (
    <div className="appointment-card">
      <h3>{appointment.doctorDetails.name}</h3>
      <p>📅 {appointment.date} at {appointment.time}</p>
      
      {/* Show location or meeting link based on mode */}
      {appointment.mode === 'physical' ? (
        <div className="location-info">
          📍 <strong>Location:</strong> {appointment.location || 'Location not specified'}
        </div>
      ) : (
        <div className="meeting-info">
          🔗 <a href={appointment.link} target="_blank" rel="noopener noreferrer">
            Join Meeting
          </a>
        </div>
      )}
    </div>
  );
};
```

---

# Migration Notes

## Breaking Changes ⚠️

### 1. Available Slots
The `availableSlots` array has changed from `string[]` to `{ time: string; location: string }[]`.

**Quick Fix:**
```typescript
// Extract just the times (like before)
const slotTimes = availableSlots.map(slot => slot.time);
```

### 2. Patient Appointments
New optional fields `location` and `link` have been added. These are non-breaking additions.

---

# Files to Update

| File | Required Changes |
|------|------------------|
| `src/types/appointment.ts` | Update interfaces with new fields |
| `src/types/index.ts` | Update `Doctor` interface `workingHours` to include `location` |
| Slot selection component | Handle new slot object structure |
| Appointment list/card component | Display location for physical, link for online |
| Booking confirmation component | Show location information |
| Appointment details page | Show location or meeting link |

---

# UI Suggestions

1. **Physical Appointments:**
   - Display location prominently with a map icon 📍
   - Consider adding a "Get Directions" link to Google Maps
   
2. **Online Appointments:**
   - Show "Join Meeting" button with the Zoom/Meet link
   - Display link only when appointment is upcoming
   
3. **Appointment Cards:**
   - Use visual indicators to differentiate physical vs online
   - 🏥 for physical, 💻 for online

---

# Testing Checklist

- [ ] Available slots API returns new structure with location
- [ ] Slot selection works with new object format
- [ ] Patient appointments show location for physical mode
- [ ] Patient appointments show link for online mode
- [ ] Handle "Location not specified" gracefully
- [ ] Handle missing link for online appointments gracefully
- [ ] Booking flow works end-to-end
- [ ] Appointment details page displays correctly

---

## Questions?

Contact the backend team if you need clarification on any of these changes.
