# AutoShift API Specification

## 🔗 Base URL

```
Production: https://api.autoshift.app/v1
Development: http://localhost:3000/api/v1
```

## 🔐 Authentication

All endpoints require JWT Bearer token unless marked as `[Public]`.

```
Authorization: Bearer <access_token>
```

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user `[Public]` |
| POST | `/auth/login` | Login `[Public]` |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout (invalidate refresh token) |
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/password` | Change password |
| POST | `/auth/forgot-password` | Request password reset `[Public]` |
| POST | `/auth/reset-password` | Reset password with token `[Public]` |

---

## 👥 Employees API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/employees` | List all employees | Admin, Supervisor |
| GET | `/employees/:id` | Get employee by ID | All |
| POST | `/employees` | Create employee | Admin |
| PUT | `/employees/:id` | Update employee | Admin |
| DELETE | `/employees/:id` | Soft delete employee | Admin |
| GET | `/employees/:id/shifts` | Get employee shifts | All |
| GET | `/employees/:id/leave-balance` | Get leave balance | All |
| PUT | `/employees/:id/preferences` | Update shift preferences | Employee |

### Request/Response Examples

#### GET `/employees`

```http
GET /api/v1/employees?page=1&limit=20&role_id=uuid&is_active=true
Authorization: Bearer <token>
```

Response:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "employeeCode": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "role": {
        "id": "uuid",
        "name": "Doctor",
        "rankLevel": 3
      },
      "type": {
        "id": "uuid",
        "name": "Fixed",
        "code": "FIXED"
      },
      "joinDate": "2023-01-15",
      "seniorityLevel": 2,
      "preferredShift": "morning",
      "isActive": true
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

#### POST `/employees`

```http
POST /api/v1/employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+1234567891",
  "roleId": "550e8400-e29b-41d4-a716-446655440001",
  "typeId": "550e8400-e29b-41d4-a716-446655440002",
  "joinDate": "2024-01-01",
  "preferredShift": "evening",
  "maxHoursPerWeek": 40
}
```

---

## 📅 Shifts API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/shifts` | List shifts | All |
| GET | `/shifts/:id` | Get shift by ID | All |
| POST | `/shifts` | Create shift | Admin |
| PUT | `/shifts/:id` | Update shift | Admin |
| DELETE | `/shifts/:id` | Delete shift | Admin |
| GET | `/shift-templates` | List shift templates | All |
| POST | `/shift-templates` | Create shift template | Admin |

### Request/Response Examples

#### GET `/shifts`

```http
GET /api/v1/shifts?start_date=2024-01-01&end_date=2024-01-31&template_id=uuid
Authorization: Bearer <token>
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2024-01-15",
      "template": {
        "id": "uuid",
        "name": "Morning Shift",
        "code": "MORNING"
      },
      "startTime": "07:00",
      "endTime": "15:00",
      "minStaff": 3,
      "maxStaff": 5,
      "isPublished": true,
      "assignedCount": 4,
      "assignments": [
        {
          "id": "uuid",
          "employee": {
            "id": "uuid",
            "firstName": "John",
            "lastName": "Doe",
            "role": "Doctor"
          },
          "status": "confirmed"
        }
      ]
    }
  ]
}
```

---

## 📊 Roster API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/roster` | Get roster calendar | All |
| GET | `/roster/my-shifts` | Get current user's shifts | Employee |
| POST | `/roster/generate` | AI generate roster | Admin |
| POST | `/roster/publish` | Publish roster | Admin |
| GET | `/roster/conflicts` | Check for conflicts | Admin |
| POST | `/roster/assign` | Assign employee to shift | Admin |
| DELETE | `/roster/unassign` | Remove assignment | Admin |
| PUT | `/roster/bulk-assign` | Bulk assign shifts | Admin |

### Request/Response Examples

#### GET `/roster`

```http
GET /api/v1/roster?month=1&year=2024&employee_id=uuid
Authorization: Bearer <token>
```

Response:
```json
{
  "month": 1,
  "year": 2024,
  "calendar": [
    {
      "date": "2024-01-01",
      "dayOfWeek": "Monday",
      "shifts": [
        {
          "id": "uuid",
          "template": "Morning",
          "time": "07:00-15:00",
          "assignments": [
            {
              "employeeId": "uuid",
              "employeeName": "John Doe",
              "role": "Doctor",
              "status": "confirmed"
            }
          ],
          "staffingStatus": "adequate" // adequate, understaffed, overstaffed
        }
      ]
    }
  ],
  "summary": {
    "totalShifts": 93,
    "staffedShifts": 90,
    "understaffedShifts": 3,
    "publishedDays": 31
  }
}
```

