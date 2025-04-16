# Expense Tracker

**Open Source & Self-Hostable**  
This project is open source and designed to be self-hosted by anyone who wants full control over their expense data.

---

## 🙋 Motivation

This project was born out of pure frustration. I used to track my expenses using a Google Sheet hooked up to a Google Form—it worked well enough, with some graphs and quick entries. But one day, my Google Drive hit its storage limit, and suddenly, I couldn't update anything—not even my expense tracker. That’s when it hit me: I needed something better. Something I could fully control. So I built this—a clean, modern, self-hostable expense tracker that doesn’t depend on any third-party services, has no storage limits, and gives you full ownership from day one.

---

## 📜 Repository History

This repository is a combination of two previous repositories: one for the frontend and one for the backend. As a result, this monorepo does not contain the full commit history for either project. If you want to see the complete commit history, please refer to the original (now archived) repositories:
- [expense-tracker-backend](https://github.com/TheRodzz/expense-tracker-backend)
- [expense-tracker-frontend](https://github.com/TheRodzz/expense-tracker-frontend)

---

## 🚦 Project Structure

```
expense-tracker/
├── frontend/    # Next.js frontend (React 19, Tailwind CSS)
├── backend/     # Next.js backend (API routes, Supabase integration)
├── docker-compose.yml
├── README.md
└── supabase/
```

---

## 🛠️ Features
- User registration, login, logout (Supabase email/password auth)
- CRUD for expenses, categories, payment methods
- Analytics endpoints for summaries & charts
- CSRF protection, JWT-based auth (HTTP-only cookies)
- Dockerized for easy local and cloud deployment

---

## 🗄️ Supabase Setup

### 1. Create a Supabase Project
- Go to [Supabase](https://supabase.com/) and create a new project.
- Note your **Project URL**, **Anon Key**, and **Service Role Key** (for environment variables).

### 2. Database Tables & SQL Setup

All database schema, relationships, and RLS (Row Level Security) are managed as code using Supabase migrations in the [`supabase/`](./supabase/) directory.

> **To set up your Supabase database:**
> Follow the instructions in [`supabase/README.md`](./supabase/README.md) to initialize and migrate your database, both locally and on your remote Supabase project.

---

### 3. Auth Settings
- Enable **Email/Password** authentication in Supabase Auth settings.
- Forgot password is currently not functional
- Configure email templates and SMTP if you want to enable password reset.

---

## 🔑 Environment Variables

### Backend (`backend/.env.local`)
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🐳 Docker & Docker Compose

### 1. Prerequisites
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

### 2. Running the Full Stack
```bash
docker-compose up --build
```
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

### 3. Stopping
```bash
docker-compose down
```

---

## ⚡ Quickstart (Local Dev)
1. Clone this repo
2. Set up Supabase & env files as above
3. In `/backend` and `/frontend`:
    ```bash
    npm install
    npm run dev
    ```
4. Access frontend at [http://localhost:3001](http://localhost:3001)
5. Access backend at [http://localhost:3000](http://localhost:3000)

---

## 📚 More Documentation
- Frontend: [`frontend/README.md`](./frontend/README.md)
- Backend: [`backend/README.md`](./backend/README.md)
- API: [`backend/API_DOCUMENTATION.md`](./backend/API_DOCUMENTATION.md)

---

## ⚠️ Known Issues
- **Forgot Password:** Supabase email/password login works, but forgot password is not functional out-of-the-box. To enable, configure SMTP in Supabase project settings.

---

## 🙏 Acknowledgements
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Docker](https://www.docker.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

For questions or contributions, please open an issue or pull request!
