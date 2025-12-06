# 🗓️ AutoShift - Intelligent Roster Planning System

A comprehensive, AI-powered roster planning system designed for multi-industry scheduling including healthcare, restaurants, retail, manufacturing, security, and call centers.

## ✨ Features

### Core Functionality
- **Employee Management** - Complete CRUD with roles, types, seniority, preferences
- **Shift Management** - Templates, assignments, cycle patterns (4-week repeating)
- **Leave Management** - Annual, medical, emergency, off-in-lieu, training
- **Swap System** - Employee-initiated with supervisor approval workflow
- **Workload Balancing** - Configurable categories per industry
- **Rule Engine** - Minimum rest hours, max consecutive days, staffing requirements

### AI-Powered Features
- **Auto Roster Generation** - Claude-powered scheduling with constraint satisfaction
- **Natural Language Commands** - "Move Dr. John to more morning shifts"
- **AI Chatbot** - "Do I work tomorrow?", "How many leave days left?"
- **Assignment Explanations** - AI-generated reasoning for schedule decisions
- **Upskill Module** - ElevenLabs TTS, Lindy summaries, learning recommendations

### Multi-Platform
- **Web Dashboard** - React + Tailwind with modern dark theme
- **Mobile App** - Expo + React Native with Expo Router

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
│   ┌─────────────────┐    ┌─────────────────────────────────┐   │
│   │   Web Frontend  │    │        Mobile App               │   │
│   │  React + Vite   │    │   Expo + React Native           │   │
│   │   + Tailwind    │    │   + Expo Router + NativeWind    │   │
│   └────────┬────────┘    └───────────────┬─────────────────┘   │
└────────────┼─────────────────────────────┼─────────────────────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS Backend                               │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │  Auth   │ │Employee │ │  Shift  │ │  Leave  │ │   Swap  │  │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│   │ Roster  │ │ Reports │ │   AI    │ │Notific. │ │ Upskill │  │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                     ┌─────────────────┐                        │
│                     │   Rule Engine   │                        │
│                     └─────────────────┘                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────────┐
    │PostgreSQL│      │  Redis   │      │   AI APIs    │
    │          │      │          │      │Claude/Groq/  │
    │          │      │          │      │ElevenLabs    │
    └──────────┘      └──────────┘      └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/autoshift.git
cd autoshift

# Install backend dependencies
cd backend
npm install
cp .env.example .env  # Configure environment variables

# Run database migrations
npx prisma migrate dev

# Start backend
npm run dev

# Install web frontend (new terminal)
cd ../web-frontend
npm install
npm run dev

# Install mobile app (new terminal)
cd ../mobile-app
npm install
npx expo start
```

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📁 Project Structure

```
AutoShift/
├── backend/                  # NestJS Backend
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   ├── core/            # Database, config, rule engine
│   │   └── common/          # Guards, decorators
│   └── prisma/              # Database schema
│
├── web-frontend/            # React Web App
│   └── src/
│       ├── pages/           # Route pages
│       ├── layouts/         # Page layouts
│       ├── stores/          # Zustand stores
│       └── services/        # API services
│
├── mobile-app/              # Expo Mobile App
│   └── app/                 # Expo Router pages
│       ├── (auth)/          # Auth screens
│       └── (tabs)/          # Tab navigation
│
└── docs/                    # Documentation
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── API_SPECIFICATION.md
    ├── ROSTER_ALGORITHM.md
    ├── AI_INTEGRATION.md
    └── IMPLEMENTATION_PLAN.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `ANTHROPIC_API_KEY` | Claude API key | For AI features |
| `GROQ_API_KEY` | Groq API key | For fast AI queries |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | For TTS |

## 🏭 Industry Configurations

AutoShift supports multiple industries out-of-the-box:

| Industry | Workload Categories | Default Rest Hours |
|----------|--------------------|--------------------|
| Healthcare | Resus, EDx, AUC, Triage | 11 hours |
| Restaurant | Kitchen, Bar, Floor | 10 hours |
| Retail | Floor, Checkout, Warehouse | 10 hours |
| Manufacturing | Line A, Line B, Packing | 12 hours |
| Security | Gate A, Gate B, Patrol | 11 hours |
| Call Center | Phone, Chat, Email | 10 hours |

## 📊 API Documentation

Once the backend is running, access Swagger docs at:
```
http://localhost:3000/api/docs
```

## 🧪 Testing

```bash
# Backend unit tests
cd backend
npm run test

# Backend e2e tests
npm run test:e2e
```

## 🚢 Deployment

### Railway (Recommended)

1. Connect your GitHub repository
2. Add environment variables
3. Deploy!

### Vercel (Frontend)

1. Import web-frontend directory
2. Set build command: `npm run build`
3. Deploy!

### Mobile App

```bash
# Build for production
cd mobile-app
npx expo build:android
npx expo build:ios
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

Built with ❤️ for shift workers everywhere
