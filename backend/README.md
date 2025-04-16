# Expense Tracker Backend

A robust, secure, and extensible backend for the Expense Tracker application, built with **Next.js 15**, **TypeScript**, and **Supabase**. This backend handles authentication, expense management, analytics, and more, with a RESTful API and strong security practices.

---

## 🚀 Features
- **User Authentication:** Signup, login, logout (JWT-based, via cookies)
- **CSRF Protection:** Secure state-changing requests
- **Expense Management:** CRUD for expenses, categories, payment methods
- **Analytics Endpoints:** Summarized data for reporting and charts
- **RESTful API:** Well-documented endpoints (see `API_DOCUMENTATION.md`)
- **Type Safety:** Developed in TypeScript
- **Testing:** Includes test setup with Vitest and Supertest
- **Dockerized:** Easy containerized deployment

---

## 🛠️ Tech Stack
- **Framework:** [Next.js 15](https://nextjs.org/) (API routes)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL, auth)
- **ORM/Validation:** [Zod](https://zod.dev/) for schemas
- **Testing:** [Vitest](https://vitest.dev/), [Supertest](https://github.com/ladjs/supertest)
- **Linting:** ESLint
- **Containerization:** Docker

---

## 📁 Directory Structure
```
backend/
│
├── app/                # Next.js app directory (API routes, pages)
│   └── api/            # All backend API endpoints
├── lib/                # Utility libraries (Supabase, Zod schemas, CSRF, etc.)
├── public/             # Static assets
├── test.py             # (If present) Test scripts
├── package.json        # Project dependencies and scripts
├── Dockerfile          # Docker build instructions
├── .env, .env.local    # Environment variables (DO NOT COMMIT secrets)
└── ...
```

---

## ⚙️ Setup & Development

### 1. Prerequisites
- [Node.js 20+](https://nodejs.org/)
- [npm](https://www.npmjs.com/) (or [yarn](https://yarnpkg.com/))
- [Supabase](https://supabase.com/) project (for database & auth)

### 2. Environment Variables
Create a `.env.local` file (see `.env` for example keys):
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
...other config
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Development Server
```bash
npm run dev
```
The backend will run at [http://localhost:3000](http://localhost:3000).

---

## 🐳 Docker Usage
### Build and Run with Docker
```bash
docker build -t expense-tracker-backend .
docker run -p 3000:3000 --env-file .env.local expense-tracker-backend
```

---

## 🏗️ Building for Production
```bash
npm run build
npm start
```
Or use Docker as above for a production-ready container.

---

## 🔒 Security
- **Authentication:** JWT (stored in HTTP-only cookies)
- **CSRF Protection:** All state-changing endpoints require the `X-CSRF-Token` header (see API docs)
- **CORS:** Configured for secure cross-origin requests (see `next.config.ts`)
- **.env:** NEVER commit secrets to version control

---

## 📚 API Documentation
Full API details (endpoints, request/response, auth, CSRF) are in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

Main endpoint groups:
- `/api/auth/*` — Signup, login, logout
- `/api/categories/*` — Manage categories
- `/api/expenses/*` — Manage expenses
- `/api/payment_methods/*` — Manage payment methods
- `/api/analytics/*` — Analytics endpoints

---

## 🔧 Customization & Extensibility
- **Database:** Edit Supabase schemas as needed
- **Endpoints:** Add/modify API routes in `app/api/`
- **Validation:** Update Zod schemas in `lib/zod/`
- **Middleware:** See `middleware.ts` for auth & CSRF logic

---

## 📜 License
MIT (or specify your license here)

---

## 🙏 Acknowledgements
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Zod](https://zod.dev/)
- [Vitest](https://vitest.dev/)
- [Supertest](https://github.com/ladjs/supertest)

---

For frontend setup and integration, see the main project README or the frontend directory.
