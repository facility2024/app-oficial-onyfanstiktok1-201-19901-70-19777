

## Current Status

The avatar system is **working** - tested with reallorryy4 and bianca_noir, both show their correct CDN avatars. The `freshAvatar` DB fetch in ProfileScreen is functioning.

## Remaining Issue

The fallback image used across 14+ files (`/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png`) is a project-specific image. The user wants a clean, standard avatar placeholder.

## Plan

### Step 1: Create a default avatar constant
Create a shared constant file `src/constants/defaultAvatar.ts` with:
- `DEFAULT_AVATAR` pointing to a clean user silhouette placeholder (e.g., a simple SVG-based avatar or a new uploaded generic avatar image)
- This centralizes the fallback so future changes only need one edit

### Step 2: Replace all hardcoded fallback references
Update all 14 files that reference the current fallback image to use the new `DEFAULT_AVATAR` constant:
- `src/pages/TikTokApp.tsx` (5 instances)
- `src/components/tiktok/ProfileScreen.tsx` (2 instances)
- `src/components/tiktok/BottomInfo.tsx` (1 instance)
- `src/components/tiktok/SideMenu.tsx`
- `src/components/admin/AdminLive.tsx`
- `src/components/admin/AdminVideoCall.tsx`
- `src/components/admin/AdminCharts.tsx`
- `src/pages/VideoCallPage.tsx`
- `src/pages/LiveInterface.tsx`
- And other files with the same pattern

### Step 3: Add a proper generic placeholder SVG
Create `/public/default-avatar.svg` - a simple user silhouette icon (dark circle with white user icon), standard across social media platforms. This replaces the current project-specific image as the universal fallback.

### Step 4: Ensure freshAvatar resets between profiles
In `ProfileScreen.tsx`, reset `freshAvatar` to `null` when `user.id` changes so stale avatars from a previously viewed profile don't flash briefly.

## Technical Details
- New file: `src/constants/defaultAvatar.ts` exports `DEFAULT_AVATAR = '/default-avatar.svg'`
- New file: `public/default-avatar.svg` (generic user silhouette)
- All 14 files updated to import and use `DEFAULT_AVATAR` instead of the hardcoded path

