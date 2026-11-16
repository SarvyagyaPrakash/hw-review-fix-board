# Supabase Setup Guide

This directory contains the database schema, security rules, and test scripts for **HW Review-Fix Board**.

---

## 1. Apply Schema to Supabase

1. Open your project on [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the left navigation, click **SQL Editor**.
3. Click **New query**.
4. Open [supabase/schema.sql](file:///Users/sarvyagyaprakash/DRIVE/CODE/HW%20PA/supabase/schema.sql) in your editor, copy the entire file contents, paste into the Supabase SQL Editor, and click **Run**.
5. You should see `Success. No rows returned`.

---

## 2. Verify Security Rules & Tests

1. In the Supabase SQL Editor, click **New query**.
2. Open [supabase/tests.sql](file:///Users/sarvyagyaprakash/DRIVE/CODE/HW%20PA/supabase/tests.sql), copy the contents, paste, and click **Run**.
3. You should see messages confirming all tests passed:
   - Valid status mutations succeed.
   - Invalid statuses and invalid teams are rejected.
   - Direct `INSERT`, `UPDATE`, and `DELETE` queries are denied by Row Level Security.
   - The `team_pins` table is completely unreadable by public clients.

---

## 3. Confirm Realtime is Enabled

1. In the Supabase left navigation, go to **Database** $\rightarrow$ **Publications**.
2. Click on `supabase_realtime`.
3. Confirm that the following 3 tables are listed:
   - `task_status`
   - `task_notes`
   - `task_activity`

---

## 4. How to Enable a Team PIN Later (Optional)

If a team wants to lock their status changes with a 4-digit PIN:

1. Open the SQL Editor in Supabase.
2. Run the following command (replace `'product-analyst'` and `'1234'` with your team and chosen PIN):
   ```sql
   insert into public.team_pins (team, pin_hash)
   values ('product-analyst', extensions.crypt('1234', extensions.gen_salt('bf')))
   on conflict (team)
   do update set pin_hash = excluded.pin_hash;
   ```
3. Once inserted, any status update or note submitted for `product-analyst` will require the correct PIN to match. To remove the requirement, simply delete the row from `team_pins`.
