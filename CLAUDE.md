# Enterprises Hub — Claude Instructions

## What this project is
A UI shell that brings all enterprise apps (SAP, Teams, Jira, Salesforce, Adobe, etc.) into one browser window with a single Azure AD login. No custom AI, no data processing — just a clean, role-aware workspace.

## Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Auth:** Azure AD via MSAL (@azure/msal-browser)
- **DB:** Supabase (config storage, user/role mapping)
- **Hosting:** Vercel + enterprises-hub.de

## Design system
- **Primary font:** IBM Plex Sans (body), IBM Plex Mono (labels/code), Playfair Display (headings)
- **Colors:** `--paper: #F5F1EA` | `--ink: #0A0906` | `--red: #C8341A` | `--blue: #1A3AC8`
- **Style:** Editorial, minimal, no rounded corners on buttons, monospace labels

## Project structure
- `src/app/` — App Router pages and layouts
- `src/components/` — shared components (Navbar, Sidebar, AppTile, etc.)
- `src/lib/` — auth, supabase client, utilities
- `public/` — static assets
- `index.html` — landing page (served via GitHub Pages, do not modify with Next.js build)

## Key rules
- Always import shared components from `src/components/` — never recreate them
- Auth is handled via MSAL — never roll custom auth logic
- No AI features — if AI appears, it is Microsoft Copilot surfaced through existing integrations
- Keep `index.html` (landing page) separate from the Next.js app

## Work split (update as needed)
- **Abdul:** Auth, shell layout, admin panel
- **Colleague:** App tiles, user dashboard, settings page
