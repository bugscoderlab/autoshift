# Hospital Roster Management System

Backend API for managing hospital doctor rosters with AI assistance.

## Features

- **Fixed-shift doctors**: Weekly rotating patterns (4-week cycle)
- **Flexible-shift doctors**: Complex rules with proration, leave, and shift requests
- **Compliance checking**: 11-hour rest rule, workload balancing
- **AI integration**: Claude (reasoning) + Groq (fast inference) for roster generation and optimization
- **Leave management**: Create and manage leave requests
- **Shift requests**: Flexible doctors can request up to 4 confirmed shifts per month
- **Swap management**: Shift swaps with compliance validation

## Tech Stack

- **FastAPI**: Web framework
- **SQLModel**: ORM (SQLAlchemy-based)
- **TiDB**: MySQL-compatible database
- **Claude API**: Primary AI reasoning
- **Groq API**: Fast AI inference
- **Python 3.10+**

## Project Structure

```
app/
  routers/          # FastAPI route handlers
  services/         # Business logic layer
  models/           # SQLModel database models
  schemas/          # Pydantic request/response schemas
  db/               # Database session and initialization
  rules/            # Rule engine modules (compliance, proration, etc.)
  ai/               # AI integration modules
  utils/            # Utility functions
```

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and API keys
   ```
   
   **For TiDB Cloud users**: See [TIDB_CLOUD_SETUP.md](TIDB_CLOUD_SETUP.md) for detailed TiDB Cloud configuration instructions.

3. **Initialize database**:
   ```bash
   # Option 1: Using SQLModel (recommended)
   python -m app.db.init_db
   
   # Option 2: Using SQL script
   mysql -u user -p database_name < schema.sql
   ```

4. **Run the application**:
   ```bash
   uvicorn main:app --reload
   ```

## API Endpoints

### Roster Management

- `POST /roster/generate` - Generate monthly roster
- `POST /roster/repair` - Repair roster violations

### Leave Management

- `POST /leave/create` - Create leave request
- `GET /leave/list` - List leave requests (with filters)

### Shift Requests

- `POST /requests/shift` - Create shift request (flexible doctors only)
- `GET /requests/shift` - List shift requests (with filters)

### Swap Management

- `POST /swap/request` - Request shift swap

### AI Endpoints

- `POST /ai/explain` - Get AI explanation for violations or assignments

## Configuration

Environment variables (see `.env.example`):

**Database (TiDB) Configuration:**
- `DB_HOST`: Database host (e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com` for TiDB Cloud)
- `DB_PORT`: Database port (default: `4000`)
- `DB_NAME`: Database name (default: `hospital_roster`)
- `DB_USER`: Database username (default: `root`)
- `DB_PASSWORD`: Database password

**FastAPI Configuration:**
- `FASTAPI_HOST`: Host to bind to (default: `0.0.0.0`)
- `FASTAPI_PORT`: Port to run on (default: `8000`)
- `FASTAPI_DEBUG`: Enable debug mode (default: `false`)

**AI Configuration:**
- `CLAUDE_API_KEY`: Claude API key
- `CLAUDE_API_BASE_URL`: Claude API base URL (default: `https://api.anthropic.com/v1`)
- `GROQ_API_KEY`: Groq API key
- `GROQ_API_BASE_URL`: Groq API base URL (default: `https://api.groq.com/openai/v1`)
- `AI_MAX_TOKENS`: Maximum tokens for AI responses (default: `4096`)
- `AI_TEMPERATURE`: AI temperature setting (default: `0.7`)

**Logging Configuration:**
- `LOG_PATH`: Path to log file (default: `logs/app.log`)
- `LOG_LEVEL`: Log level (default: `INFO`)

**Note**: For TiDB Cloud, SSL is automatically enabled when TiDB Cloud host patterns are detected.

## Database Schema

See `schema.sql` for complete SQL schema. Key tables:

- `doctor`: Unified table for fixed and flexible doctors
- `weekly_fixed_pattern`: 4-week rotating patterns
- `monthly_roster`: Shift assignments
- `leave`: Leave requests
- `shift_requests`: Confirmed shift requests

## Compliance Rules

1. **11-hour rest rule**: Minimum 11 hours between shifts
2. **Workload balancing**: Resus (20-35%), EDx (30-45%), AUC (25-40%)
3. **Shift requests**: Max 4 approved requests per month (flexible doctors)
4. **Proration**: Leave/off-days prorated by join_date, leave_date, FTE

## Development

The system uses dependency injection for database sessions. Services are separated from routers for clean architecture.

AI integration is optional but enabled by default. The system falls back gracefully if AI is unavailable.

## License

Proprietary - Hospital Roster Management System

