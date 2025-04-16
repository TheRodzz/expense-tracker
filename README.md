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
└── supabase_schema.sql
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

All schema, relationships, RLS (Row Level Security), and triggers for Supabase are provided in the [`supabase_schema.sql`](./supabase_schema.sql) file in the root of this repository.

> **To set up your Supabase database:**
> 1. Open your Supabase project.
> 2. Go to the SQL editor.
> 3. Copy and run the contents of [`supabase_schema.sql`](./supabase_schema.sql).

This will create all necessary tables, policies, and triggers for your expense tracker backend.

---

### (Optional) Populate Default Categories & Payment Methods

To automatically add some starter categories and payment methods for each new user, you can set up a trigger in Supabase. Below is an example trigger function you can adapt:

```sql
CREATE OR REPLACE FUNCTION public.insert_default_expense_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default categories for the new user
  INSERT INTO categories (user_id, name) VALUES
    (NEW.id, 'Food'), (NEW.id, 'Fitness'), (NEW.id, 'Shop'),
    (NEW.id, 'Grocery'), (NEW.id, 'Travel'), (NEW.id, 'Fun'),
    (NEW.id, 'Drinks'), (NEW.id, 'Invest'), (NEW.id, 'Health'),
    (NEW.id, 'Bills');

  -- Insert default payment methods for the new user
  INSERT INTO payment_methods (user_id, name) VALUES
    (NEW.id, 'UPI'), (NEW.id, 'Card'), (NEW.id, 'Cash'),
    (NEW.id, 'Wallet'), (NEW.id, 'Bank'), (NEW.id, 'Other');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach this trigger to the auth.users table if you want it to run on user signup:
-- (Supabase recommends using 'AFTER INSERT' on auth.users for onboarding hooks)
--
-- CREATE TRIGGER on_user_signup_defaults
-- AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.insert_default_expense_data();
```

> This is optional, but highly recommended for a better onboarding experience.
> You may need to adjust permissions or run this as an admin/service role.

```sql
description TEXT,
amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
payment_method_id UUID REFERENCES payment_methods(id) ON DELETE RESTRICT NOT NULL,
notes TEXT,
type expense_type NOT NULL,
created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own expenses" ON expenses
    FOR ALL
    USING (auth.uid() = user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_timestamp ON expenses(timestamp);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_payment_method_id ON expenses(payment_method_id);
CREATE INDEX idx_expenses_type ON expenses(type);

-- Trigger function to auto-update 'updated_at'
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_categories
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_payment_methods
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_expenses
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
```

> **Note:** All tables reference `auth.users.id` for user-level data isolation.

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
- Frontend: [http://localhost:3001](http://localhost:3001)
- Backend: [http://localhost:3000](http://localhost:3000)

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
