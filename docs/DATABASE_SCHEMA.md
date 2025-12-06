# AutoShift Database Schema

## 📊 Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AUTOSHIFT DATABASE ERD                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│     organizations    │       │       industries     │       │    industry_configs  │
├──────────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │──┐    │ id (PK)              │──┐    │ id (PK)              │
│ name                 │  │    │ name                 │  │    │ industry_id (FK)     │──┐
│ industry_id (FK)     │──┼────│ code                 │  └────│ org_id (FK)          │  │
│ timezone             │  │    │ description          │       │ min_rest_hours       │  │
│ logo_url             │  │    │ default_rest_hours   │       │ min_shift_hours      │  │
│ created_at           │  │    │ created_at           │       │ max_shift_hours      │  │
│ updated_at           │  │    └──────────────────────┘       │ config_json          │  │
└──────────────────────┘  │                                   └──────────────────────┘  │
         │                │                                              │              │
         │                │    ┌──────────────────────┐                  │              │
         │                │    │    employee_roles    │                  │              │
         │                │    ├──────────────────────┤                  │              │
         │                │    │ id (PK)              │                  │              │
         │                └────│ org_id (FK)          │                  │              │
         │                     │ name                 │                  │              │
         │                     │ code                 │                  │              │
         │                     │ rank_level           │                  │              │
         │                     │ color                │                  │              │
         │                     │ is_active            │                  │              │
         │                     └──────────────────────┘                  │              │
         │                              │                                │              │
         │                              │                                │              │
         ▼                              ▼                                │              │
┌──────────────────────┐       ┌──────────────────────┐                  │              │
│      employees       │       │    employee_types    │                  │              │
├──────────────────────┤       ├──────────────────────┤                  │              │
│ id (PK)              │       │ id (PK)              │                  │              │
│ org_id (FK)          │───────│ name                 │                  │              │
│ user_id (FK)         │       │ code                 │ ◄── FIXED        │              │
│ role_id (FK)         │───────│ leave_multiplier    │ ◄── CONTRACT     │              │
│ type_id (FK)         │       │ is_active            │ ◄── TEMPORARY    │              │
│ employee_code        │       └──────────────────────┘ ◄── PROBATION   │              │
│ first_name           │                                                 │              │
│ last_name            │                                                 │              │
│ email                │       ┌──────────────────────┐                  │              │
│ phone                │       │   shift_templates    │                  │              │
│ join_date            │       ├──────────────────────┤                  │              │
│ seniority_level      │       │ id (PK)              │                  │              │
│ preferred_shift      │       │ org_id (FK)          │──────────────────┘              │
│ max_hours_week       │       │ name                 │                                 │
│ is_active            │       │ code                 │                                 │
│ created_at           │       │ start_time           │                                 │
│ updated_at           │       │ end_time             │                                 │
└──────────────────────┘       │ duration_hours       │                                 │
         │                     │ is_half_shift        │                                 │
         │                     │ color                │                                 │
         │                     │ is_active            │                                 │
         │                     └──────────────────────┘                                 │
         │                              │                                               │
         │                              │                                               │
         │    ┌─────────────────────────┼─────────────────────────┐                    │
         │    │                         │                         │                    │
         ▼    ▼                         ▼                         ▼                    │
┌──────────────────────┐       ┌──────────────────────┐  ┌──────────────────────┐      │
│  shift_assignments   │       │       shifts         │  │   cycle_patterns     │      │
├──────────────────────┤       ├──────────────────────┤  ├──────────────────────┤      │
│ id (PK)              │       │ id (PK)              │  │ id (PK)              │      │
│ employee_id (FK)     │───────│ org_id (FK)          │  │ org_id (FK)          │──────┘
│ shift_id (FK)        │───────│ template_id (FK)     │  │ name                 │
│ date                 │       │ date                 │  │ pattern_weeks        │ ◄── [1,2,3,4]
│ status               │       │ start_time           │  │ cycle_start_date     │
│ notes                │       │ end_time             │  │ is_active            │
│ created_at           │       │ min_staff            │  └──────────────────────┘
│ updated_at           │       │ max_staff            │
└──────────────────────┘       │ is_published         │
         │                     │ created_at           │
         │                     └──────────────────────┘
         │
         │
         │                     ┌──────────────────────┐       ┌──────────────────────┐
         │                     │     leave_types      │       │   leave_requests     │
         │                     ├──────────────────────┤       ├──────────────────────┤
         │                     │ id (PK)              │       │ id (PK)              │
         │                     │ org_id (FK)          │───────│ employee_id (FK)     │
         │                     │ name                 │       │ leave_type_id (FK)   │───────┐
         │                     │ code                 │       │ start_date           │       │
         │                     │ default_days         │       │ end_date             │       │
         │                     │ is_paid              │       │ status               │       │
         │                     │ requires_doc         │       │ reason               │       │
         │                     │ color                │       │ approved_by (FK)     │       │
         │                     │ is_active            │       │ created_at           │       │
         │                     └──────────────────────┘       │ updated_at           │       │
         │                                                    └──────────────────────┘       │
         │                                                             │                     │
         │                                                             │                     │
         │                     ┌──────────────────────┐                │                     │
         │                     │    leave_balances    │◄───────────────┘                     │
         │                     ├──────────────────────┤                                      │
         └─────────────────────│ id (PK)              │                                      │
                               │ employee_id (FK)     │                                      │
                               │ leave_type_id (FK)   │◄─────────────────────────────────────┘
                               │ year                 │
                               │ total_days           │
                               │ used_days            │
                               │ pending_days         │
                               └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│    swap_requests     │       │ workload_categories  │       │ workload_assignments │
