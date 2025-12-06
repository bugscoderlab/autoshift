# AutoShift Implementation Plan

## 📅 Development Timeline

### Phase 1: Foundation (Days 1-3)

#### Day 1: Project Setup
- [x] Initialize monorepo structure
- [x] Setup NestJS backend with TypeScript
- [x] Configure Prisma with PostgreSQL
- [x] Setup React + Vite + Tailwind for web
- [x] Setup Expo with Expo Router for mobile
- [x] Configure shared types package
- [x] Setup Docker compose for local dev

#### Day 2: Database & Auth
- [ ] Implement Prisma schema
- [ ] Run database migrations
- [ ] Implement JWT authentication
- [ ] Setup role-based access control
- [ ] Create auth guards and decorators
- [ ] Test auth flow end-to-end

#### Day 3: Core API
- [ ] Employee CRUD endpoints
- [ ] Shift templates endpoints
- [ ] Organization setup endpoints
- [ ] Role management endpoints
- [ ] Basic validation middleware

### Phase 2: Core Features (Days 4-7)

#### Day 4: Roster Management
- [ ] Shift creation and templates
- [ ] Shift assignment API
- [ ] Calendar view API
- [ ] Cycle pattern implementation

#### Day 5: Leave System
- [ ] Leave types configuration
- [ ] Leave request workflow
- [ ] Leave balance calculation
- [ ] Leave approval process

#### Day 6: Swap System
- [ ] Swap request creation
- [ ] Target employee response
- [ ] Admin approval workflow
- [ ] Swap execution logic

#### Day 7: Rule Engine
- [ ] Rest rules validation
- [ ] Staffing requirements checker
- [ ] Conflict detection
- [ ] Workload balancing

### Phase 3: AI Integration (Days 8-10)

#### Day 8: AI Services
- [ ] Claude API integration
- [ ] Groq API integration
- [ ] AI service router
- [ ] Prompt engineering

#### Day 9: AI Features
- [ ] Auto roster generation
- [ ] Natural language commands
- [ ] AI chatbot for queries
- [ ] Assignment explanations

#### Day 10: Upskill Module
- [ ] ElevenLabs TTS integration
- [ ] Lindy content summarization
- [ ] Learning content management
- [ ] Skill tracking

### Phase 4: Frontend (Days 11-14)

#### Day 11: Web Dashboard
- [ ] Authentication pages
- [ ] Dashboard layout
- [ ] Navigation structure
- [ ] Theme configuration

#### Day 12: Web Features
- [ ] Roster calendar view
- [ ] Employee management
- [ ] Leave management
- [ ] Swap management

#### Day 13: Mobile App
- [ ] Auth screens
- [ ] Tab navigation
- [ ] Shift view
- [ ] Leave request

#### Day 14: Mobile Features
- [ ] AI chatbot
- [ ] Push notifications
- [ ] Calendar integration
- [ ] Upskill module

### Phase 5: Polish & Deploy (Days 15-16)

#### Day 15: Testing & Fixes
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Security audit

#### Day 16: Deployment
- [ ] Docker production build
- [ ] Railway deployment
- [ ] Vercel deployment
- [ ] Mobile app build

## 📁 Folder Structure

