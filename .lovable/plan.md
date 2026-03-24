

## Problem

The profile avatar is not showing the model's avatar because:

1. **Empty string fallback**: In `TikTokApp.tsx` line 1361, `avatar_url` falls back to `''` (empty string) instead of the default avatar. An empty string is truthy-enough to pass the `||` check in ProfileScreen, resulting in a broken image.

2. **Wrong fallback image**: `ProfileScreen.tsx` line 634 uses `/placeholder.svg` as fallback instead of the project's standard default avatar (`/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png`).

3. **No onError handler**: The avatar `<img>` in ProfileScreen has no `onError` handler, so if the URL fails to load, it shows a broken image.

4. **ProfileScreen doesn't fetch fresh avatar**: It relies entirely on the `user` prop. If the avatar was updated in the DB but the video's cached user data is stale, it won't reflect.

## Plan

### Step 1: Fix fallback avatar in TikTokApp enrichment
In `src/pages/TikTokApp.tsx`, change all instances where `avatar_url` falls back to empty string `''` to instead use the default avatar path `/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png`. Key locations:
- Line 1361: `avatar_url: ownerData.avatar_url || ''` -> use default
- Line 1188, 1278: similar empty fallbacks
- Line 1768: similar

### Step 2: Fix ProfileScreen avatar display
In `src/components/tiktok/ProfileScreen.tsx`:
- Line 634: Change fallback from `/placeholder.svg` to `/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png`
- Add `onError` handler to the avatar img to swap to default on load failure
- Add a `useEffect` that fetches the model/creator's current `avatar_url` from the database (`models` table or `profiles` table) when the profile opens, to ensure fresh data

### Step 3: Fix BottomInfo avatar consistency
Already uses the correct default. No changes needed.

## Technical Details

- The default avatar path is: `/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png`
- Models' avatars come from `models.avatar_url` (fetched via `select('*')`)
- Creators' avatars come from `profiles.avatar_url` (fetched via `select('id, name, email, avatar_url, bio')`)
- ProfileScreen should do a fresh DB fetch on mount to get the latest avatar

