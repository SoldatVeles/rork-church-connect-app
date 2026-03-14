# Fix event creation getting stuck

**Problem**
- Creating an event gets stuck on "Creating Event..." and never completes
- The insert likely fails because the code sends both a `type` and `event_type` column — if one doesn't exist in the database, it silently fails
- Error messages may not be surfacing properly

**Fix**
- Remove the duplicate `type` column from the insert — only send `event_type` (which matches the database migrations)
- If the database also requires a `type` column (NOT NULL), provide a SQL script to either drop that constraint or set a default
- Add better error logging so failures are clearly shown to the user instead of getting stuck
- Ensure the mutation properly resets on failure so the button becomes usable again

**SQL script (if needed)**
- A small query to make the `type` column nullable or give it a default value, in case it still exists with a NOT NULL constraint