```
AutoShift/
├── backend/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── employees/
│   │   │   ├── shifts/
│   │   │   ├── roster/
│   │   │   ├── leave/
│   │   │   ├── swap/
│   │   │   ├── workload/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   ├── ai/
│   │   │   └── upskill/
│   │   ├── core/
│   │   │   ├── database/
│   │   │   ├── config/
│   │   │   └── rule-engine/
│   │   └── common/
│   │       ├── guards/
│   │       ├── decorators/
│   │       ├── filters/
│   │       └── interceptors/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── test/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── web-frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── mobile-app/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── (auth)/
│   │   └── (tabs)/
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   ├── services/
│   ├── assets/
│   ├── app.json
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── shared/
│   ├── types/
│   └── constants/
│
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🎨 UI Wireframes

### Web Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔷 AutoShift                    🔔 │ 👤 Admin ▼                       │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│  📊 Dashboard│  ┌─────────────────────────────────────────────────────┐│
│              │  │         Monthly Roster - January 2024               ││
│  👥 Staff    │  │  ◀ Prev                                    Next ▶   ││
│              │  ├─────────────────────────────────────────────────────┤│
│  📅 Roster   │  │ Mon 1   │ Tue 2   │ Wed 3   │ Thu 4   │ Fri 5   │ ...││
│              │  │─────────┼─────────┼─────────┼─────────┼─────────┼────││
│  🏖️ Leave    │  │ 🌅 AM   │ 🌅 AM   │ 🌅 AM   │ 🌅 AM   │ 🌅 AM   │   ││
│              │  │ John D  │ Jane S  │ John D  │ Alice K │ Bob M   │   ││
│  🔄 Swaps    │  │ Jane S  │ Bob M   │ Alice K │ Jane S  │ John D  │   ││
│              │  │─────────┼─────────┼─────────┼─────────┼─────────┼────││
│  📈 Reports  │  │ 🌆 PM   │ 🌆 PM   │ 🌆 PM   │ 🌆 PM   │ 🌆 PM   │   ││
│              │  │ Alice K │ John D  │ Bob M   │ Bob M   │ Jane S  │   ││
│  🤖 AI Panel │  │─────────┼─────────┼─────────┼─────────┼─────────┼────││
│              │  │ 🌙 Night│ 🌙 Night│ 🌙 Night│ 🌙 Night│ 🌙 Night│   ││
│  ⚙️ Settings │  │ Bob M   │ Alice K │ Jane S  │ John D  │ Alice K │   ││
│              │  └─────────────────────────────────────────────────────┘│
│              │                                                          │
│              │  ┌──────────────────┐  ┌──────────────────┐             │
│              │  │ 📊 Quick Stats   │  │ ⚠️ Alerts        │             │
│              │  │ 45 employees     │  │ 3 understaffed   │             │
│              │  │ 12 on leave      │  │ 2 overtime       │             │
│              │  │ 8 pending swaps  │  │ 1 conflict       │             │
│              │  └──────────────────┘  └──────────────────┘             │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### Mobile App Screens

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  🏠 Home        │  │  📅 Schedule    │  │  🤖 AI Chat     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│                 │  │                 │  │                 │
│  Good morning,  │  │   January 2024  │  │  ┌───────────┐  │
│  Dr. John! 👋   │  │  ◀     ▶        │  │  │ Do I work │  │
│                 │  │                 │  │  │ tomorrow? │  │
│ ┌─────────────┐ │  │ S  M  T  W  T  F│  │  └───────────┘  │
│ │ Next Shift  │ │  │ 1  2  3  4  5  6│  │                 │
│ │             │ │  │ 🔵 ⚪ 🔵 ⚪ 🔵 ⚪│  │  ┌───────────┐  │
│ │ Tomorrow    │ │  │ 7  8  9 10 11 12│  │  │ Yes! You  │  │
│ │ 7:00 AM     │ │  │ ⚪ 🔴 🔵 ⚪ 🔵 ⚪│  │  │ have a    │  │
│ │ Morning     │ │  │                 │  │  │ morning   │  │
│ │ EDx Dept    │ │  │ 🔵 = Your shift │  │  │ shift at  │  │
│ └─────────────┘ │  │ 🔴 = Leave      │  │  │ 7:00 AM   │  │
│                 │  │                 │  │  └───────────┘  │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │                 │
│ │ Leave       │ │  │ │ Jan 15      │ │  │  Suggestions:   │
│ │ Balance     │ │  │ │ Morning     │ │  │  • My schedule  │
│ │             │ │  │ │ 7:00-15:00  │ │  │  • Leave days?  │
│ │ Annual: 9   │ │  │ │ EDx Dept    │ │  │  • Swap shift   │
│ │ Medical: 13 │ │  │ └─────────────┘ │  │                 │
│ └─────────────┘ │  │                 │  │ ┌─────────────┐ │
│                 │  │                 │  │ │ Type here...│ │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ 🏠  📅  🔄  📚  │  │ 🏠  📅  🔄  📚  │  │ 🏠  📅  🔄  📚  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 🚀 Quick Start Commands

```bash
# Clone and setup
cd AutoShift

# Install all dependencies
npm install

# Setup environment
cp .env.example .env

# Start database
docker-compose up -d postgres redis

# Run migrations
cd backend && npx prisma migrate dev

# Start backend
npm run dev

# Start web frontend (new terminal)
cd web-frontend && npm run dev

# Start mobile app (new terminal)
cd mobile-app && npx expo start
```

