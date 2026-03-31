# TGROC Member Portal — Architecture Documentation

**Tamils of Greater Rochester (TGROC) Community Member Portal**  
Stack: Next.js 16 · TypeScript · PostgreSQL · Prisma · NextAuth v4 · Tailwind CSS v4

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Application Architecture](#2-application-architecture)
3. [Source Code Structure](#3-source-code-structure)
4. [Data Architecture](#4-data-architecture)
5. [Data Model Diagram](#5-data-model-diagram)
6. [API Reference](#6-api-reference)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [System Flows](#8-system-flows)
9. [UI Component Library](#9-ui-component-library)
10. [Configuration & Environment Variables](#10-configuration--environment-variables)

---

## 1. Application Overview

The TGROC Member Portal is a full-stack web application for managing community membership, cultural events, and member engagement. It supports three distinct user roles with tailored dashboards, and also serves a public-facing event RSVP and performance registration experience.

### Core Capabilities

| Domain | Features |
|---|---|
| **Membership** | Self-registration, admin activation, profile management, family member tracking, membership tiers, expiry alerts |
| **Authentication** | Email/password + Google + Facebook OAuth, JWT sessions, role-based access control, middleware-level route protection |
| **Events** | Event creation with poster upload, RSVP collection (members + guests), item-bring assignments, performance registrations |
| **Event Pricing** | Free or paid entry, family-tier or individual-tier fees, member discount pricing, payment instructions |
| **Fee Reminders** | Email reminders to confirmed RSVPs including full fee breakdown; reminder history log |
| **Membership Fees** | Per-type fee configuration with effective-date history |
| **Notifications** | Per-user preference flags for email, SMS, newsletters, event reminders, and membership alerts |

---

## 2. Application Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Public Pages │  │  Auth Pages  │  │  Portal (By Role) │  │
│  │ / (landing)  │  │ /auth/login  │  │  /admin/*         │  │
│  │ /events/[id] │  │ /auth/reg.   │  │  /officer/*       │  │
│  │ /events/[id] │  │ /auth/error  │  │  /member/*        │  │
│  │  /perform    │  │ /restricted  │  │  /events/manage/* │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP (Next.js App Router)
┌─────────────────────────────▼───────────────────────────────┐
│                    Next.js Server (Node.js)                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Middleware (proxy.ts)                │    │
│  │   Route protection · Role enforcement · Redirects   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     API Routes                         │ │
│  │  /api/auth  /api/register  /api/users  /api/events     │ │
│  │  /api/membership-fees  /api/events/[id]/pricing        │ │
│  │  /api/events/[id]/rsvp  /api/events/[id]/fee-reminder  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  NextAuth v4 │  │    Prisma    │  │    Nodemailer     │  │
│  │  JWT · OAuth │  │     ORM      │  │   SMTP Email      │  │
│  └──────────────┘  └──────┬───────┘  └───────────────────┘  │
└──────────────────────────┬┴────────────────────────────────┘
                           │                 │
               ┌───────────▼──────┐   ┌──────▼────────────────┐
               │   PostgreSQL DB  │   │  Local Filesystem     │
               │  (tgroc_portal)  │   │  public/uploads/      │
               └──────────────────┘   │  events/              │
                                      └───────────────────────┘
```

### Technology Choices

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 | Full-stack React, file-based routing, server components |
| Language | TypeScript | ^5 | Type safety, IDE support |
| UI | React | 19.2.4 | Component-based UI |
| Styling | Tailwind CSS | ^4 | Utility-first, no separate CSS files |
| Icons | Lucide React | ^1.7.0 | Consistent icon set |
| ORM | Prisma | 5.22.0 | Type-safe DB client with migration support |
| Database | PostgreSQL | — | Relational data with complex joins |
| Auth | NextAuth v4 | ^4.24.13 | Multi-provider auth with JWT strategy |
| Validation | Zod | ^4.3.6 | Schema validation on API inputs |
| Forms | React Hook Form | ^7.72.0 | Client-side form state management |
| Email | Nodemailer | ^7.0.13 | SMTP email delivery |
| Password | bcryptjs | ^3.0.3 | Secure password hashing |
| Date utils | date-fns | ^4.1.0 | Date formatting helpers |

### Rendering Strategy

The application uses a hybrid rendering approach:

- **Server Components (RSC):** Admin dashboard (`/admin/page.tsx`) performs direct DB queries via Prisma. Avoids an API round-trip for initial data.
- **Client Components (`"use client"`):** All interactive pages — forms, tables with sorting, evite RSVP, event management — run in the browser. Data is fetched via `useEffect` calling the Next.js API routes.
- **API Routes:** All data mutation and sensitive reads go through `/api/**` handlers with full auth checks and Zod validation.

---

## 3. Source Code Structure

```
c:\Source\TGROC\
│
├── prisma/
│   ├── schema.prisma          # DB schema: models, enums, relations
│   ├── seed.ts                # Seeds default admin user
│   └── migrations/            # Timestamped SQL migration files
│       ├── 20260326104717_initial_creation/
│       ├── 20260327005730_add_a_new_column_in_members_for_expiry/
│       ├── 20260327185031_add_events/
│       ├── 20260328012814_add_event_poster/
│       ├── 20260328020046_add_event_items/
│       ├── 20260328030000_split_guest_count/
│       ├── 20260330010005_performance_registrations/
│       └── 20260331124517_add_event_pricing_and_fee_reminders/
│
├── public/
│   └── uploads/
│       └── events/            # Event poster images (uploaded via API)
│
└── src/
    ├── proxy.ts               # Next.js Middleware (route protection + RBAC)
    │
    ├── app/                   # Next.js App Router root
    │   ├── globals.css        # Tailwind base + global styles
    │   ├── layout.tsx         # Root layout: SessionProvider, font, metadata
    │   ├── page.tsx           # Public landing page
    │   │
    │   ├── auth/
    │   │   ├── login/page.tsx         # Login form (credentials + social)
    │   │   ├── register/page.tsx      # Member self-registration
    │   │   └── error/page.tsx         # NextAuth error display
    │   │
    │   ├── restricted/page.tsx        # Shown to INACTIVE/PENDING users
    │   │
    │   ├── admin/                     # ADMIN-only pages
    │   │   ├── page.tsx               # Admin dashboard (server component)
    │   │   ├── profile/page.tsx       # Admin's own profile
    │   │   └── users/
    │   │       ├── page.tsx           # User list with search + filters
    │   │       ├── new/page.tsx       # Create user form
    │   │       └── [id]/
    │   │           ├── page.tsx       # User detail view
    │   │           └── edit/page.tsx  # Edit user form
    │   │
    │   ├── officer/                   # ADMIN + OFFICE_BEARER pages
    │   │   ├── page.tsx               # Officer dashboard
    │   │   ├── profile/page.tsx       # Officer's own profile
    │   │   └── members/page.tsx       # Read-only members directory
    │   │
    │   ├── member/                    # MEMBER pages
    │   │   ├── page.tsx               # Member dashboard
    │   │   ├── profile/page.tsx       # Edit own profile + family members
    │   │   ├── contact/page.tsx       # Edit own contact info
    │   │   ├── events/page.tsx        # Browse published events
    │   │   └── notifications/page.tsx # Notification preferences
    │   │
    │   ├── events/
    │   │   ├── [id]/
    │   │   │   ├── page.tsx           # Public evite: details + RSVP form
    │   │   │   └── perform/page.tsx   # Public performance registration
    │   │   └── manage/                # ADMIN + OFFICE_BEARER
    │   │       ├── page.tsx           # Event list
    │   │       ├── new/page.tsx       # Create event form
    │   │       └── [id]/
    │   │           ├── page.tsx       # Event dashboard (RSVPs, items, perf, pricing, reminders)
    │   │           └── edit/page.tsx  # Edit event + poster
    │   │
    │   ├── fees/page.tsx              # Membership fee configuration
    │   │
    │   └── api/                       # Next.js API Route handlers
    │       ├── auth/[...nextauth]/route.ts
    │       ├── register/route.ts
    │       ├── users/
    │       │   ├── route.ts           # GET list, POST create
    │       │   └── [id]/
    │       │       ├── route.ts       # GET, PATCH, DELETE
    │       │       └── family/
    │       │           ├── route.ts             # GET list, POST add
    │       │           └── [memberId]/route.ts  # PATCH, DELETE
    │       ├── membership-fees/route.ts
    │       └── events/
    │           ├── route.ts           # GET list, POST create
    │           └── [id]/
    │               ├── route.ts       # GET, PATCH, DELETE
    │               ├── rsvp/route.ts
    │               ├── items/
    │               │   ├── route.ts
    │               │   └── [itemId]/route.ts
    │               ├── poster/route.ts
    │               ├── performances/route.ts
    │               ├── pricing/route.ts
    │               └── fee-reminder/route.ts
    │
    ├── components/
    │   ├── providers.tsx        # SessionProvider wrapper
    │   ├── dashboard-layout.tsx # Sidebar + top bar shell (role-aware nav)
    │   └── ui.tsx               # Reusable UI primitives
    │
    ├── lib/
    │   ├── db.ts          # Prisma singleton
    │   ├── auth.ts        # NextAuth configuration
    │   ├── email.ts       # Nodemailer SMTP utility
    │   ├── utils.ts       # cn(), formatDate(), label helpers
    │   └── validations.ts # Zod schemas for all forms
    │
    └── types/
        └── next-auth.d.ts  # Extends NextAuth Session/User/JWT types
```

---

## 4. Data Architecture

### Database

- **Engine:** PostgreSQL
- **ORM:** Prisma 5.22 with generated type-safe client
- **Database name:** `tgroc_portal`
- **Connection:** `DATABASE_URL` environment variable (standard PostgreSQL connection string)
- **Migrations:** Prisma Migrate with timestamped SQL files under `prisma/migrations/`

### Enumerations

| Enum | Values | Used On |
|---|---|---|
| `Role` | `ADMIN`, `OFFICE_BEARER`, `MEMBER` | `User.role` |
| `UserStatus` | `ACTIVE`, `INACTIVE`, `PENDING` | `User.status` |
| `MembershipType` | `INDIVIDUAL`, `FAMILY`, `STUDENT_INDIVIDUAL`, `STUDENT_FAMILY` | `User.membershipType`, `MembershipFee.membershipType` |
| `FamilyRelation` | `SPOUSE`, `CHILD` | `FamilyMember.relationship` |
| `EventStatus` | `DRAFT`, `PUBLISHED`, `CANCELLED` | `Event.status` |
| `RsvpStatus` | `YES`, `NO`, `MAYBE` | `EventRsvp.attending` |
| `PerformanceType` | `SINGING`, `DANCE`, `SKIT`, `POEM_RECITAL`, `QUIZ`, `STANDUP` | `PerformanceRegistration.performanceType` |
| `MicType` | `STANDING`, `HANDHELD` | `PerformanceRegistration.micType` |
| `EventFeeType` | `FAMILY`, `INDIVIDUAL` | `EventPricing.feeType` |

### Domain Models

#### User & Identity

**`User`** — Core identity record. Every person in the system is a User.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `email` | `String` | Unique |
| `emailVerified` | `DateTime?` | Set by NextAuth on OAuth |
| `name` | `String?` | Display name |
| `image` | `String?` | Avatar URL from OAuth providers |
| `password` | `String?` | bcrypt hash; null for social-only users |
| `role` | `Role` | Default: `MEMBER` |
| `status` | `UserStatus` | Default: `PENDING` |
| `membershipType` | `MembershipType?` | Null until set by admin |
| `membershipExpiry` | `DateTime?` | Optional expiry tracking |
| `createdAt` | `DateTime` | Auto |
| `updatedAt` | `DateTime` | Auto |

**`Profile`** — Personal details (one-to-one with User).

| Field | Type | Notes |
|---|---|---|
| `userId` | `String` | Unique FK → User |
| `firstName` | `String` | — |
| `lastName` | `String` | — |
| `dateOfBirth` | `DateTime?` | — |
| `phone` | `String?` | — |

**`FamilyMember`** — Dependents attached to a family-tier User.

| Field | Type | Notes |
|---|---|---|
| `userId` | `String` | FK → User |
| `relationship` | `FamilyRelation` | `SPOUSE` or `CHILD` |
| `firstName`, `lastName` | `String` | — |
| `dateOfBirth` | `DateTime?` | — |
| `email`, `phone` | `String?` | — |

**`ContactInfo`** — Mailing address (one-to-one with User).

**`NotificationSettings`** — Per-user notification preferences (one-to-one with User).

| Field | Default | Meaning |
|---|---|---|
| `emailNotifications` | `true` | General emails |
| `smsNotifications` | `false` | SMS alerts |
| `newsletterSubscribed` | `true` | Community newsletters |
| `eventReminders` | `true` | Upcoming event alerts |
| `membershipAlerts` | `true` | Expiry warnings |

#### Membership Fees

**`MembershipFee`** — Records the fee amount for a given membership type across a date range. Supports historical versioning: a null `effectiveTo` means the fee is currently active. When a new fee is created, the previous open record is auto-closed (its `effectiveTo` is set to `newEffectiveFrom - 1 day`).

| Field | Type | Notes |
|---|---|---|
| `membershipType` | `MembershipType` | Which tier this fee applies to |
| `amount` | `Decimal(10,2)` | Dollar amount |
| `effectiveFrom` | `DateTime` | Start of this rate |
| `effectiveTo` | `DateTime?` | End; null = still active |
| `notes` | `String?` | Admin notes |

#### Events

**`Event`** — Cultural events organized by TGROC.

| Field | Type | Notes |
|---|---|---|
| `name` | `String` | — |
| `description` | `String?` | Rich text stored as plain text |
| `eventDate` | `DateTime` | Date + time of event |
| `venue` | `String` | — |
| `posterUrl` | `String?` | Relative URL to uploaded poster |
| `status` | `EventStatus` | `DRAFT` → `PUBLISHED` → `CANCELLED` |
| `performanceRegOpen` | `Boolean` | Whether performance sign-ups are accepted |
| `performanceRegDeadline` | `DateTime?` | Cut-off for performance registrations |

**`EventRsvp`** — One RSVP per email per event. Supports both member (linked `userId`) and guest (no `userId`) RSVPs. Upserted on `[eventId, email]` so respondents can update their RSVP.

| Field | Type | Notes |
|---|---|---|
| `userId` | `String?` | FK → User (null for guests) |
| `attending` | `RsvpStatus` | YES / NO / MAYBE |
| `adultCount` | `Int` | People aged 15+ attending |
| `kidCount` | `Int` | People under 15 attending |

**`EventItem`** — Things members can volunteer to bring to an event (potluck items, decorations, etc.). Has a `quantityNeeded` and tracks `quantityCommitted` at query time via SUM aggregation.

**`EventRsvpItem`** — Junction table: which RSVP covers which item and in what quantity. Unique on `[rsvpId, itemId]`.

**`PerformanceRegistration`** — Stage performance sign-up (singing, dance, skit, etc.). Captures coordinator details, participant counts, song lists, mic requirements. Linked to an Event.

**`EventPricing`** — One-to-one with Event. Defines the entry fee structure.

| Field | Type | Notes |
|---|---|---|
| `isFree` | `Boolean` | If true, all fee fields are null |
| `feeType` | `EventFeeType?` | `FAMILY` or `INDIVIDUAL` |
| `memberFamilyFee` | `Decimal?` | Applies when `feeType = FAMILY` |
| `nonMemberFamilyFee` | `Decimal?` | Applies when `feeType = FAMILY` |
| `memberAdultFee` | `Decimal?` | Applies when `feeType = INDIVIDUAL` (15+) |
| `nonMemberAdultFee` | `Decimal?` | Applies when `feeType = INDIVIDUAL` (15+) |
| `memberKidFee` | `Decimal?` | Applies when `feeType = INDIVIDUAL` (under 15) |
| `nonMemberKidFee` | `Decimal?` | Applies when `feeType = INDIVIDUAL` (under 15) |
| `notes` | `String?` | Payment instructions shown publicly |

**`EventFeeReminder`** — Audit log of every fee reminder batch email sent for an event.

| Field | Type | Notes |
|---|---|---|
| `sentAt` | `DateTime` | When the reminder was triggered |
| `sentById` | `String` | FK → User (the admin/officer who sent it) |
| `recipientCount` | `Int` | Number of YES RSVPs at time of sending |
| `message` | `String?` | Optional custom message included in email |

#### NextAuth Models

Standard NextAuth Prisma Adapter models: `Account`, `Session`, `VerificationToken`. These are managed entirely by the NextAuth library.

---

## 5. Data Model Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              USER DOMAIN                                    │
│                                                                              │
│  ┌─────────────────────────────────┐                                        │
│  │             User                │                                        │
│  │─────────────────────────────────│                                        │
│  │ id (PK)                         │                                        │
│  │ email (unique)                  │◄──── NextAuth Account (OAuth)          │
│  │ password                        │◄──── NextAuth Session                 │
│  │ role: ADMIN|OFFICE_BEARER|MEMBER│                                        │
│  │ status: ACTIVE|INACTIVE|PENDING │                                        │
│  │ membershipType                  │                                        │
│  │ membershipExpiry                │                                        │
│  └───────┬─────────────────────────┘                                        │
│          │ 1                                                                  │
│    ┌─────┴──────────────────────────────────────────┐                       │
│    │           │               │                    │                       │
│    │ 0..1      │ 0..1          │ 0..1               │ 0..1                  │
│    ▼           ▼               ▼                    ▼                       │
│ Profile   ContactInfo  NotificationSettings  FamilyMember (0..N)            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                          MEMBERSHIP FEE DOMAIN                              │
│                                                                              │
│  ┌────────────────────────────────┐                                         │
│  │       MembershipFee            │                                         │
│  │────────────────────────────────│                                         │
│  │ id (PK)                        │                                         │
│  │ membershipType (enum)          │  One record per type per date range.    │
│  │ amount: Decimal(10,2)          │  effectiveTo = null means current rate. │
│  │ effectiveFrom                  │                                         │
│  │ effectiveTo (nullable)         │                                         │
│  │ createdById → User             │                                         │
│  └────────────────────────────────┘                                         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                              EVENT DOMAIN                                   │
│                                                                              │
│  ┌──────────────────────────────┐                                           │
│  │           Event              │                                           │
│  │──────────────────────────────│                                           │
│  │ id (PK)                      │                                           │
│  │ name, description            │                                           │
│  │ eventDate, venue             │                                           │
│  │ posterUrl                    │                                           │
│  │ status: DRAFT|PUBLISHED|CANC │                                           │
│  │ performanceRegOpen           │                                           │
│  │ performanceRegDeadline       │                                           │
│  │ createdById → User           │                                           │
│  └──┬───────────────────────────┘                                           │
│     │                                                                        │
│  ┌──┴─────────────────────────────────────────────────────────────────────┐ │
│  │       │                │               │               │               │ │
│  │ 0..1  │           0..N │          0..N │          0..N │          0..N │ │
│  │       ▼                ▼               ▼               ▼               │ │
│  │ EventPricing      EventItem     EventRsvp    PerformanceRegistration   │ │
│  │  ─────────────   ───────────   ───────────   ──────────────────────── │ │
│  │  isFree           name         userId(?)      performanceType          │ │
│  │  feeType          description  name           isGroup                  │ │
│  │  memberFamilyFee  quantityNeed email          programName              │ │
│  │  nonMemberFamily  sortOrder    attending      duration                 │ │
│  │  memberAdultFee                adultCount     coordinatorName/Email    │ │
│  │  nonMemberAdult        │       kidCount       participantCount         │ │
│  │  memberKidFee    0..N  │       notes          songList                 │ │
│  │  nonMemberKidFee       ▼             │        micCount / micType       │ │
│  │  notes          EventRsvpItem   0..N │                                 │ │
│  │  updatedById     ─────────────       │                                 │ │
│  │                  rsvpId (FK)         │                                 │ │
│  │ 0..N             itemId  (FK)  ◄─────┘                                 │ │
│  │       ▼          quantity      (junction table)                        │ │
│  │ EventFeeReminder                                                       │ │
│  │  ─────────────                                                         │ │
│  │  sentAt                                                                │ │
│  │  sentById → User                                                       │ │
│  │  recipientCount                                                        │ │
│  │  message                                                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Entity Relationship Summary

| Relationship | Type | Cascade |
|---|---|---|
| User → Profile | 1-to-1 | Delete cascade |
| User → ContactInfo | 1-to-1 | Delete cascade |
| User → NotificationSettings | 1-to-1 | Delete cascade |
| User → FamilyMember | 1-to-many | Delete cascade |
| User → MembershipFee | 1-to-many (created) | — |
| User → Event | 1-to-many (created) | — |
| User → EventRsvp | 1-to-many (optional) | Set null on user delete |
| Event → EventRsvp | 1-to-many | Delete cascade |
| Event → EventItem | 1-to-many | Delete cascade |
| Event → EventPricing | 1-to-1 | Delete cascade |
| Event → PerformanceRegistration | 1-to-many | Delete cascade |
| Event → EventFeeReminder | 1-to-many | Delete cascade |
| EventRsvp → EventRsvpItem | 1-to-many | Delete cascade |
| EventItem → EventRsvpItem | 1-to-many | Delete cascade |

---

## 6. API Reference

All API routes live under `/api/`. JSON is the default content type. Authentication is checked via `getServerSession(authOptions)`.

### Authorization Levels

| Level | Who | How Checked |
|---|---|---|
| Public | Anyone | No session check |
| Authenticated | Any logged-in user | `session` present |
| Member-self | Own resource only | `session.user.id === resourceUserId` |
| Management | ADMIN or OFFICE_BEARER | `["ADMIN","OFFICE_BEARER"].includes(role)` |
| Admin-only | ADMIN only | `role === "ADMIN"` |

---

### Auth Routes

| Method | Path | Access | Description |
|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Public | NextAuth catch-all: handles sign-in, sign-out, session, OAuth callbacks |
| POST | `/api/register` | Public | Self-registration. Creates user with `status=PENDING`. Validates: firstName, lastName, email (unique), phone, DOB, membershipType, password (≥8 chars, confirm match). Returns `201` on success. |

---

### User Routes

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Management | Lists users. Query params: `page`, `limit` (default 20), `search` (name/email), `status`, `role`, `membership`. Returns `{ users, pagination }`. |
| POST | `/api/users` | Admin only | Creates user with profile. Password hashed with bcrypt. Admin-created accounts start `ACTIVE`. |
| GET | `/api/users/[id]` | Authenticated | Full user object with profile, contact, family, notifications (minus password). Members can only fetch own. |
| PATCH | `/api/users/[id]` | Authenticated | Updates user. Members: only `profile`, `contactInfo`, `notificationSettings`. Admins: also `role`, `status`, `membershipType`, `membershipExpiry`, `password`. |
| DELETE | `/api/users/[id]` | Admin only | Deletes user and all related data. Cannot delete own account. |
| GET | `/api/users/[id]/family` | Authenticated | Lists family members for a user. |
| POST | `/api/users/[id]/family` | Authenticated | Adds family member. Requires FAMILY membership type. Enforces max 1 spouse. |
| PATCH | `/api/users/[id]/family/[memberId]` | Authenticated | Partial update of family member. |
| DELETE | `/api/users/[id]/family/[memberId]` | Authenticated | Removes family member. |

---

### Event Routes

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/events` | Various | Without params: public list (id, name, date, venue). `?manage=1`: full management list for ADMIN/OFFICER. `?member=1`: published events with caller's RSVP status. |
| POST | `/api/events` | Management | Creates event. Required: `name`, `eventDate`, `venue`. Optional: `description`, `status`. |
| GET | `/api/events/[id]` | Various | Full event with items, createdBy profile, RSVP count. Non-managers see PUBLISHED only. |
| PATCH | `/api/events/[id]` | Management | Updates any event field including `performanceRegOpen` and `performanceRegDeadline`. |
| DELETE | `/api/events/[id]` | Management | Deletes event and all cascaded records. |
| GET | `/api/events/[id]/rsvp` | Management | `?full=1`: merged view of all members + guest RSVPs with status. Without param: raw RSVP list. |
| POST | `/api/events/[id]/rsvp` | Public | Submits or updates RSVP. Upserts on `[eventId, email]`. Includes item selections. |
| GET | `/api/events/[id]/items` | Various | Lists items with `quantityCommitted`. Published-check for non-managers. |
| POST | `/api/events/[id]/items` | Management | Creates item. Fields: `name`, `description`, `quantityNeeded`, `sortOrder`. |
| PATCH | `/api/events/[id]/items/[itemId]` | Management | Updates item. |
| DELETE | `/api/events/[id]/items/[itemId]` | Management | Deletes item (cascades RSVP item selections). |
| POST | `/api/events/[id]/poster` | Management | Uploads event poster. Accepts `multipart/form-data`. Validates JPEG/PNG by MIME and magic bytes, max 5 MB. Saves to `public/uploads/events/`. |
| DELETE | `/api/events/[id]/poster` | Management | Removes poster file and clears `posterUrl` in DB. |
| GET | `/api/events/[id]/performances` | Management | Lists all performance registrations for the event. |
| POST | `/api/events/[id]/performances` | Public | Submits performance registration. Validates event is PUBLISHED, `performanceRegOpen = true`, and deadline not passed. |
| GET | `/api/events/[id]/pricing` | Various | Returns event pricing. Published-check for non-managers. Returns `null` pricing if not yet set. |
| PUT | `/api/events/[id]/pricing` | Management | Creates or overwrites event pricing. Nullifies irrelevant fee fields based on `isFree` and `feeType`. |
| GET | `/api/events/[id]/fee-reminder` | Management | Lists past fee reminders for the event (newest first), including sender name. |
| POST | `/api/events/[id]/fee-reminder` | Management | Sends fee reminder email to all YES RSVPs. Requires paid event with pricing configured. Logs reminder to DB regardless of email delivery success. |

---

### Membership Fee Routes

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/membership-fees` | Management | Returns `{ current: FeeEntry[], history: FeeEntry[] }`. Current = one active fee per membership type. History = closed fees sorted by effectiveTo desc. |
| POST | `/api/membership-fees` | Management | Creates new fee record. Auto-closes the previous open fee for the same membership type by setting `effectiveTo = newEffectiveFrom - 1 day`. |

---

## 7. Authentication & Authorization

### Authentication Flow

```
User visits login page
         │
     ┌───▼───────────────────┐
     │   Credentials login?   │
     └───┬───────────────────┘
         │ YES                     NO (Google/Facebook)
         ▼                              ▼
  Email/password check          OAuth 2.0 redirect
  bcrypt.compare()              Provider callback
  Status check (INACTIVE/PENDING)    │
         │                           │
         └────────────┬──────────────┘
                      ▼
             JWT token created
          (embeds id, role, status,
           membershipType)
                      │
             Session cookie set
                      │
             Redirect to /dashboard
                      ▼
          Middleware reads role
     /admin, /officer, or /member
```

### Middleware Route Protection (proxy.ts)

The middleware runs before any page render and enforces:

```
Request to protected route
         │
   Is user authenticated?
         │ NO → redirect /auth/login
         │
   Is status INACTIVE or PENDING?
         │ YES → redirect /restricted
         │
   Match route prefix:
   ┌─────────────────────────────────────────────┐
   │ /admin/* → role ADMIN only                  │
   │            → else redirect /dashboard        │
   ├─────────────────────────────────────────────┤
   │ /officer/* → ADMIN or OFFICE_BEARER         │
   │              → else redirect /dashboard      │
   ├─────────────────────────────────────────────┤
   │ /fees/* → ADMIN or OFFICE_BEARER            │
   ├─────────────────────────────────────────────┤
   │ /events/manage* → ADMIN or OFFICE_BEARER    │
   ├─────────────────────────────────────────────┤
   │ /dashboard → redirect based on role:        │
   │   ADMIN → /admin                            │
   │   OFFICE_BEARER → /officer                  │
   │   MEMBER → /member                          │
   └─────────────────────────────────────────────┘
```

**Protected matcher pattern:**
```
/dashboard/:path*
/admin/:path*
/officer/:path*
/member/:path*
/fees/:path*
/events/manage
/events/manage/:path*
/restricted
```

Public routes (not in matcher): `/`, `/events/[id]`, `/events/[id]/perform`, `/auth/*`

### JWT Token Lifecycle

The JWT strategy means no server-side session lookup on every request. The token is enriched at sign-in with `id`, `role`, `status`, and `membershipType`. On every subsequent request the auth callback re-fetches `role`, `status`, and `membershipType` from the database to pick up admin changes (e.g., activation, role change) without requiring re-login.

### Role Capabilities Matrix

| Capability | ADMIN | OFFICE_BEARER | MEMBER |
|---|---|---|---|
| View all users (search/filter) | ✓ | ✓ | — |
| Create/edit/delete users | ✓ | — | — |
| Activate/deactivate users | ✓ | — | — |
| Edit own profile/contact/notifications | ✓ | ✓ | ✓ |
| View/manage events | ✓ | ✓ | Browse only |
| Create/edit/delete events | ✓ | ✓ | — |
| Set event pricing | ✓ | ✓ | — |
| Send fee reminders | ✓ | ✓ | — |
| Manage performance registrations | ✓ | ✓ | — |
| Add/remove items to bring | ✓ | ✓ | — |
| RSVP to events | ✓ | ✓ | ✓ (public too) |
| Configure membership fees | ✓ | ✓ | — |
| Manage own family members | ✓ | ✓ | ✓ |

---

## 8. System Flows

### Member Registration Flow

```
1. User visits /auth/register
2. Fills form: name, email, phone, DOB, membership type, password
3. POST /api/register
   ├── Zod validation (registerSchema)
   ├── Check email uniqueness
   ├── bcrypt.hash(password, 12)
   └── prisma.user.create({ status: "PENDING" })
4. User sees success message: "Account pending admin approval"
5. Admin visits /admin/users
6. Finds user in PENDING state
7. Admin clicks "Activate" → PATCH /api/users/[id] { status: "ACTIVE" }
8. User can now log in
```

### Event Lifecycle Flow

```
1. Admin/Officer creates event (POST /api/events)
   └── Event starts in DRAFT status

2. Optionally upload poster (POST /api/events/[id]/poster)

3. Set entry fee pricing (PUT /api/events/[id]/pricing)
   └── isFree OR feeType + relevant tier amounts

4. Add items to bring (POST /api/events/[id]/items)

5. Enable performance registration (PATCH /api/events/[id])
   └── performanceRegOpen = true, optional deadline

6. Publish event (PATCH /api/events/[id] { status: "PUBLISHED" })
   └── Event evite now publicly accessible at /events/[id]

7. Share evite URL with members and public

8. RSVPs are collected:
   ├── POST /api/events/[id]/rsvp (public)
   ├── Upsiated on [eventId, email]
   └── Members linked to User record; guests are anonymous

9. Performance submissions received:
   └── POST /api/events/[id]/performances

10. Admin/Officer monitors:
    └── GET /api/events/[id]/rsvp?full=1
        → Merged table: all members + guest RSVPs

11. Send fee reminders (if paid event):
    └── POST /api/events/[id]/fee-reminder
        ├── Fetches all YES RSVPs
        ├── Builds HTML email with fee breakdown
        ├── Sends via SMTP (BCC all recipients)
        └── Logs reminder to EventFeeReminder table

12. Export data:
    ├── RSVP list as CSV
    └── Performance registrations as CSV

13. Event day → optionally Cancel event:
    └── PATCH /api/events/[id] { status: "CANCELLED" }
```

### RSVP Submission Flow

```
1. Visitor opens /events/[id]
   └── Fetches event details + pricing in parallel

2. Pricing displayed in event details:
   ├── Free: "Free admission"
   ├── Family fee: member family / non-member family prices
   └── Individual fee: member/non-member adult + kid prices

3. Visitor fills RSVP form:
   ├── Name, Email, Phone
   ├── Attending: YES / MAYBE / NO
   ├── If YES: adult count (15+), kid count (under 15)
   └── Optional: items to bring + quantities

4. POST /api/events/[id]/rsvp
   ├── Validate with Zod
   ├── Check event is PUBLISHED
   ├── Upsert EventRsvp on [eventId, email]
   ├── Link to User if session active
   ├── Delete + recreate EventRsvpItem selections
   └── Return 201

5. Success screen shown
6. Visitor can click "Update my RSVP" to re-submit
```

### Fee Reminder Email Flow

```
1. Admin/Officer visits /events/manage/[id]
2. In "Entry Fee" card → "Send Payment Reminders" section
3. Optionally types custom message
4. Clicks "Send Reminder"
5. Confirm dialog: "Send to N confirmed attendees?"

6. POST /api/events/[id]/fee-reminder
   ├── Validate event has paid pricing configured
   ├── Fetch all EventRsvp where attending = "YES"
   ├── Build fee breakdown strings:
   │   ├── FAMILY: "Member family: $XX | Non-member family: $XX"
   │   └── INDIVIDUAL: "Member adult: $XX | Non-member adult: $XX
   │                    Member child: $XX | Non-member child: $XX"
   ├── Build HTML + plain text email templates
   ├── sendEmail({ to: allEmails, bcc: true, ... })
   │   ├── If SMTP configured: delivers emails
   │   └── If not configured: returns { sent: false, reason: "..." }
   └── prisma.eventFeeReminder.create({ recipientCount, message })

7. Response: { emailSent, recipientCount, emailError? }
8. UI shows success/warning banner
9. Reminder history updates below the send button
```

### Membership Fee Configuration Flow

```
1. Admin/Officer visits /fees
2. Sees current fee per membership type table
3. Clicks "Add/Update Fee"
4. Enters: membershipType, amount, effectiveFrom, optional notes

5. POST /api/membership-fees
   ├── Find existing open fee for same membershipType
   │   (where effectiveTo = null)
   ├── If found: UPDATE effectiveTo = effectiveFrom - 1 day
   └── CREATE new MembershipFee record

6. Fee history table updates automatically
7. New fee is live from effectiveFrom date
```

---

## 9. UI Component Library

All reusable components are in `src/components/ui.tsx`.

### `<Button>`

```tsx
<Button
  variant="primary"    // primary | secondary | danger | ghost
  size="md"            // sm | md | lg
  isLoading={false}    // shows spinner + disables
  disabled={false}
  onClick={...}
>
  Click me
</Button>
```

**Variants:**
- `primary` — Blue, white text
- `secondary` — White, gray border
- `danger` — Red, white text
- `ghost` — Transparent, gray text

### `<Card>`

```tsx
<Card title="Section Title" description="Sub-heading">
  {/* content */}
</Card>
```

White background, rounded corners, border, shadow. Optional title and description header.

### `<Input>`

```tsx
<Input
  label="Email"
  error="Email is required"
  hint="We'll never share your email"
  type="email"
  {...register("email")}
/>
```

Full-width labeled input with error and hint text support.

### `<Select>`

```tsx
<Select
  label="Role"
  options={[{ value: "ADMIN", label: "Administrator" }]}
  error="Required"
/>
```

### `<StatCard>`

```tsx
<StatCard
  title="Active Members"
  value={42}
  description="Across all tiers"
  icon={<Users />}
  color="blue"    // blue | green | yellow | red | purple
/>
```

Metric display cards used on admin/officer dashboards.

### `<Badge>`

```tsx
<Badge variant="success">Active</Badge>
// variants: default | success | warning | danger | info
```

### `<DashboardLayout>`

Wraps all authenticated pages. Provides:
- **Sidebar** (desktop): TGROC brand, role badge, navigation links (role-aware), sign out
- **Mobile header**: hamburger toggle + user dropdown
- **Role-adaptive navigation:**
  - ADMIN: Dashboard, Users, Events, Fees, Profile
  - OFFICE_BEARER: Dashboard, Members, Events, Fees, Profile
  - MEMBER: Dashboard, Events, Profile, Contact, Notifications

---

## 10. Configuration & Environment Variables

### Required Environment Variables

| Variable | Example Value | Required | Purpose |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/tgroc_portal` | **Yes** | PostgreSQL connection |
| `NEXTAUTH_SECRET` | 32-char random string | **Yes** | JWT signing/encryption |
| `NEXTAUTH_URL` | `http://localhost:3000` | **Yes** (in prod) | Auth callback base URL |

### OAuth (at least one provider needed for social login)

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth app secret |
| `FACEBOOK_CLIENT_ID` | Optional | Facebook app ID |
| `FACEBOOK_CLIENT_SECRET` | Optional | Facebook app secret |

### Email (optional — reminders still logged if not set)

| Variable | Default | Purpose |
|---|---|---|
| `EMAIL_HOST` | — | SMTP server hostname |
| `EMAIL_PORT` | `587` | SMTP port (465 = TLS, 587 = STARTTLS) |
| `EMAIL_USER` | — | SMTP authentication username |
| `EMAIL_PASS` | — | SMTP authentication password |
| `EMAIL_FROM` | `TGROC <noreply@tgroc.org>` | Sender name + address |

### Application Behaviour

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Controls Prisma log level (dev logs queries; prod logs errors only) |

### NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `next dev --webpack` | Start dev server (forces webpack, not Turbopack) |
| `npm run build` | `next build --webpack` | Production build |
| `npm run start` | `next start` | Start production server |
| `npm run lint` | `eslint` | Lint check |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client after schema changes |
| `npm run db:push` | `prisma db push` | Push schema without migration (development only) |
| `npm run db:migrate` | `prisma migrate dev` | Create and apply a new migration |
| `npm run db:studio` | `prisma studio` | Open Prisma Studio GUI |
| `npm run db:seed` | `tsx prisma/seed.ts` | Seed default admin user |

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Run database migrations
npm run db:migrate

# 4. Generate Prisma client
npm run db:generate

# 5. Seed the default admin user (admin@tgroc.org / Admin@1234)
npm run db:seed

# 6. Start development server
npm run dev
```

---

*Documentation generated: March 31, 2026*