├──────────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │       │ id (PK)              │
│ requester_id (FK)    │       │ org_id (FK)          │───────│ employee_id (FK)     │
│ target_id (FK)       │       │ name                 │       │ category_id (FK)     │──┐
│ requester_shift (FK) │       │ code                 │       │ shift_id (FK)        │  │
│ target_shift (FK)    │       │ description          │       │ date                 │  │
│ status               │       │ min_staff            │       │ created_at           │  │
│ reason               │       │ color                │       └──────────────────────┘  │
│ approved_by (FK)     │       │ is_active            │                │               │
│ created_at           │       └──────────────────────┘                │               │
│ updated_at           │                                               │               │
└──────────────────────┘                                               │               │
                                                                       │               │
┌──────────────────────┐       ┌──────────────────────┐               │               │
│    shift_requests    │       │     rest_rules       │               │               │
├──────────────────────┤       ├──────────────────────┤               │               │
│ id (PK)              │       │ id (PK)              │               │               │
│ employee_id (FK)     │       │ org_id (FK)          │◄──────────────┘               │
│ shift_id (FK)        │       │ role_id (FK)         │                               │
│ preference_rank      │       │ min_rest_hours       │                               │
│ status               │       │ max_consecutive_days │                               │
│ month                │       │ max_hours_per_week   │                               │
│ year                 │       │ is_active            │                               │
│ created_at           │       └──────────────────────┘                               │
└──────────────────────┘                                                              │
         │                                                                            │
         │  (Each employee can request up to 4 confirmed shifts per month)            │
         │                                                                            │
         ▼                                                                            │
┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│    notifications     │       │     audit_logs       │       │   staffing_rules     │
├──────────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │       │ id (PK)              │
│ user_id (FK)         │       │ org_id (FK)          │       │ org_id (FK)          │
│ type                 │       │ user_id (FK)         │       │ category_id (FK)     │◄────┘
│ title                │       │ action               │       │ shift_template_id    │
│ body                 │       │ entity_type          │       │ day_of_week          │
│ data_json            │       │ entity_id            │       │ min_staff            │
│ is_read              │       │ old_values           │       │ required_roles       │
│ created_at           │       │ new_values           │       │ is_active            │
└──────────────────────┘       │ ip_address           │       └──────────────────────┘
                               │ user_agent           │
                               │ created_at           │
                               └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│    upskill_content   │       │   employee_skills    │       │      ai_logs         │
├──────────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │       │ id (PK)              │
│ org_id (FK)          │       │ employee_id (FK)     │       │ org_id (FK)          │
│ title                │       │ content_id (FK)      │───────│ user_id (FK)         │
│ description          │       │ completed_at         │       │ action_type          │
│ type                 │ ◄──   │ score                │       │ input                │
│ url                  │ VIDEO │ progress_pct         │       │ output               │
│ duration_minutes     │ AUDIO │ created_at           │       │ provider             │
│ category             │ ARTICLE                      │       │ model                │
│ tags                 │       └──────────────────────┘       │ tokens_used          │
│ is_active            │                                      │ latency_ms           │
│ created_at           │                                      │ created_at           │
└──────────────────────┘                                      └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│        users         │       │    refresh_tokens    │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │───────│ id (PK)              │
│ email                │       │ user_id (FK)         │
│ password_hash        │       │ token                │
│ role                 │ ◄──   │ expires_at           │
│ is_active            │ SUPER_ADMIN                  │
│ last_login           │ ADMIN │ created_at           │
│ created_at           │ SUPERVISOR                   │
│ updated_at           │ EMPLOYEE                     │
└──────────────────────┘       └──────────────────────┘
```

## 📋 Table Definitions

### Core Tables

#### `organizations`
Central organization/company entity that owns all data.

```sql
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    industry_id     UUID REFERENCES industries(id),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    logo_url        TEXT,
    settings_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `employees`
Employee profiles with all relevant information.

```sql
CREATE TABLE employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id),
    user_id             UUID REFERENCES users(id),
    role_id             UUID NOT NULL REFERENCES employee_roles(id),
    type_id             UUID NOT NULL REFERENCES employee_types(id),
    employee_code       VARCHAR(50) UNIQUE,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(20),
    join_date           DATE NOT NULL,
    seniority_level     INTEGER DEFAULT 1,
    preferred_shift     VARCHAR(50), -- 'morning', 'evening', 'night', 'any'
    max_hours_per_week  INTEGER DEFAULT 40,
    avatar_url          TEXT,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_org ON employees(org_id);
CREATE INDEX idx_employees_role ON employees(role_id);
CREATE INDEX idx_employees_active ON employees(is_active) WHERE is_active = true;
```

