# Deploy Checklist

Follow these steps to deploy **HW Review-Fix Board** to GitHub, Netlify, and connect your Supabase database.

---

### Step 1: Push Code to GitHub

Open terminal in the project directory and run:

```bash
# 1. Check status (confirm .env and data/raw/ are NOT tracked)
git status

# 2. Add remote (replace with your personal GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/hw-review-fix-board.git

# 3. Push to main branch
git branch -M main
git push -u origin main
```

> **Security Note**: Your `.gitignore` automatically excludes `.env`, `.venv`, and `data/raw/`. No keys or unanonymised player data will be uploaded to GitHub.

---

### Step 2: Apply Supabase Database Schema

1. Open your Supabase Dashboard: [supabase.com/dashboard](https://supabase.com/dashboard).
2. Select your project (`Hitwick`).
3. In the left navigation, click on **SQL Editor**.
4. Click **New query**.
5. Copy the entire contents of [supabase/schema.sql](file:///Users/sarvyagyaprakash/DRIVE/CODE/HW%20PA/supabase/schema.sql) and paste into the editor.
6. Click **Run**. You should see `Success. No rows returned`.
7. *(Optional)* Paste and run [supabase/tests.sql](file:///Users/sarvyagyaprakash/DRIVE/CODE/HW%20PA/supabase/tests.sql) to verify all permissions and security rules pass.

---

### Step 3: Connect to Netlify

1. Log into your [Netlify Dashboard](https://app.netlify.com/).
2. Click **Add new site** $\rightarrow$ **Import an existing project**.
3. Connect your GitHub account and select your `hw-review-fix-board` repository.
4. Netlify will automatically detect configuration from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
5. Click **Deploy site**.

---

### Step 4: Configure Environment Variables in Netlify

In your Netlify site dashboard, go to **Site configuration** $\rightarrow$ **Environment variables** $\rightarrow$ **Add a variable**:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://jslnegknwzhdvgsnkogg.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_zcT-gZnMdMJqGIUb8Afm8Q_4xsSxRWB` | Safe public browser key |
| `GROQ_API_KEY` | *(your Groq key)* | For optional serverless Q&A function |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | Model name |
| `CHAT_ENABLED` | `false` | Keep `false` by default to avoid open public spend |
| `RATE_SALT` | *(any 32-character string)* | Salt for visitor rate limiting |

> After saving environment variables, go to **Deploys** $\rightarrow$ **Trigger deploy** $\rightarrow$ **Deploy site** so Vite bundles the environment variables into the client.

---

### Step 5: Verification & Realtime Testing

1. Open your live Netlify site URL.
2. Confirm the **Sync pill** in the top navigation shows **Live** (green pulsing dot).
3. Open the site in two side-by-side browser windows.
4. On Window 1, select a review and change status from `To do` to `Done`.
5. Verify that Window 2 automatically reflects the status change and updates the segmented progress bar within **2 seconds** without a page refresh.
6. Test on a mobile phone (or Chrome mobile emulation at 360 px width).
