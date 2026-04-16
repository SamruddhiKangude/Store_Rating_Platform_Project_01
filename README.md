# Store Rating Platform

A full-stack web application designed for store ratings.
This project uses **Next.js** for the frontend and a custom **Express.js** API for the backend, communicating with a **MySQL** database via raw SQL queries (Prisma ORM has been completely removed).

## Tech Stack

- **Frontend**: Next.js (React 19), TailwindCSS
- **Backend API**: Express.js
- **Database**: MySQL (using `mysql2` driver)
- **Running tools**: `concurrently` (runs frontend and backend together)

---

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **MySQL Server** installed and running on `localhost:3306`.
3. A local MySQL database named **`abc`**.
   - Default credentials expected in `src/lib/db.ts`: User: `root`, Password: `root`.

---

## Setup & Installation

**1. Install dependencies**

```bash
npm install
```

**2. Initialize the Database**
This script will automatically create the required tables (`User`, `Store`, `Rating`).

```bash
npx tsx init-db.ts
```

**3. Seed Default Users**
This script will populate the database with default test accounts.

```bash
npx tsx seed-users.ts
```

---

## Running the Application

To start both the Next.js frontend (port 3000) and the Express backend (port 3001) simultaneously:

```bash
npm run dev
```

The application will be accessible at: [http://localhost:3000](http://localhost:3000)

---

## Test Credentials

Use these credentials to test the various roles in the application. (Password for all is `Admin@123`)

| Role            | Email                   | Password    |
| :-------------- | :---------------------- | :---------- |
| **Admin**       | `admin@storerating.com` | `Admin@123` |
| **Store Owner** | `owner@storerating.com` | `Admin@123` |
| **User**        | `user@storerating.com`  | `Admin@123` |

---

## Recent Architectural Changes

- **Removed Prisma**: The project was migrated away from Prisma ORM to raw `mysql2` promises for better control over SQL execution.
- **Express Backend**: Replaced Next.js App Router API routes with a dedicated Express.js backend (`server.ts`).
- **Development Proxy**: Next.js automatically proxies `/api/*` requests to the Express server running on port `3001` to prevent CORS issues.
