# Admin Users Tab Not Loading - Troubleshooting Guide

## Problem
Users are not being displayed in the Admin Dashboard's Users tab, even though it worked before.

## Root Causes (in order of likelihood)

### 1. Missing Service Role Key (Most Likely)
**Symptoms:**
- Console shows: `Supabase service role key unavailable. Falling back to anon client`
- No users appear even though they exist
- Diagnostics button shows "Missing" for service role access

**Solution:**
Add the Supabase Service Role Key to your backend environment:

1. Go to your Supabase project dashboard
2. Go to Settings → API
3. Copy the `service_role` key (⚠️ Keep this secret!)
4. Add it to your backend environment as:
   - `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
   - OR `SUPABASE_SERVICE_KEY=your_key_here`

**Where to add it:**
- If running locally: create a `.env` file in your project root
- If deployed: add it to your hosting platform's environment variables

---

### 2. Empty Profiles Table
**Symptoms:**
- Console shows: `No profiles found in database`
- New user creation also fails

**Solution:**
Run the verification SQL script to check:

```bash
# Open database-user-verification.sql in Supabase SQL Editor
```

This will show you:
- How many profiles exist
- How many auth users exist
- Any mismatches between the two

If profiles table is empty but auth.users has data, the trigger might be broken. Re-run `database-final-setup.sql`.

---

### 3. RLS Policies Blocking Access
**Symptoms:**
- Console shows an error with code like `PGRST116` or `42501`
- Error message mentions "policy" or "permission denied"

**Solution:**
The backend needs to use the service role key (see solution #1) OR you need to add RLS policies that allow admins to read profiles:

```sql
-- Add this policy to allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 4. Network/Connection Issues
**Symptoms:**
- Error: `Failed to fetch`
- Console shows network errors

**Solution:**
- Check your internet connection
- Verify Supabase project is not paused
- Check if SUPABASE_URL and SUPABASE_ANON_KEY are correct

---

## How to Diagnose

### Step 1: Click "Run Diagnostics" button
This will show:
- ✅ Service role access status
- Number of rows in each table
- Number of auth users

### Step 2: Check Browser Console Logs
Open DevTools (F12) and look for:
```
[getAllUsersProcedure] Starting to fetch all users...
[getAllUsersProcedure] Querying profiles table...
[getAllUsersProcedure] Raw profiles data received: { count: X, ... }
```

### Step 3: Run SQL Verification Script
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open `database-user-verification.sql`
4. Click "Run"

This shows exactly what's in your database.

---

## Quick Fix Checklist

- [ ] Service role key is configured in backend environment
- [ ] At least one user exists in the `profiles` table
- [ ] RLS policies on `profiles` allow reading (or service role key is used)
- [ ] The `profiles` table has all required columns: `id`, `email`, `full_name`, `display_name`, `role`, `is_blocked`, `created_at`, `phone`
- [ ] Browser console shows detailed logs from the query
- [ ] Network tab shows the tRPC request completing (not failing with 500 error)

---

## Expected Behavior

When working correctly, you should see in the console:
```
[getAllUsersProcedure] Starting to fetch all users... { hasServiceRoleAccess: true }
[getAllUsersProcedure] Querying profiles table...
[getAllUsersProcedure] Raw profiles data received: { count: 5, hasData: true, firstProfile: {...} }
[getAllUsersProcedure] Successfully mapped 5 users
[Admin] Users query success, received users: 5
```

---

## Still Not Working?

If none of the above helps:
1. Check that `database-final-setup.sql` was run successfully
2. Verify the trigger `on_auth_user_created` exists and is enabled
3. Try creating a new test user and see if it appears in both `auth.users` and `profiles`
4. Check Supabase logs for any errors
