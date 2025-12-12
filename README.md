# AeroHandler - Flight Deck

Email: cyprienarmand@gmail.com
Psw: c

## Overview

AeroClub (AeroHandler) is an integrated web application aimed at managing all aspects of a flight school or aero club. Built for modern flight operations, the platform supports student, instructor, aircraft, bookings, and financial management, all through a responsive, intuitive UI.

---

## Features

- **Authentication**: Secure login system using Supabase Auth (email/password flow with session persistence, role-based checks)
- **Dashboard**: Multi-metric overview (students, bookings, flight hours, finances, health checks)
- **Student & Instructor Management**: Add/edit/delete members, track licenses, memberships, emergency info, flight experience
- **Aircraft Fleet Management**: Add/manage aircraft, view maintenance status and logs, fleet statistics
- **Booking System**: Visual schedule/calendar, daily/weekly grid, add/edit/cancel/overview bookings, instructor and plane assignment
- **Flight Log Entry & Review**: Submit, edit, and browse detailed flight logs (linked to aircraft & pilots)
- **Financials**:
  - Billing/invoicing, payments receivable/payable, transaction records, overdue and pending status
  - Rate management (hourly rates by aircraft/model, instructor/student, custom rates)
- **Settings/Customization**: In-app preferences for school settings, themes, notification preferences, flight & billing
- **Data Export & Backup**: Backup/download CSV (schedules, logs), manage data integrity easily
- **Security**: RLS on DB, access control, Supabase keys stored securely, session-based role enforcement
- **Responsive UI**: TailwindCSS, mobile-friendly
- **Modular/Extensible**: JS components/pages/modals for easy feature scaling

---

## Tech Stack & Code Structure

- **Frontend**: HTML (`app.html`, `login.html`), JS modules (`/js` with `pages/`, `components/`, `modals/`), TailwindCSS
- **Backend/Database**: Supabase (PostgreSQL as DB, Auth, RLS policies, storage); full SQL schema under `/sql/`
- **Key Directories**:
    - `js/`: Main logic (routing, modals, auth)
    - `js/pages/`: Each route/page (dashboard, bookings, flight_logs, students, instructors, finances, etc.)
    - `js/modals/`: Modals for add/edit operations on bookings, flights, students, instructors, rates
    - `js/components/`: UI and validator helpers (date pickers, notifications, etc.)
    - `sql/`: Setup scripts, schema (tables, enums, triggers, views), seeds, RLS
    - Individual HTMLs: `login.html` (auth), `app.html` (SPA main entry)

---

## Database Schema Summary

Key tables and entities (see full details in `/sql/full_sql.sql`):
- **users** (role, person_id, active/created info)
- **students, instructors, regular_pilots, maintenance_technicians, other_person**: Main member types
- **planes**, **plane_models**: Core fleet entities, categories, and status
- **bookings**: Scheduling with rich participant fields
- **flight_logs**: Linked to pilots, instructors, aircraft
- **maintenance**: Per-aircraft, tracks due/complete/status
- **billing_rates** / **financial_transactions**: Per model, type; tracks receivable/payable/payments
- **admin_roles**/**user_admin_roles**: Admin permission layers beyond member role

With numerous enums for roles, statuses, categories (see SQL for full range).

---

## Usage & Main Flows

- **Login**: `login.html` for authentication; session preserved, auto-redirect if logged in
- **Navigation**: Sidebar for dashboard, students, aircraft, bookings, logs, finance, settings
- **Booking/Calendar**: Visualize and edit bookings on schedule grid or in table view
- **Flight Log**: Add new logs from sidebar or from student/instructor detail pages
- **Students/Instructors**: Add, browse, filter, search, edit; see stats and recent flights
- **Financials**: View/manage invoices, transaction history, billing rates; mark payments as paid
- **Settings**: Global preferences, school config, billing, security, and appearance
- **Security**: Managed via Supabase session and DB RLS; logout fully clears session

---

## Setup & Deployment

1. **Clone repository**
2. **Install or host statically**: No server is required for the front-end—can serve `app.html` via any static server
3. **Supabase setup**:
    - Register DB/project on [Supabase.io](https://supabase.io)
    - Add keys to `js/supabase.js` (see current keys, set yours in production!)
    - Run SQL in `/sql/full_sql.sql` to initialize schema
    - Add seed/example data via `/sql/seed/`, `/sql/other/` if needed
4. **Environment**:
    - Keys/secrets must go in `js/supabase.js` (or load via env process in your deployment pipeline)
    - Confirm DB URL and ANON KEY for production use
5. **Open `app.html` in your browser to start!**

---

## Customization & Extending

- **Add Pages/Features**: Create new JS files in `js/pages/`, reference in route map in `main.js`
- **Create or update modals** in `js/modals/`, call from page scripts for add/edit flows
- **DB Schema**: Extend using `/sql/schema/*`, rerun against DB; maintain enums, indexes, triggers accordingly
- **Settings**: Add new options to `js/pages/settings.js` and reference them in the UI and your `localStorage` handlers

---

## Security & Backup Notes

- **Auth**: All critical actions require Supabase session
- **Role enforcement**: Actions in UI and DB have role checks
- **RLS policies**: Implemented on key tables (see `/sql/RLS/`)
- **Backups**: Download SQL dumps or use app interface for exports

---

## 🔒 Security Note: Database Schema

**Important:** For security compliance and to prevent the accidental exposure of sensitive configuration data, the `/sql/` directory referenced in this documentation is **not included** in the public repository.

* **Exclusion**: All SQL schemas, seed data, and migration scripts are strictly version-controlled in a private environment and excluded via `.gitignore`.
* **Setup**: If you are an authorized developer or administrator requiring database initialization scripts (e.g., `full_sql.sql`), please contact the repository owner or consult the internal secure documentation.
* **Credentials**: Never commit files containing real API keys or production database connection strings.

---

## Contributing & Support

- **Issues**: Use Issue Tracking module or GitHub Issues for this project
- **Requests/PRs**: Welcome—modular JS makes collaboration easy
- **License**: Proprietary / internal or MIT/Apache 2.0 (edit this section to your terms)
- **Help**: See `txt/help.txt` and `txt/SETUP.md` for advanced setup or troubleshooting

---

**AeroClub Flight Management: Built for rigorous, safe, and efficient club and flight school operations.**
