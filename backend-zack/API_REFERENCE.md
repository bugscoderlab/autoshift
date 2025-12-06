# API Reference

## Base URL
```
http://localhost:8000
```

## Endpoints

### Roster Management

#### Generate Monthly Roster
```http
POST /roster/generate
Content-Type: application/json

{
  "year": 2024,
  "month": 1,
  "use_ai": true
}
```

**Response:**
```json
{
  "year": 2024,
  "month": 1,
  "entries": [
    {
      "roster_id": 1,
      "date": "2024-01-01",
      "doctor_id": 1,
      "doctor_name": "Dr. Smith",
      "shift_type": "Resus",
      "source": "fixed-pattern"
    }
  ],
  "violations": [],
  "ai_used": true
}
```

#### Repair Roster Violations
```http
POST /roster/repair
Content-Type: application/json

{
  "year": 2024,
  "month": 1,
  "use_ai": true
}
```

**Response:**
```json
{
  "year": 2024,
  "month": 1,
  "repairs_applied": ["Swap applied: Doctor 2 now has shift on 2024-01-15"],
  "remaining_violations": [],
  "ai_used": true
}
```

### Leave Management

#### Create Leave Request
```http
POST /leave/create
Content-Type: application/json

{
  "doctor_id": 1,
  "date": "2024-01-15",
  "type": "annual",
  "status": "pending"
}
```

**Response:**
```json
{
  "leave_id": 1,
  "doctor_id": 1,
  "doctor_name": "Dr. Smith",
  "date": "2024-01-15",
  "type": "annual",
  "status": "pending"
}
```

#### List Leave Requests
```http
GET /leave/list?doctor_id=1&year=2024&month=1&status=approved
```

**Response:**
```json
{
  "leaves": [
    {
      "leave_id": 1,
      "doctor_id": 1,
      "doctor_name": "Dr. Smith",
      "date": "2024-01-15",
      "type": "annual",
      "status": "approved"
    }
  ],
  "total": 1
}
```

### Shift Requests

#### Create Shift Request
```http
POST /requests/shift
Content-Type: application/json

{
  "doctor_id": 2,
  "date": "2024-01-20",
  "shift_type": "Resus",
  "status": "pending"
}
```

**Response:**
```json
{
  "request_id": 1,
  "doctor_id": 2,
  "doctor_name": "Dr. Jones",
  "date": "2024-01-20",
  "shift_type": "Resus",
  "status": "pending"
}
```

**Note:** Only flexible doctors can create shift requests. Maximum 4 approved requests per month.

#### List Shift Requests
```http
GET /requests/shift?doctor_id=2&year=2024&month=1&status=approved
```

**Response:**
```json
{
  "requests": [
    {
      "request_id": 1,
      "doctor_id": 2,
      "doctor_name": "Dr. Jones",
      "date": "2024-01-20",
      "shift_type": "Resus",
      "status": "approved"
    }
  ],
  "total": 1
}
```

### Swap Management

#### Request Shift Swap
```http
POST /swap/request
Content-Type: application/json

{
  "doctor_id_from": 1,
  "doctor_id_to": 2,
  "date": "2024-01-15",
  "validate_compliance": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Swap applied: Doctor 2 now has shift on 2024-01-15",
  "violations": [],
  "swap_applied": true
}
```

### AI Endpoints

#### Explain Violation or Assignment
```http
POST /ai/explain
Content-Type: application/json

{
  "violation_type": "rest_rule",
  "doctor_id": 1,
  "date": "2024-01-15",
  "context": {}
}
```

**Or for shift assignment:**
```http
POST /ai/explain
Content-Type: application/json

{
  "doctor_id": 1,
  "date": "2024-01-15",
  "shift_type": "Resus",
  "context": {}
}
```

**Response:**
```json
{
  "explanation": "This violation occurred because...",
  "model_used": "claude-3-5-sonnet",
  "reasoning": null
}
```

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error response format:
```json
{
  "detail": "Error message here"
}
```

## Query Parameters

### Leave List
- `doctor_id` (int, optional) - Filter by doctor ID
- `year` (int, optional) - Filter by year
- `month` (int, optional) - Filter by month
- `status` (enum, optional) - Filter by status (pending, approved, rejected)

### Shift Request List
- `doctor_id` (int, optional) - Filter by doctor ID
- `year` (int, optional) - Filter by year
- `month` (int, optional) - Filter by month
- `status` (enum, optional) - Filter by status (pending, approved, rejected)

## Interactive Documentation

When the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These provide interactive API documentation where you can test endpoints directly.

