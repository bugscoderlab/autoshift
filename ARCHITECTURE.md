# AutoShift - Modular Roster Planning System

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTOSHIFT ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │   Web Frontend  │    │   Mobile App    │    │        External Services        │  │
│  │  (React+Vite+   │    │ (Expo+RN+Expo   │    │  ┌─────────┐ ┌─────────────────┐│  │
│  │   Tailwind)     │    │    Router)      │    │  │ Claude  │ │   ElevenLabs    ││  │
│  │                 │    │                 │    │  │   API   │ │   (TTS)         ││  │
│  │  • Dashboard    │    │  • Shift View   │    │  └────┬────┘ └────────┬────────┘│  │
│  │  • Roster Grid  │    │  • Leave Req    │    │       │              │          │  │
│  │  • Staff Mgmt   │    │  • Swap Req     │    │  ┌────┴────┐ ┌───────┴────────┐│  │
│  │  • Analytics    │    │  • AI Chat      │    │  │  Groq   │ │    Lindy AI    ││  │
│  │  • AI Panel     │    │  • Calendar     │    │  │  (Fast) │ │  (Summaries)   ││  │
│  │                 │    │  • Skills Tab   │    │  └─────────┘ └────────────────┘│  │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────┬──────────────┘  │
│           │                      │                               │                  │
│           └──────────────────────┼───────────────────────────────┘                  │
│                                  │                                                  │
│                                  ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                         API GATEWAY / LOAD BALANCER                           │  │
│  │                              (nginx / traefik)                                │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                                  │
│                                  ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                     NESTJS BACKEND (Node.js + TypeScript)                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                           CORE MODULES                                  │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │  │
│  │  │  │   Auth   │ │ Employee │ │  Shift   │ │  Leave   │ │     Swap     │  │  │  │
│  │  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │    Module    │  │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │  │
│  │  │                                                                         │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │  │
│  │  │  │  Roster  │ │ Workload │ │  Report  │ │Notifictn │ │   AI/LLM     │  │  │  │
│  │  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │   Module     │  │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │  │
│  │  │                                                                         │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │                    RULE ENGINE (Scheduling Core)                 │  │  │  │
│  │  │  │  • Conflict Detection  • Fairness Algorithm  • Compliance Check │  │  │  │
│  │  │  │  • Minimum Staffing    • Rest Rules          • Cycle Patterns   │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                                  │
│           ┌──────────────────────┼──────────────────────┐                          │
│           ▼                      ▼                      ▼                          │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────────┐                │
│  │   PostgreSQL   │    │     Redis      │    │    MS Access       │                │
│  │  (Primary DB)  │    │   (Cache +     │    │  (Legacy Bridge)   │                │
│  │                │    │    Sessions)   │    │                    │                │
│  └────────────────┘    └────────────────┘    └────────────────────┘                │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                          BACKGROUND JOBS (Bull Queue)                         │  │
│  │   • Roster Generation  • Email Dispatch  • Push Notifications  • AI Tasks    │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Employee   │────▶│  Request     │────▶│   Backend    │
│   (Mobile)   │     │  (REST/WS)   │     │   (NestJS)   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     │                            │                            │
                     ▼                            ▼                            ▼
              ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
              │ Rule Engine  │           │  AI Layer    │           │   Database   │
              │              │           │ (Claude/Groq)│           │  (Postgres)  │
              │ • Validate   │           │              │           │              │
              │ • Conflicts  │           │ • Generate   │           │ • Persist    │
              │ • Fairness   │           │ • Explain    │           │ • Query      │
              └──────────────┘           └──────────────┘           └──────────────┘
                     │                            │                            │
                     └────────────────────────────┼────────────────────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │  Response    │
                                         │  + Events    │
                                         └──────────────┘