#### POST `/roster/generate`

```http
POST /api/v1/roster/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 2,
  "year": 2024,
  "options": {
    "useCyclePattern": true,
    "patternId": "uuid",
    "respectPreferences": true,
    "balanceWorkload": true,
    "enforceRestRules": true,
    "excludeEmployees": ["uuid1", "uuid2"]
  }
}
```

Response:
```json
{
  "success": true,
  "roster": {
    "month": 2,
    "year": 2024,
    "generatedAt": "2024-01-25T10:30:00Z",
    "totalAssignments": 450,
    "conflicts": [],
    "warnings": [
      {
        "type": "preference_not_met",
        "employeeId": "uuid",
        "message": "John Doe preferred morning shifts but was assigned 2 evening shifts"
      }
    ]
  },
  "aiExplanation": "Roster generated successfully. All rest rules enforced. Workload balanced across 45 employees with average 10 shifts per person."
}
```

---

## 🏖️ Leave API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/leave/types` | List leave types | All |
| GET | `/leave/requests` | List leave requests | Admin, Supervisor |
| GET | `/leave/requests/my` | Get my leave requests | Employee |
| POST | `/leave/requests` | Create leave request | Employee |
| PUT | `/leave/requests/:id` | Update leave request | Employee |
| DELETE | `/leave/requests/:id` | Cancel leave request | Employee |
| POST | `/leave/requests/:id/approve` | Approve leave | Admin, Supervisor |
| POST | `/leave/requests/:id/reject` | Reject leave | Admin, Supervisor |
| GET | `/leave/balance/:employeeId` | Get leave balance | All |

### Request/Response Examples

#### POST `/leave/requests`

```http
POST /api/v1/leave/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "leaveTypeId": "uuid",
  "startDate": "2024-02-01",
  "endDate": "2024-02-03",
  "reason": "Family vacation",
  "isHalfDay": false,
  "documents": []
}
```

#### GET `/leave/balance/:employeeId`

Response:
```json
{
  "employeeId": "uuid",
  "year": 2024,
  "balances": [
    {
      "leaveType": {
        "id": "uuid",
        "name": "Annual Leave",
        "code": "ANNUAL"
      },
      "entitled": 14,
      "used": 3,
      "pending": 2,
      "remaining": 9
    },
    {
      "leaveType": {
        "id": "uuid",
        "name": "Medical Leave",
        "code": "MEDICAL"
      },
      "entitled": 14,
      "used": 1,
      "pending": 0,
      "remaining": 13
    }
  ]
}
```

---

## 🔄 Swap API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/swaps` | List swap requests | Admin, Supervisor |
| GET | `/swaps/my` | Get my swap requests | Employee |
| POST | `/swaps` | Create swap request | Employee |
| POST | `/swaps/:id/respond` | Target responds to swap | Employee |
| POST | `/swaps/:id/approve` | Admin approves swap | Admin, Supervisor |
| POST | `/swaps/:id/reject` | Reject swap | Admin, Supervisor |
| DELETE | `/swaps/:id` | Cancel swap request | Employee |

### Request/Response Examples

#### POST `/swaps`

```http
POST /api/v1/swaps
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetEmployeeId": "uuid",
  "myShiftAssignmentId": "uuid",
  "theirShiftAssignmentId": "uuid",
  "reason": "Personal appointment on that day"
}
```

---

## 🤖 AI API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/ai/generate-roster` | AI roster generation | Admin |
| POST | `/ai/optimize-roster` | Optimize existing roster | Admin |
| POST | `/ai/explain` | Explain assignment decision | All |
| POST | `/ai/chat` | AI chatbot query | All |
| POST | `/ai/natural-language` | Process NL command | Admin |
| GET | `/ai/conflicts` | AI conflict detection | Admin |
| GET | `/ai/predictions` | Staffing predictions | Admin |

### Request/Response Examples

#### POST `/ai/chat`

```http
POST /api/v1/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Do I work tomorrow?",
  "context": {
    "employeeId": "uuid"
  }
}
```

