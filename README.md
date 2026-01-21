# Negotify Client

Frontend application for Negotify - SaaS platform for arbitration case management.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (State management)
- **Axios** (API client)
- **RTL Support** (Hebrew-first)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

3. Update `NEXT_PUBLIC_API_URL` to point to your backend

4. Run in development:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## Features

- **Role-based routing** - Different dashboards per role
- **RTL support** - Hebrew-first UI
- **Authentication** - JWT-based with persistent storage
- **Case management** - Create, view, and manage arbitration cases
- **Document management** - Upload, view, and download documents
- **Responsive design** - Works on all devices

## Pages

- `/` - Landing page
- `/login` - Login page
- `/register` - Registration via invitation token
- `/admin` - Admin dashboard (Admin only)
- `/arbitrator` - Arbitrator dashboard (Arbitrator only)
- `/lawyer` - Lawyer dashboard (Lawyer only)
- `/party` - Party dashboard (Party only)
- `/cases/[id]` - Case detail page

## Components

- `Layout` - Main layout with navigation and role-based access control
- More components can be added as needed

## State Management

- `authStore` - Authentication state (user, token, roles)

## API Integration

All API calls are centralized in `src/lib/api.ts`:
- `authAPI` - Authentication endpoints
- `casesAPI` - Case management
- `documentsAPI` - Document management
- `invitationsAPI` - Invitation system
- `usersAPI` - User management