```

## 🏭 Industry Adaptability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INDUSTRY CONFIGURATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  HOSPITAL   │  │ RESTAURANT  │  │   RETAIL    │  │   FACTORY   │        │
│  │             │  │             │  │             │  │             │        │
│  │ Roles:      │  │ Roles:      │  │ Roles:      │  │ Roles:      │        │
│  │ • Doctor    │  │ • Head Chef │  │ • Manager   │  │ • Operator  │        │
│  │ • Nurse     │  │ • Sous Chef │  │ • Cashier   │  │ • Technician│        │
│  │ • Houseman  │  │ • Waiter    │  │ • Stocker   │  │ • Supervisor│        │
│  │             │  │ • Bartender │  │ • Security  │  │ • QC        │        │
│  │ Workloads:  │  │ Workloads:  │  │ Workloads:  │  │ Workloads:  │        │
│  │ • Resus     │  │ • Kitchen   │  │ • Floor     │  │ • Line A    │        │
│  │ • EDx       │  │ • Bar       │  │ • Checkout  │  │ • Line B    │        │
│  │ • AUC       │  │ • Floor     │  │ • Warehouse │  │ • Packing   │        │
│  │             │  │             │  │             │  │             │        │
│  │ Rest Rule:  │  │ Rest Rule:  │  │ Rest Rule:  │  │ Rest Rule:  │        │
│  │ 11 hours    │  │ 11 hours    │  │ 10 hours    │  │ 12 hours    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐                                          │
│  │  SECURITY   │  │ CALL CENTER │                                          │
│  │             │  │             │                                          │
│  │ Roles:      │  │ Roles:      │                                          │
│  │ • Guard     │  │ • Agent     │                                          │
│  │ • Supervisor│  │ • Team Lead │                                          │
│  │ • Patrol    │  │ • Supervisor│                                          │
│  │             │  │             │                                          │
│  │ Workloads:  │  │ Workloads:  │                                          │
│  │ • Gate A    │  │ • Phone     │                                          │
│  │ • Gate B    │  │ • Chat      │                                          │
│  │ • Patrol    │  │ • Email     │                                          │
│  └─────────────┘  └─────────────┘                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Web Frontend | React 18 + Vite + Tailwind CSS + Zustand | Admin dashboard, roster management |
| Mobile App | Expo SDK 51 + React Native + Expo Router + NativeWind | Employee self-service |
| Backend | NestJS + TypeScript + Prisma ORM | API, business logic, rule engine |
| Database | PostgreSQL (primary) + Redis (cache) | Data persistence, caching |
| Legacy Bridge | ODBC Driver | MS Access compatibility |
| AI Layer | Claude API + Groq + ElevenLabs + Lindy | Roster generation, TTS, summaries |
| Queue | Bull + Redis | Background job processing |
| Notifications | Expo Notifications + Nodemailer + Twilio | Push, email, SMS |
| Deployment | Docker + Railway/Vercel | Container orchestration |

## 📁 Project Structure

```
AutoShift/
├── backend/                      # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # Authentication & authorization
│   │   │   ├── employees/       # Employee management
│   │   │   ├── shifts/          # Shift types & templates
│   │   │   ├── roster/          # Roster generation & management
│   │   │   ├── leave/           # Leave management
│   │   │   ├── swap/            # Shift swap requests
│   │   │   ├── workload/        # Workload categories
│   │   │   ├── reports/         # Analytics & reporting
│   │   │   ├── notifications/   # Push, email, SMS
│   │   │   ├── ai/              # AI integration
│   │   │   └── upskill/         # Learning content
│   │   ├── core/
│   │   │   ├── rule-engine/     # Scheduling rules
│   │   │   ├── database/        # Prisma setup
│   │   │   └── config/          # App configuration
│   │   └── common/
│   │       ├── guards/          # Auth guards
│   │       ├── decorators/      # Custom decorators
│   │       └── interceptors/    # Response transformers
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   └── test/
│
├── web-frontend/                 # React Web App
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route pages
│   │   ├── layouts/             # Page layouts
│   │   ├── hooks/               # Custom hooks
│   │   ├── stores/              # Zustand stores
│   │   ├── services/            # API services
│   │   └── utils/               # Helper functions
│   └── public/
│
├── mobile-app/                   # Expo Mobile App
│   ├── app/                     # Expo Router pages
│   │   ├── (auth)/              # Auth screens
│   │   ├── (tabs)/              # Tab navigation
│   │   └── _layout.tsx          # Root layout
│   ├── components/              # Reusable components
│   ├── hooks/                   # Custom hooks
│   ├── stores/                  # Zustand stores
│   ├── services/                # API + AI services
│   └── assets/
│
├── shared/                       # Shared types & utilities
│   ├── types/                   # TypeScript interfaces
│   └── constants/               # Shared constants
│
├── docs/                         # Documentation
│   ├── API_SPEC.md
│   ├── DATABASE_SCHEMA.md
│   └── DEPLOYMENT.md
│
├── docker-compose.yml
└── README.md
```

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    JWT Authentication                    │   │
│  │  • Access Token (15min)  • Refresh Token (7 days)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Role-Based Access Control                 │   │
│  │                                                          │   │
│  │  SUPER_ADMIN ─┬─▶ Full system access                    │   │
│  │               │                                          │   │
│  │  ADMIN ───────┼─▶ Manage employees, roster, approvals   │   │
│  │               │                                          │   │
│  │  SUPERVISOR ──┼─▶ View team, approve swaps/leave        │   │
│  │               │                                          │   │
│  │  EMPLOYEE ────┴─▶ View own shifts, request leave/swap   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Seniority Override                     │   │
│  │  Senior staff can view junior staff schedules           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT OPTIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OPTION A: Railway + Vercel (Recommended)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Vercel    │  │   Railway   │  │   Railway   │             │
│  │   (Web +    │  │  (Backend)  │  │ (PostgreSQL │             │
│  │   Mobile    │  │             │  │  + Redis)   │             │
│  │   Web)      │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  OPTION B: Docker Compose (Self-hosted)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Docker Compose                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ nginx   │ │ backend │ │postgres │ │  redis  │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  OPTION C: Convex (Serverless)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          Convex Functions + Convex Database              │   │
│  │          (Alternative to traditional backend)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

