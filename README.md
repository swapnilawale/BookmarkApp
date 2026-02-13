# 📑 Smart Bookmark

A real-time bookmark manager built with **Next.js 16 (App Router)**, **Supabase** (Auth, Database, Realtime), and **Tailwind CSS v4**.

**Live URL:** [https://your-vercel-url.vercel.app](https://your-vercel-url.vercel.app) *(update after deployment)*

---

## ✨ Features

- 🔐 **Google OAuth** — Sign in with Google (no email/password)
- ➕ **Add Bookmarks** — Save URLs with titles
- 🗑️ **Delete Bookmarks** — Remove bookmarks you no longer need
- 🔒 **Private Bookmarks** — Each user only sees their own bookmarks (enforced via Supabase RLS)
- ⚡ **Real-time Sync** — Bookmarks update instantly across all open tabs using Supabase Realtime
- 🎨 **Premium UI** — Dark glassmorphism design with smooth animations
- 📱 **Responsive** — Works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Frontend   | Next.js 16 (App Router)       |
| Styling    | Tailwind CSS v4               |
| Auth       | Supabase Auth (Google OAuth)   |
| Database   | Supabase PostgreSQL            |
| Realtime   | Supabase Realtime (Postgres Changes) |
| Deployment | Vercel                         |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))
- A Google OAuth app (configured in Supabase)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/smart-bookmark.git
cd smart-bookmark
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run:

```sql
-- Create bookmarks table
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
```

3. Go to **Authentication > Providers > Google** and enable it:
   - Create a Google OAuth app at [console.cloud.google.com](https://console.cloud.google.com)
   - Add the Client ID and Client Secret to Supabase
   - Set the redirect URI to: `https://<your-project-ref>.supabase.co/auth/v1/callback`

### 3. Configure Environment Variables

Copy `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📦 Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!
5. **Important:** Update the Supabase redirect URL:
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Add your Vercel URL to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`
   - Also add it in your Google Cloud Console OAuth authorized redirect URIs

---

## 🐛 Problems I Ran Into & How I Solved Them

### 1. Node.js Version Compatibility
**Problem:** Next.js 16 requires Node.js >= 20.9.0, but the development environment had Node.js 18.20.8. The `create-next-app` command showed `EBADENGINE` warnings.

**Solution:** The project still initializes and runs correctly despite the warning. For production (Vercel), the runtime uses a compatible Node.js version. For local dev, the core features work fine on Node 18 even with the warning.

### 2. Supabase Auth Cookies in App Router
**Problem:** Supabase auth relies on cookies for server-side session management. The Next.js App Router's Server Components cannot directly set cookies, which caused issues with session refresh.

**Solution:** Used `@supabase/ssr` library which provides `createServerClient` and `createBrowserClient` helpers designed for Next.js App Router. Implemented middleware (`middleware.ts`) that intercepts every request to refresh the auth token via cookies, ensuring sessions stay valid.

### 3. OAuth Callback Redirect in Production (Vercel)
**Problem:** After Google OAuth login, the callback redirect would sometimes use the wrong origin when deployed behind Vercel's proxy, causing redirect failures.

**Solution:** In the auth callback route handler (`/auth/callback/route.ts`), I check for the `x-forwarded-host` header that Vercel sets and use it for the redirect URL in production. For local development, I use the request origin directly.

### 4. Real-time Updates Without Duplicates
**Problem:** When adding a bookmark, the optimistic state from the `INSERT` query and the real-time subscription event could create duplicate entries in the bookmark list.

**Solution:** In the real-time `INSERT` handler, I check if the bookmark already exists in the state array before adding it: `if (prev.some((b) => b.id === payload.new.id)) return prev`. This deduplication ensures each bookmark appears only once.

### 5. Row Level Security (RLS) with Realtime
**Problem:** Supabase Realtime's `postgres_changes` doesn't automatically respect RLS policies — by default, it broadcasts all changes to all subscribers.

**Solution:** Added a filter to the real-time subscription: `filter: \`user_id=eq.${user.id}\``. This ensures each client only receives events for their own bookmarks, matching the RLS policy behavior.

### 6. `useSearchParams()` Requiring Suspense Boundary
**Problem:** Next.js 14+ requires `useSearchParams()` to be wrapped in a `<Suspense>` boundary when used in client components, otherwise it throws an error during static rendering.

**Solution:** Split the login page into a wrapper component with `<Suspense>` and an inner `LoginContent` component that uses `useSearchParams()`.

### 7. Tailwind CSS v4 Breaking Changes
**Problem:** Tailwind CSS v4 changed the import syntax and configuration approach from v3. The old `@tailwind base; @tailwind components; @tailwind utilities;` no longer works.

**Solution:** Used the new `@import "tailwindcss";` single import directive in `globals.css`, which is the correct v4 syntax.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/callback/route.ts    # OAuth callback handler
│   ├── login/page.tsx            # Login page (Google OAuth)
│   ├── page.tsx                  # Home page (bookmark dashboard)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   └── BookmarkDashboard.tsx      # Main bookmark UI with real-time
├── lib/supabase/
│   ├── client.ts                  # Browser Supabase client
│   ├── server.ts                  # Server Supabase client
│   └── middleware.ts              # Auth middleware helper
└── middleware.ts                   # Next.js middleware (route protection)
```

---

## 📝 License

MIT
