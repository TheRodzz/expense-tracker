# Expense Tracker Frontend

A modern, responsive expense tracking application frontend built with **Next.js 15**, **React 19**, **TypeScript**, and **Tailwind CSS**. This project is designed for seamless user experience, robust data visualization, and easy extensibility.

---

## 🚀 Features

- **Expense Management:** Add, edit, delete, and categorize expenses.
- **Data Visualization:** Interactive charts powered by [Recharts](https://recharts.org/).
- **Modern UI:** Built with [Radix UI](https://www.radix-ui.com/) primitives and [Tailwind CSS](https://tailwindcss.com/).
- **Dark/Light Mode:** Theme switching with [next-themes](https://github.com/pacocoursey/next-themes).
- **Form Validation:** Using [react-hook-form](https://react-hook-form.com/).
- **Optimized Performance:** Next.js 15 with server-side rendering and static generation.
- **Type Safety:** Developed in TypeScript.
- **Dockerized:** Easy containerized deployment for production.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React 19](https://react.dev/), [Radix UI](https://www.radix-ui.com/), [Tailwind CSS](https://tailwindcss.com/)
- **State/Forms:** [react-hook-form](https://react-hook-form.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Theming:** [next-themes](https://github.com/pacocoursey/next-themes)
- **Linting:** ESLint, Prettier
- **Containerization:** Docker

---

## 📁 Directory Structure

```
frontend/
│
├── app/                # Main application pages (Next.js app directory)
├── components/         # Reusable UI components
├── context/            # React context providers
├── lib/                # Utility functions and libraries
├── public/             # Static assets (images, favicon, etc.)
├── styles/             # (If present) Global styles
├── package.json        # Project dependencies and scripts
├── next.config.ts      # Next.js configuration
├── Dockerfile          # Docker build instructions
└── ...
```

---

## ⚙️ Setup & Development

### 1. Prerequisites
- [Node.js 20+](https://nodejs.org/)
- [npm](https://www.npmjs.com/) (or [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/))

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```
Visit [http://localhost:3001](http://localhost:3001) to view the app.


---

## 🐳 Docker Usage

### Build and Run with Docker
```bash
docker build -t expense-tracker-frontend .
docker run -p 3001:3001 expense-tracker-frontend
```
The app will be available at [http://localhost:3001](http://localhost:3001).

---

## 🏗️ Building for Production
```bash
npm run build
npm start
```
Or use Docker as above for a production-ready container.

---

## 🔧 Customization
- **Environment Variables:** Add any required variables to `.env.local` (see Next.js docs).
- **UI:** Modify or extend components in `components/`.
- **Pages/Routes:** Add or edit routes in the `app/` directory.

---

## 📜 License
MIT

---

## 🙏 Acknowledgements
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Recharts](https://recharts.org/)
- [Lucide Icons](https://lucide.dev/)

---

For backend setup and integration, see the main project README or the backend directory.