Response:
```json
{
  "response": "Yes, you are scheduled to work tomorrow (January 26, 2024). You have a Morning Shift from 07:00 to 15:00 at the Emergency Department. Would you like me to remind you before your shift?",
  "data": {
    "hasShift": true,
    "shift": {
      "date": "2024-01-26",
      "template": "Morning Shift",
      "time": "07:00-15:00",
      "location": "Emergency Department"
    }
  },
  "suggestions": [
    "Show my schedule for this week",
    "How many leave days do I have left?",
    "Request a swap for this shift"
  ]
}
```

#### POST `/ai/natural-language`

```http
POST /api/v1/ai/natural-language
Authorization: Bearer <token>
Content-Type: application/json

{
  "command": "Move Dr. John to more morning shifts next month"
}
```

Response:
```json
{
  "understood": true,
  "interpretation": "Increase morning shift assignments for Dr. John Doe in February 2024",
  "proposedChanges": [
    {
      "type": "reassign",
      "employeeId": "uuid",
      "employeeName": "Dr. John Doe",
      "from": { "date": "2024-02-05", "shift": "Evening" },
      "to": { "date": "2024-02-05", "shift": "Morning" }
    }
  ],
  "impactedEmployees": [
    {
      "id": "uuid",
      "name": "Dr. Jane Smith",
      "change": "Assigned to Evening shift on 2024-02-05"
    }
  ],
  "requiresConfirmation": true
}
```

---

## 📈 Reports API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/reports/hours-worked` | Hours worked report | Admin |
| GET | `/reports/leave-usage` | Leave usage report | Admin |
| GET | `/reports/workload-distribution` | Workload fairness | Admin |
| GET | `/reports/overtime` | Overtime report | Admin |
| GET | `/reports/monthly-summary` | Monthly summary | Admin |
| POST | `/reports/export` | Export to Excel | Admin |
| POST | `/reports/email` | Email report | Admin |

### Request/Response Examples

#### GET `/reports/monthly-summary`

```http
GET /api/v1/reports/monthly-summary?month=1&year=2024
Authorization: Bearer <token>
```

Response:
```json
{
  "month": 1,
  "year": 2024,
  "summary": {
    "totalEmployees": 50,
    "totalShifts": 465,
    "totalHoursWorked": 3720,
    "averageHoursPerEmployee": 74.4,
    "overtimeHours": 120,
    "understaffedShifts": 5,
    "leavesTaken": {
      "annual": 25,
      "medical": 8,
      "emergency": 3
    },
    "swapsCompleted": 12,
    "complianceRate": 98.5
  },
  "topPerformers": [
    { "id": "uuid", "name": "John Doe", "hoursWorked": 180 }
  ],
  "alerts": [
    { "type": "overtime", "employeeId": "uuid", "message": "Jane Smith exceeded weekly hours limit" }
  ]
}
```

#### POST `/reports/export`

```http
POST /api/v1/reports/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "monthly_roster",
  "month": 1,
  "year": 2024,
  "format": "xlsx",
  "includeCharts": true
}
```

Response:
```json
{
  "downloadUrl": "https://api.autoshift.app/downloads/roster-jan-2024.xlsx",
  "expiresAt": "2024-01-26T12:00:00Z"
}
```

---

## 🔔 Notifications API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/notifications` | Get my notifications | All |
| PUT | `/notifications/:id/read` | Mark as read | All |
| PUT | `/notifications/read-all` | Mark all as read | All |
| DELETE | `/notifications/:id` | Delete notification | All |
| POST | `/notifications/subscribe` | Subscribe to push | All |
| PUT | `/notifications/preferences` | Update preferences | All |

---

## 📚 Upskill API

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/upskill/content` | List learning content | All |
| GET | `/upskill/content/:id` | Get content details | All |
| POST | `/upskill/content` | Add content | Admin |
| GET | `/upskill/my-progress` | Get my learning progress | Employee |
| POST | `/upskill/complete` | Mark content complete | Employee |
| POST | `/upskill/tts` | Text-to-speech (ElevenLabs) | All |
| POST | `/upskill/summarize` | Summarize content (Lindy) | All |

---

## 🔧 Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "startDate",
      "message": "Start date must be in the future"
    }
  ],
  "timestamp": "2024-01-25T10:30:00Z",
  "path": "/api/v1/leave/requests"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 📡 WebSocket Events

### Connection

```javascript
const socket = io('wss://api.autoshift.app', {
  auth: { token: 'Bearer <access_token>' }
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `roster:updated` | Server → Client | Roster changes |
| `shift:assigned` | Server → Client | New shift assignment |
| `leave:status` | Server → Client | Leave request status change |
| `swap:request` | Server → Client | New swap request |
| `notification` | Server → Client | New notification |

