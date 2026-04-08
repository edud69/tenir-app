# tenir.app

**La comptabilité simplifiée pour votre société de portefeuille.**
Simplified accounting for your holding company.

A full-stack SaaS application for small holding companies in Quebec/Canada. Upload receipts, track expenses and investments, project taxes, generate government forms, and get AI-powered accounting guidance — all in French and English.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (Postgres + Auth + Storage)
- **AI**: Anthropic Claude API (receipt OCR, tax assistant)
- **i18n**: next-intl (French default, English)
- **Charts**: Recharts

## Features

- **Receipt Upload + OCR** — Drag-and-drop receipts, AI extracts vendor, amount, date, GST/QST
- **Expense & Income Tracking** — Full transaction ledger with categories, recurring entries, tax deductions
- **Investment Portfolio** — ACB tracking, unrealized gains, dividend records (eligible/non-eligible)
- **Tax Projections** — Real 2024-2025 federal + Quebec corporate rates, RDTOH, GRIP, CDA, installments
- **Government Forms** — T2, CO-17, T5, RL-3 generation with correct CRA/Revenu Québec field codes
- **AI Assistant** — Claude-powered chatbot for tax and accounting questions
- **Bilingual** — Full French/English from day one

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/edud69/tenir-app.git
cd tenir-app
npm install

# 2. Set up environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase + Anthropic keys

# 3. Set up Supabase
# Create a project at https://supabase.com
# Run the migration in supabase/migrations/00001_initial_schema.sql

# 4. Run locally
npm run dev
# Open http://localhost:3000
```

## One-Command Deploy

```bash
./deploy.sh
```

This will install dependencies, build, create a GitHub repo, and deploy to Vercel.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., https://tenir.app) |

## Project Structure

```
src/
├── app/
│   ├── [locale]/           # i18n routing (fr/en)
│   │   ├── (auth)/         # Login, Signup
│   │   ├── (dashboard)/    # All protected pages
│   │   │   ├── dashboard/  # Main dashboard
│   │   │   ├── receipts/   # Receipt upload + OCR
│   │   │   ├── expenses/   # Transaction tracking
│   │   │   ├── investments/# Portfolio management
│   │   │   ├── taxes/      # Tax projections
│   │   │   ├── forms/      # Gov form generation
│   │   │   └── settings/   # Company config
│   │   └── page.tsx        # Landing page
│   └── api/
│       ├── ai/chat/        # AI assistant streaming
│       ├── receipts/ocr/   # Receipt OCR via Claude Vision
│       ├── taxes/calculate/ # Tax calculation engine
│       └── forms/generate/ # Form generation
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── layout/             # Sidebar, Header
│   └── assistant/          # AI chat widget
├── lib/                    # Supabase clients, utils
├── i18n/                   # Internationalization config
├── messages/               # FR/EN translations
└── types/                  # TypeScript types + DB schema
supabase/
└── migrations/             # Postgres schema with RLS
```

## License

Proprietary — © tenir.app
