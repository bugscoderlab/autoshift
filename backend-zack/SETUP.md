# Setup Instructions

## Prerequisites

- Python 3.10, 3.11, 3.12, or 3.13 (Python 3.14 may have compatibility issues)
- TiDB/MySQL database server
- Claude API key (for AI features)
- Groq API key (for AI features)

**Note:** If you're using Python 3.14 and encounter build errors with pydantic-core, consider using Python 3.11 or 3.12 for better compatibility.

## Installation Steps

1. **Install Python dependencies**:
   
   **If using Python 3.11, 3.12, or 3.13:**
   ```bash
   pip install -r requirements.txt
   ```
   
   **If using Python 3.14 (may have compatibility issues):**
   ```bash
   # Try installing with pre-built wheels first
   ./install_requirements.sh
   
   # Or manually install pydantic first
   pip install --only-binary :all: "pydantic>=2.10.0"
   pip install -r requirements.txt
   ```
   
   **Note:** If you encounter build errors with pydantic-core on Python 3.14, we recommend using Python 3.11 or 3.12 for better compatibility.

2. **Create environment file**:
   Create a `.env` file in the project root with the following content:
   
   ```env
   # Database (TiDB) Configuration
   DB_HOST=your-tidb-host-or-localhost
   DB_PORT=4000
   DB_NAME=hospital_roster
   DB_USER=root
   DB_PASSWORD=your_password_here
   # Force SSL (set to true for TiDB Cloud if auto-detection doesn't work)
   DB_FORCE_SSL=false

   # FastAPI Configuration
   FASTAPI_HOST=0.0.0.0
   FASTAPI_PORT=8000
   FASTAPI_DEBUG=false

   # AI Configuration
   CLAUDE_API_KEY=your_claude_api_key_here
   CLAUDE_API_BASE_URL=https://api.anthropic.com/v1
   CLAUDE_MODEL=claude-3-5-sonnet-20240620
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_API_BASE_URL=https://api.groq.com/openai/v1
   GROQ_MODEL=llama-3.1-70b-versatile
   AI_MAX_TOKENS=4096
   AI_TEMPERATURE=0.7

   # Logging Configuration
   LOG_PATH=logs/app.log
   LOG_LEVEL=INFO
   ```
   
   **For TiDB Cloud:**
   - Set `DB_HOST` to your TiDB Cloud host (e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`)
   - Set `DB_PORT` to `4000` (default)
   - Set `DB_USER` to `root` (or your TiDB Cloud username)
   - Set `DB_PASSWORD` to your TiDB Cloud password
   - SSL will be automatically enabled for TiDB Cloud connections
   
   **For Local TiDB/MySQL:**
   - Set `DB_HOST` to `localhost`
   - Set `DB_PORT` to `4000` (or your MySQL port)
   - Set `DB_USER` and `DB_PASSWORD` accordingly

3. **Initialize Database**:
   
   Option A - Using Python with checks (recommended):
   ```bash
   python3 check_and_init_db.py
   ```
   This script will check if tables exist and create them if needed.
   
   Option B - Direct initialization:
   ```bash
   python3 -m app.db.init_db
   ```
   
   Option C - Using SQL script:
   ```bash
   mysql -h YOUR_HOST -P 4000 -u root -p hospital_roster < schema.sql
   ```
   
   **Note**: If you get "Unknown column" errors, the tables haven't been created yet. Run the initialization script first.

4. **Run the application**:
   ```bash
   # Development mode with auto-reload
   uvicorn main:app --reload
   
   # Or use Python directly
   python main.py
   ```

5. **Generate dummy data (optional)**:
   ```bash
   python3 generate_dummy_data.py
   ```
   This will create:
   - 20 fixed-shift doctors with weekly patterns
   - 50 flexible-shift doctors
   - Sample leave entries
   - Sample shift requests
   - Sample roster entries

6. **Access API documentation**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Testing the API

### Health Check
```bash
curl http://localhost:8000/health
```

### Generate Roster
```bash
curl -X POST "http://localhost:8000/roster/generate" \
  -H "Content-Type: application/json" \
  -d '{"year": 2024, "month": 1, "use_ai": true}'
```

### Create Leave Request
```bash
curl -X POST "http://localhost:8000/leave/create" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 1,
    "date": "2024-01-15",
    "type": "annual",
    "status": "pending"
  }'
```

## Project Structure Overview

- `app/routers/` - FastAPI route handlers
- `app/services/` - Business logic layer
- `app/models/` - SQLModel database models
- `app/schemas/` - Pydantic request/response schemas
- `app/db/` - Database configuration
- `app/rules/` - Compliance rule engines
- `app/ai/` - AI integration (Claude + Groq)
- `main.py` - Application entrypoint

## Notes

- AI features are optional but enabled by default. Set `AI_ENABLED=false` to disable.
- The system gracefully handles missing AI API keys (features will be unavailable but won't crash).
- All endpoints follow RESTful conventions.
- Database models use SQLModel (SQLAlchemy-based) for type safety.


