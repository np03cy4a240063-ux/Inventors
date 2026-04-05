# Inventors

# Inventory Management System (IMS)

A focused inventory stock management system built by a team of 4 developers.

## Tech Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: MySQL (mysql2)
- **Auth**: JWT + bcryptjs
- **Reports**: ExcelJS (Excel) + PDFKit (PDF)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env .env.local
# Edit .env with your MySQL credentials

# 3. Set up database
mysql -u root -p ims_db < database/schema.sql
mysql -u root -p ims_db < database/seed.sql

# 4. Start server
npm run dev
```

Then open `client/index.html` in your browser.
Default login: `admin@ims.com` / `admin123`

## Project Structure
```
inventory-management-system/
├── client/                  # Frontend
│   ├── pages/
│   │   ├── splash/          # Splash / loading screen
│   │   ├── auth/            # signin, signup, forgot/reset password
│   │   ├── dashboard/       # Main dashboard with KPIs
│   │   └── profile/         # Admin profile
│   ├── css/main.css         # Global styles
│   ├── js/api.js            # All fetch requests
│   └── js/main.js           # Shared helpers
├── server/                  # Backend (Express)
│   ├── config/db.js         # MySQL pool
│   ├── routes/              # API routes
│   ├── controllers/         # Request handlers
│   ├── models/              # DB query functions
│   ├── middleware/          # Auth middleware
│   └── utils/helpers.js
├── database/
│   ├── schema.sql           # Table structure
│   └── seed.sql             # Sample data
├── .env
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Sign in |
| POST | /api/auth/signup | Create account |
| POST | /api/auth/forgot-password | Request reset link |
| POST | /api/auth/reset-password | Reset password |
| GET  | /api/user/me | Get profile |
| PUT  | /api/user/me | Update profile |
| GET  | /api/inventory/summary | KPIs & stock summary |
| GET  | /api/inventory/products | All products |
| GET  | /api/inventory/products/top | Top selling |
| POST | /api/inventory/products | Add product |
| PUT  | /api/inventory/products/:id | Update product |
| DELETE | /api/inventory/products/:id | Delete product |
| GET  | /api/inventory/orders/pending | Pending orders |
| GET  | /api/report?from=&to=&format= | Export Excel/PDF |
