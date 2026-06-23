# MVSA Admin Console

Staff management panel for Mountain View Sports Arena.

> **Live URL**: [admin.mvsa.co.ke](https://admin.mvsa.co.ke)  
> **Supabase project**: `ojblrfrfzzslsbwvvaei`

---

## Overview

Next.js 14 (App Router) application serving role-based dashboards and management tools for MVSA staff. Supports five staff roles: `super_admin`, `boss`, `academy_coo`, `receptionist`, and `coach`.

See [ADMIN_SITE.md](../ADMIN_SITE.md) for the full page and feature inventory.  
See [ROLES.md](../ROLES.md) for the role permission matrix.

---

## Local Development

```bash
npm install
npm run dev     # http://localhost:3000
```

### Required `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://ojblrfrfzzslsbwvvaei.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

> `SUPABASE_SERVICE_ROLE_KEY` is used only by the `/api/staff/create` route. Never expose it in the browser.

---

## Key Directories

```
src/
├── app/
│   ├── (authenticated)/     # All role-gated pages
│   │   ├── page.tsx         # Dashboard router (role-based)
│   │   ├── bookings/
│   │   ├── walkins/
│   │   ├── venues/
│   │   ├── academy-operations/
│   │   │   ├── attendance/
│   │   │   └── assessments/
│   │   ├── programs/
│   │   ├── players/[id]/
│   │   ├── instructor/
│   │   ├── expenses/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── inquiries/
│   │   ├── staff/
│   │   └── settings/
│   ├── api/
│   │   └── staff/create/    # Service-role staff creation endpoint
│   └── login/
├── components/
│   ├── AuthContext.tsx       # Supabase session + staff profile state
│   ├── AuthGuard.tsx         # Client-side route permission enforcement
│   ├── Sidebar.tsx           # Role-filtered navigation
│   ├── Header.tsx            # Bell alerts, global search
│   ├── QuickLogModal.tsx     # Walk-in booking entry
│   └── dashboards/          # Per-role dashboard components
└── utils/
    └── supabase/             # Browser + server Supabase client helpers
```

---

## Build

```bash
npm run build    # TypeScript strict compilation
```

Zero TypeScript errors expected on `main`.
