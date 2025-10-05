# MCP Server to API Gateway Integration

## Overview
This document outlines the integration between the Model Context Protocol (MCP) server and the Hygieia API Gateway. The MCP server now makes HTTP calls to the API Gateway routes instead of returning placeholder messages.

## API Gateway Base URL
```
http://localhost:4000
```

## MCP Tools (Actions) → API Gateway Routes Mapping

### 1. Appointment Management

#### `book_appointment(patient_id, doctor_id, date, time)`
- **Route**: `POST /appointments`
- **Payload**: 
  ```json
  {
    "patientId": "patient_id",
    "doctorId": "doctor_id", 
    "appointmentDate": "date",
    "appointmentTime": "time",
    "type": "CONSULTATION",
    "mode": "ONLINE",
    "status": "SCHEDULED"
  }
  ```

#### `reschedule_appointment(appointment_id, new_date, new_time)`
- **Route**: `PATCH /appointments/{appointment_id}`
- **Payload**:
  ```json
  {
    "appointmentDate": "new_date",
    "appointmentTime": "new_time",
    "status": "RESCHEDULED"
  }
  ```

#### `cancel_appointment(appointment_id)`
- **Route**: `DELETE /appointments/{appointment_id}`

#### `view_pending_appointments(patient_id)`
- **Route**: `GET /appointments/patient?patientId={patient_id}&status=SCHEDULED`

### 2. Lab Test Management

#### `book_lab_test(patient_id, test_name, date)`
- **Route**: `POST /booked-lab-tests`
- **Payload**:
  ```json
  {
    "testId": "test_name",
    "patientId": "patient_id",
    "scheduledDate": "date",
    "scheduledTime": "09:00",
    "location": "Main Lab",
    "instructions": ["Fasting required", "Bring ID"]
  }
  ```

#### `cancel_lab_test(test_id)`
- **Route**: `PATCH /booked-lab-tests/{test_id}/cancel`

#### `view_pending_lab_tests(patient_id)`
- **Route**: `GET /booked-lab-tests/patient/{patient_id}`

### 3. Medical Records & Prescriptions

#### `question_from_medical_records(patient_id, question)`
- **Route**: `GET /medical-records/patient/{patient_id}`
- **Note**: Returns medical records data. AI processing of questions requires additional integration.

#### `view_all_prescriptions(patient_id)`
- **Route**: `GET /prescriptions/patient/{patient_id}`
- **Status**: ✅ New endpoint created

#### `todays_medicine(patient_id)`
- **Route**: `GET /medicines/today/{patient_id}`
- **Status**: ✅ New endpoint created

### 4. Healthcare Providers

#### `list_doctors_and_nutritionists()`
- **Routes**: 
  - `GET /nutritionists` (existing)
  - `GET /doctors` (✅ new endpoint created)
- **Returns**: Combined list of doctors and nutritionists

## MCP Resources (Data Access) → API Gateway Routes Mapping

### 1. `resource://appointments/{patient_id}`
- **Route**: `GET /appointments/patient?patientId={patient_id}`

### 2. `resource://prescriptions/{patient_id}`
- **Route**: `GET /prescriptions/patient/{patient_id}`
- **Status**: ✅ New endpoint created

### 3. `resource://labtests/{patient_id}`
- **Route**: `GET /booked-lab-tests/patient/{patient_id}`

### 4. `resource://doctors`
- **Routes**: 
  - `GET /nutritionists`
  - `GET /doctors` (✅ new endpoint created)

### 5. `resource://todays-medicine/{patient_id}`
- **Route**: `GET /medicines/today/{patient_id}`
- **Status**: ✅ New endpoint created

## New API Gateway Modules Created

### 1. Prescriptions Module
- **Controller**: `src/prescriptions/prescriptions.controller.ts`
- **Module**: `src/prescriptions/prescriptions.module.ts`
- **Service Port**: 3004 (configurable)

### 2. Doctors Module  
- **Controller**: `src/doctors/doctors.controller.ts`
- **Module**: `src/doctors/doctors.module.ts`
- **Service Port**: 3001 (reuses AUTH_SERVICE)

### 3. Medicines Module
- **Controller**: `src/medicines/medicines.controller.ts`
- **Module**: `src/medicines/medicines.module.ts`
- **Service Port**: 3005 (configurable)

## Response Format

All MCP functions now return structured responses:

### Success Response
```json
{
  "success": true,
  "data": {...}, // API Gateway response data
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "status_code": 400
}
```

## Error Handling

- All HTTP requests include proper error handling
- Network errors are caught and logged
- API Gateway errors are returned with status codes
- Graceful fallbacks for missing endpoints

## Dependencies

The MCP server now requires:
```python
import requests
import json
```

## Next Steps

1. **Microservice Implementation**: The new API Gateway routes need corresponding microservices:
   - Prescriptions Service (port 3004)
   - Doctors Service (port 3001 - may reuse existing auth service)
   - Medicines Service (port 3005)

2. **Database Integration**: Each microservice needs database models and repositories

3. **Authentication**: Consider adding authentication headers to MCP server requests

4. **Testing**: Test all MCP functions with actual API Gateway endpoints

5. **AI Integration**: Enhance `question_from_medical_records` with actual AI processing

## Configuration

Update the API Gateway base URL in `mcp_server.py` if needed:
```python
API_GATEWAY_BASE_URL = "http://localhost:4000"
```

## Port Configuration

Ensure microservice ports are correctly configured:
- API Gateway: 4000
- Prescriptions Service: 3004
- Doctors Service: 3001 (AUTH_SERVICE)
- Medicines Service: 3005
