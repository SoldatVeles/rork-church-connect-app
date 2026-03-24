# Sign Out Issue - Debugging Guide

## What I've Done

I've updated the code to add better error handling, logging, and created a database verification script to check your Supabase configuration.

### Changes Made:

1. **Updated `providers/auth-provider.tsx`**:
   - Added more detailed console logging throughout the logout process
   - Added `scope: 'local'` parameter to `signOut()` to ensure proper session cleanup
   - Added error fallback in `onError` to force logout even if Supabase returns an error
   - Added try-catch blocks for better error handling

2. **Updated `lib/supabase.ts`**:
   - Enabled `debug: true` for auth to see more detailed logs
   - Added auth state change listener in development mode for debugging

3. **Created `database-verify-auth.sql`**:
   - Comprehensive SQL script to verify and fix Supabase configuration
   - Adds RLS policies for the profiles table (this might be the issue!)
   - Verifies table structure and auth setup

## How to Fix the Issue

### Step 1: Run the Database Verification Script

1. Go to your Supabase Dashboard: https://abrflrvbvtqztuvyaeel.supabase.co
2. Navigate to **SQL Editor** (in the left sidebar)
3. Create a new query
4. Copy the entire contents of `database-verify-auth.sql` and paste it
5. Click **Run** to execute the script

This script will:
- Enable RLS on the profiles table (if not enabled)
- Create proper RLS policies for profiles
- Verify the auth trigger is working correctly
- Show you the current state of your database

### Step 2: Check the Console Logs

After running the database script, try signing out again. You should see detailed logs like:

```
handleLogout called
Starting logout process...
Current session before logout: [user-id]
[Supabase Auth] SIGNED_OUT No session
Logout successful from Supabase
Logout onSuccess - clearing state
State cleared, navigating to login screen...
Auth state change: SIGNED_OUT
Navigation command sent
```

If you see any errors in the logs, please share them with me.

### Step 3: Check for Common Issues

#### Issue 1: RLS Policies Missing on Profiles Table
**Symptom**: Sign out works but page doesn't redirect, or you get stuck
**Fix**: The `database-verify-auth.sql` script fixes this by adding RLS policies

#### Issue 2: Session Not Clearing from AsyncStorage
**Symptom**: User appears to be logged in after refresh
**Fix**: Try clearing the app data:
- **Web**: Clear browser localStorage/cookies
- **Mobile**: Close and restart the app

#### Issue 3: Auth State Listener Not Firing
**Symptom**: Nothing happens when you press Sign Out
**Fix**: Check console for errors. The updated code now forces logout even on errors.

### Step 4: Manual Session Cleanup (If Needed)

If sign out still doesn't work after running the SQL script, you can manually clear sessions:

1. Go to Supabase SQL Editor
2. Run this query to see active sessions:
```sql
SELECT id, user_id, created_at, NOT_AFTER as expires_at
FROM auth.sessions
WHERE NOT_AFTER > NOW()
ORDER BY updated_at DESC;
```

3. To clear all sessions for your user (replace USER_ID with your actual user ID):
```sql
DELETE FROM auth.sessions WHERE user_id = 'YOUR_USER_ID';
DELETE FROM auth.refresh_tokens WHERE user_id = 'YOUR_USER_ID';
```

### Step 5: Test Sign Out

1. Sign in to your app
2. Open the browser/app console to see logs
3. Navigate to Profile tab
4. Press "Sign Out"
5. Confirm in the alert dialog
6. Watch the console logs

You should see:
- Logout function being called
- Supabase sign out succeeding
- State being cleared
- Navigation to login screen

## Expected Behavior

When you press Sign Out:
1. Alert dialog asks for confirmation
2. After confirming, logout mutation starts
3. Supabase signs out the user
4. Auth state listener fires with 'SIGNED_OUT' event
5. App clears query cache and auth state
6. App navigates to login screen
7. You should see the login page

## Additional Debugging

If the issue persists after following all steps above:

1. **Check Network Tab**: See if the signOut request is being sent to Supabase
2. **Check Supabase Dashboard**: Go to Authentication → Users and see if sessions are active
3. **Try Different Scope**: If `scope: 'local'` doesn't work, try without it or with `scope: 'global'`
4. **Check RLS Policies**: Verify policies are created by running the verification queries in the SQL script

## What to Share If Still Not Working

Please provide:
1. Console logs from when you press Sign Out
2. Any error messages
3. Output from the database verification queries
4. Whether navigation happens but still shows authenticated, or nothing happens at all

The updated code now has much better logging and error handling, so we should be able to pinpoint the exact issue from the console logs.
