# TGROC Member Portal

A full-featured member management portal for **TGROC** (Telugu cultural organization), built with Next.js, TypeScript, Prisma ORM, and NextAuth.js.

---

## Features

### User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Create / activate / deactivate / delete users, update all profiles, full dashboard |
| **Office Bearer** | View members directory, read-only access to member profiles |
| **Member** | Login, view & update own profile, contact info, notification settings |

### Membership Types

| Type | Profile Details |
|------|----------------|
| **Individual** | First name, Last name, DOB (optional), Email, Phone |
| **Family** | Member details + Spouse + Kids |
| **Student – Individual** | Same as Individual |
| **Student – Family** | Same as Family |

### Authentication

- Email & password login
- **Google OAuth** social login
- **Facebook OAuth** social login
- Role-based route protection via middleware
- Pending account state (admin must activate new registrations)

---

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v4 (Credentials + Google + Facebook)
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env.local` and fill in your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tgroc_portal"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-long-random-secret"

# Google: https://console.cloud.google.com
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Facebook: https://developers.facebook.com
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Set Up Database

```bash
npm run db:migrate    # Run migrations
npm run db:generate   # Generate Prisma client
npx tsx prisma/seed.ts  # Seed initial admin user
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default admin credentials:**
- Email: `admin@tgroc.org`
- Password: `Admin@1234`  ← **Change immediately!**

---

## Social Login Setup

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → Create OAuth 2.0 Client ID
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID and Secret to `.env.local`

### Facebook OAuth

1. [Facebook Developers](https://developers.facebook.com) → Create App → Consumer
2. Add Facebook Login, set redirect: `http://localhost:3000/api/auth/callback/facebook`
3. Copy App ID and Secret to `.env.local`

---

## Project Structure

```
src/
├── app/
│   ├── auth/login|register|error    # Auth pages
│   ├── admin/users/                 # User management (Admin only)
│   ├── member/profile|contact|notifications  # Member self-service
│   ├── officer/members|profile      # Office bearer views
│   └── api/auth|register|users/    # API routes
├── components/
│   ├── dashboard-layout.tsx         # Shared sidebar + nav
│   └── ui.tsx                       # Reusable components
├── lib/auth.ts|db.ts|utils.ts|validations.ts
├── middleware.ts                    # Route protection
└── types/next-auth.d.ts
prisma/
├── schema.prisma
└── seed.ts
```

---

## Available Scripts

```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run db:migrate    # Run DB migrations
npm run db:generate   # Generate Prisma client
npm run db:studio     # Open Prisma Studio
```


```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
