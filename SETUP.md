# 🚀 Setup & Deployment Guide

This guide will walk you through setting up and deploying the Smart Bookmark app from scratch.

---

## 📋 Prerequisites

- Node.js 18+ (Node.js 20+ recommended for production)
- A GitHub account
- A Supabase account ([supabase.com](https://supabase.com))
- A Vercel account ([vercel.com](https://vercel.com))
- A Google Cloud account for OAuth

---

## Part 1: Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Choose an organization, enter a project name, database password, and region
4. Wait for the project to be created (~2 minutes)

### Step 2: Create the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Paste the following SQL and click **"Run"**:

```sql
-- Create bookmarks table
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime for the bookmarks table
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
```

### Step 3: Set Up Google OAuth

#### 3.1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services > Credentials**
4. Click **"Create Credentials" > "OAuth client ID"**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: **Smart Bookmark**
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `email` and `profile`
   - Save and continue
6. Back in Credentials, click **"Create Credentials" > "OAuth client ID"**
7. Application type: **Web application**
8. Name: **Smart Bookmark**
9. Authorized redirect URIs: Add this (replace `YOUR_PROJECT_REF` with your Supabase project reference):
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
10. Click **"Create"**
11. Copy the **Client ID** and **Client Secret**

#### 3.2: Configure Google OAuth in Supabase

1. In your Supabase dashboard, go to **Authentication > Providers**
2. Find **Google** and click to expand
3. Enable **"Google enabled"**
4. Paste your **Client ID** and **Client Secret**
5. Click **"Save"**

### Step 4: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings > API**
2. Copy:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## Part 2: Local Development

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/smart-bookmark.git
cd smart-bookmark
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

1. Open `.env.local` in the project root
2. Replace the placeholder values with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
```

### Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Test Locally

1. Click **"Continue with Google"**
2. Sign in with your Google account
3. You should be redirected to the bookmark dashboard
4. Try adding a bookmark
5. Open the app in another tab — the bookmark should appear in both tabs instantly (real-time sync)
6. Try deleting a bookmark

---

## Part 3: Deploy to Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart-bookmark.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New" > "Project"**
3. Import your `smart-bookmark` repository
4. In the **"Configure Project"** section:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
5. Click **"Environment Variables"** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_anon_public_key`
6. Click **"Deploy"**
7. Wait for the deployment to complete (~2 minutes)
8. Copy your Vercel deployment URL (e.g., `https://smart-bookmark-xyz.vercel.app`)

### Step 3: Update OAuth Redirect URLs

#### 3.1: Update Supabase

1. Go to your Supabase dashboard > **Authentication > URL Configuration**
2. Under **Redirect URLs**, add your Vercel URL:
   ```
   https://your-app.vercel.app/auth/callback
   ```
3. Click **"Save"**

#### 3.2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-app.vercel.app/auth/callback
   ```
   (Keep the Supabase redirect URI as well)
5. Click **"Save"**

### Step 4: Test Production Deployment

1. Visit your Vercel URL
2. Sign in with Google
3. Test adding and deleting bookmarks
4. Open the app in multiple tabs to verify real-time sync

---

## 🎉 You're Done!

Your Smart Bookmark app is now live and fully functional!

### Next Steps

- Share your live URL
- Customize the design
- Add more features (tags, search, folders, etc.)

---

## 🐛 Troubleshooting

### "Authentication failed" error
- Check that your Google OAuth redirect URIs include both the Supabase callback URL and your Vercel callback URL
- Verify that your Supabase environment variables are correct in Vercel

### Bookmarks not appearing
- Check that you ran the SQL schema in Supabase
- Verify that RLS policies are enabled
- Check the browser console for errors

### Real-time not working
- Ensure you ran `ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;`
- Check that your Supabase project has Realtime enabled (it's enabled by default)

### Build fails on Vercel
- Check that your environment variables are set correctly
- Review the build logs in Vercel for specific errors

---

## 📞 Support

If you encounter any issues, check:
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