#### `shifts`
Individual shift instances.

```sql
CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    template_id     UUID REFERENCES shift_templates(id),
    date            DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    min_staff       INTEGER DEFAULT 1,
    max_staff       INTEGER,
    is_published    BOOLEAN DEFAULT false,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_org_date ON shifts(org_id, date);
CREATE INDEX idx_shifts_published ON shifts(is_published) WHERE is_published = true;
```

#### `shift_assignments`
Links employees to shifts.

```sql
CREATE TABLE shift_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    shift_id        UUID NOT NULL REFERENCES shifts(id),
    date            DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'assigned', -- assigned, confirmed, completed, cancelled
    check_in_time   TIMESTAMP,
    check_out_time  TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, shift_id)
);

CREATE INDEX idx_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_assignments_date ON shift_assignments(date);
```

#### `leave_requests`
Leave/time-off requests.

```sql
CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    total_days      DECIMAL(4,1) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    reason          TEXT,
    documents       JSONB DEFAULT '[]',
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    rejection_reason TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);
```

#### `swap_requests`
Shift swap requests between employees.

```sql
CREATE TABLE swap_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id        UUID NOT NULL REFERENCES employees(id),
    target_id           UUID NOT NULL REFERENCES employees(id),
    requester_shift_id  UUID NOT NULL REFERENCES shift_assignments(id),
    target_shift_id     UUID NOT NULL REFERENCES shift_assignments(id),
    status              VARCHAR(20) DEFAULT 'pending', -- pending, target_approved, approved, rejected, cancelled
    reason              TEXT,
    target_response     VARCHAR(20), -- accepted, rejected
    target_responded_at TIMESTAMP,
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Supporting Tables

#### `cycle_patterns`
For 4-week repeating cycle support.

```sql
CREATE TABLE cycle_patterns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id),
    name                VARCHAR(100) NOT NULL,
    pattern_weeks       INTEGER DEFAULT 4, -- Number of weeks in cycle
    cycle_start_date    DATE NOT NULL, -- When the cycle begins
    pattern_json        JSONB NOT NULL, -- Week patterns
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example pattern_json:
-- {
--   "week1": {"roles": ["doctor"], "shifts": ["morning", "evening"]},
--   "week2": {"roles": ["doctor"], "shifts": ["night", "off"]},
--   ...
-- }
```

#### `rest_rules`
Configurable rest/compliance rules per industry/role.

```sql
CREATE TABLE rest_rules (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID NOT NULL REFERENCES organizations(id),
    role_id                 UUID REFERENCES employee_roles(id), -- NULL = applies to all
    min_rest_hours          INTEGER DEFAULT 11,
    max_consecutive_days    INTEGER DEFAULT 6,
    max_hours_per_week      INTEGER DEFAULT 48,
    max_hours_per_day       INTEGER DEFAULT 12,
    min_break_minutes       INTEGER DEFAULT 30,
    rules_json              JSONB DEFAULT '{}', -- Additional custom rules
    is_active               BOOLEAN DEFAULT true,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 MS Access Compatibility

For legacy MS Access support, we provide a sync mechanism:

```sql
-- Simplified view for MS Access export
CREATE VIEW v_access_roster AS
SELECT 
    e.employee_code,
    e.first_name || ' ' || e.last_name as full_name,
    er.name as role,
    s.date as shift_date,
    st.name as shift_type,
    s.start_time,
    s.end_time,
    sa.status
FROM shift_assignments sa
JOIN employees e ON sa.employee_id = e.id
JOIN employee_roles er ON e.role_id = er.id
JOIN shifts s ON sa.shift_id = s.id
LEFT JOIN shift_templates st ON s.template_id = st.id
WHERE e.is_active = true;
```

## 📊 Sample Data

```sql
-- Industries
INSERT INTO industries (name, code, default_rest_hours) VALUES
('Healthcare', 'HEALTHCARE', 11),
('Restaurant', 'RESTAURANT', 10),
('Retail', 'RETAIL', 10),
('Manufacturing', 'MANUFACTURING', 12),
('Security', 'SECURITY', 11),
('Call Center', 'CALL_CENTER', 10);

-- Employee Types
INSERT INTO employee_types (name, code, leave_multiplier) VALUES
('Fixed', 'FIXED', 1.0),
('Contract', 'CONTRACT', 0.8),
('Temporary', 'TEMPORARY', 0.5),
('Probation', 'PROBATION', 0.5);

-- Leave Types
INSERT INTO leave_types (name, code, default_days, is_paid, requires_doc) VALUES
('Annual Leave', 'ANNUAL', 14, true, false),
('Medical Leave', 'MEDICAL', 14, true, true),
('Emergency Leave', 'EMERGENCY', 3, true, false),
('Off-in-Lieu', 'OIL', 0, true, false),
('Training Leave', 'TRAINING', 5, true, false),
('Unpaid Leave', 'UNPAID', 0, false, false);
```

