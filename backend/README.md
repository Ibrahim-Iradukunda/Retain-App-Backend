# Retain Backend

Retain is a personal expense and monthly budget manager. This project contains the Node.js REST API and MongoDB persistence layer used by the Retain frontend.

## Deployed Application

- Frontend: https://retain-app-frontend.vercel.app
- Backend API: https://retain-app-backend.onrender.com
- Health check: https://retain-app-backend.onrender.com/api/health

The backend is deployed separately from the frontend. The frontend calls this API over HTTPS.

## Features

- JWT-based sign-up, sign-in, and authenticated requests; passwords are stored as bcrypt hashes.
- User-scoped expense and budget access.
- Expense creation, listing, update, and deletion, with search, filters, sorting, and pagination.
- Monthly budgets and personal dashboard summaries.
- Authenticated category browsing and admin-only category management.
- Admin-only platform insights, including expense totals, current-month recorded expenses, spending by category, most/least-used categories, and recent users and expenses.
- Category deletion is rejected when expenses still reference the category, avoiding dangling references.
- Request validation, JSON error responses, security headers, CORS allow-listing, and sign-in rate limiting.

## Technology

- Node.js, Express 5, and ES modules
- MongoDB Atlas with Mongoose
- JSON Web Tokens, bcryptjs, and Zod
- Helmet and CORS

## Local Setup

Requirements: Node.js 20 or newer and access to a MongoDB database.

From this directory, install dependencies and create a local environment file:

```powershell
npm install
Copy-Item .env.example .env
```

Set the values in `.env`:

| Variable         | Purpose                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| `PORT`           | Local API port; defaults to `4000`.                                       |
| `MONGODB_URI`    | MongoDB connection string for the Retain database.                        |
| `JWT_SECRET`     | Random signing secret of at least 32 characters.                          |
| `CORS_ORIGIN`    | Comma-separated, exact frontend origins; do not include trailing slashes. |
| `ADMIN_EMAIL`    | Optional email used by the admin bootstrap script.                        |
| `ADMIN_PASSWORD` | Optional bootstrap password; must be at least 14 characters.              |

Use a least-privilege MongoDB user with read/write access to the application database. URL-encode special characters in the connection-string password. Keep `.env` private and never commit or share its secrets.

Start the development server:

```powershell
npm run dev
```

The API listens on `http://localhost:4000` by default. Confirm startup at `http://localhost:4000/api/health`.

Run the backend checks with:

```powershell
npm test
```

## Admin Account Setup

Set `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the local environment, then run:

```powershell
npm run seed:admin
```

The script creates the admin account if it does not exist. If the email already exists, it promotes that account and resets its password. Confirm the database URI before running this command, especially if it points to production. Do not put admin credentials in frontend code.

## API

Protected endpoints require:

```http
Authorization: Bearer <JWT>
```

Sign-up and sign-in return `{ "token": "...", "user": { "id": "...", "name": "...", "email": "...", "role": "user|admin" } }`.

| Method   | Endpoint                            | Access    | Purpose                                                            |
| -------- | ----------------------------------- | --------- | ------------------------------------------------------------------ |
| `GET`    | `/api/health`                       | Public    | Service health check.                                              |
| `POST`   | `/api/auth/signup`                  | Public    | Create a user account.                                             |
| `POST`   | `/api/auth/signin`                  | Public    | Sign in and receive a JWT.                                         |
| `GET`    | `/api/auth/me`                      | Signed in | Return the current user.                                           |
| `GET`    | `/api/categories`                   | Signed in | List categories.                                                   |
| `POST`   | `/api/categories`                   | Admin     | Create a category.                                                 |
| `PATCH`  | `/api/categories/:id`               | Admin     | Update a category.                                                 |
| `DELETE` | `/api/categories/:id`               | Admin     | Delete an unused category; returns `409` if expenses reference it. |
| `GET`    | `/api/expenses`                     | Signed in | List the current user's expenses.                                  |
| `POST`   | `/api/expenses`                     | Signed in | Create an expense for the current user.                            |
| `PATCH`  | `/api/expenses/:id`                 | Signed in | Update the current user's expense.                                 |
| `DELETE` | `/api/expenses/:id`                 | Signed in | Delete the current user's expense.                                 |
| `GET`    | `/api/budgets?year=2026`            | Signed in | List the current user's budgets for a year.                        |
| `PUT`    | `/api/budgets`                      | Signed in | Create or update a monthly budget.                                 |
| `GET`    | `/api/dashboard?year=2026&month=10` | Signed in | Return personal monthly spending and budget summaries.             |
| `GET`    | `/api/admin/insights`               | Admin     | Return platform-wide metrics and recent activity.                  |

### Expense Listing

`GET /api/expenses` supports these query parameters:

- `page` and `limit` for pagination (`limit` is capped at 100).
- `search` for a case-insensitive title search.
- `category`, `paymentMethod`, `from`, and `to` for filtering.
- `minAmount` and `maxAmount` for amount filtering.
- `sortBy=date|amount` and `order=asc|desc` for sorting.

The response includes `expenses` and pagination metadata (`page`, `limit`, `total`, and `pages`). Both returned expenses and the count are scoped to the authenticated user.

### Admin Insights Response

`GET /api/admin/insights` requires a valid JWT for a user with the `admin` role. It returns:

- `registeredUsers`, `expenseCount`, and `totalSpending` for the whole platform.
- `currentMonthExpenseCount`, based on expense `createdAt` timestamps in the current UTC month.
- `categoryStats` for all categories, including unused categories, with `{ category, color, total, count }` fields.
- `topCategories` and `bottomCategories`, ranked by expense count and limited to five each.
- `recentUsers` and `recentExpenses`.

Common errors use JSON responses: `400` for invalid input, `401` for missing/invalid authentication, `403` for insufficient role, `404` for missing resources, and `409` for conflicts such as deleting a category in use.

## Deployment

The backend is deployed on Render. Configure the service with:

- Build command: `npm install`
- Start command: `npm start`
- `MONGODB_URI`: production MongoDB connection string.
- `JWT_SECRET`: a private random value of at least 32 characters.
- `CORS_ORIGIN`: `https://retain-app-frontend.vercel.app` (add other exact trusted origins as comma-separated values when needed).

Render provides `PORT`; the server uses it automatically. After changing environment variables or backend code, redeploy the Render service. Never expose `MONGODB_URI` or `JWT_SECRET` to the frontend.
