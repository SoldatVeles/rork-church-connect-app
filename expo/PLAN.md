# Fix empty member list when assigning Sabbath roles

**Problem**
When trying to assign a member to a Sabbath role, the member list shows empty because the app is looking for a database table (`group_members`) that doesn't exist.

**Fix**
- Update the member fetching logic to pull members from the correct source: users whose home church matches the Sabbath's church group (using `profiles.home_group_id`)
- As a fallback, also include users who are pastors of that group (from `group_pastors`)
- This ensures all relevant church members appear in the assignment picker

**What changes**
- The member list modal will now correctly show all members belonging to the church group
- No database changes needed — this uses existing data