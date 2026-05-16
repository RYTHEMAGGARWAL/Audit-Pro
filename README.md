# AuditPro - Internal Audit Management System

## Tech Stack
- **Frontend**: React, React Router, Axios, CSS
- **Backend**: Node.js, Express, JWT Auth
- **Database**: MongoDB Atlas

---

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env → add your MongoDB URI & JWT Secret
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

---

## Project Structure
```
project/
├── backend/
│   ├── models/       → User.js, Session.js
│   ├── routes/       → authRoutes, adminRoutes, sessionRoutes
│   ├── controllers/  → authController, adminController, sessionController
│   ├── middleware/   → authMiddleware (JWT + role check)
│   └── server.js
└── frontend/
    └── src/
        ├── context/  → AuthContext (global auth state)
        ├── pages/    → Login, Select, Dashboard, Admin
        └── App.js    → Routes
```

---

## API Endpoints

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | /api/auth/login | Public | Login |
| GET  | /api/auth/me | Protected | Get logged user |
| POST | /api/admin/create-user | Admin only | Create auditor |
| GET  | /api/admin/users | Admin only | List all users |
| POST | /api/session/select | Protected | Save context selection |

---

## Flow
1. User → Login → JWT token saved
2. Admin → `/admin` panel (create auditors)
3. Auditor → `/select` → Choose Company + FY + Business → `/dashboard`
