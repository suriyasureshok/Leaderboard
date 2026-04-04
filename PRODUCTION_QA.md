# NammaRust Production QA Matrix

This checklist is designed for final verification against Firebase Auth, Firestore, and Google Form integration.

## 1. Automated Checks Run In Workspace

1. JavaScript syntax check: passed
2. HTML diagnostics: passed
3. CSS diagnostics: passed
4. Security hardening artifacts present:
   - netlify.toml
   - firestore.rules
   - firestore.indexes.json

## 2. Pre-Flight Configuration Checks

1. Firebase Auth Google provider enabled.
2. Authorized domains include:
   - localhost
   - 127.0.0.1
   - your Netlify domain
3. Firestore rules deployed from firestore.rules.
4. Firestore indexes deployed from firestore.indexes.json.
5. Google Form action URL and entry IDs mapped in script.js.

## 3. Core Functional Tests

### A. Authentication

1. Sign in with Google from localhost.
   - Expected: user badge visible, logout shown, users doc created/updated.
2. Sign out.
   - Expected: user badge hidden, login button visible.
3. Unauthorized domain behavior.
   - Expected: clear error notice with hostname to add.
4. Popup blocked behavior.
   - Expected: fallback to redirect sign-in.

### B. Challenge Management (Admin)

1. Add challenge with valid fields.
   - Expected: challenge appears in correct difficulty section.
2. Add duplicate challenge (same title + difficulty + month).
   - Expected: blocked with validation error.
3. Edit challenge.
   - Expected: updated values visible in user and admin views.
4. Delete challenge.
   - Expected: removed from all views.
5. Invalid month format test (example Apr 2026).
   - Expected: blocked; requires format Month YYYY.

### C. Submission Flow

1. Submit valid data.
   - Expected: Firestore submission created; Google Form receives record.
2. Submit with invalid GitHub URL.
   - Expected: blocked.
3. Submit with non-GitHub URL.
   - Expected: blocked.
4. Submit with invalid LinkedIn URL.
   - Expected: blocked.
5. Submit with short explanation (<30 chars).
   - Expected: blocked.
6. Repeat submission for same task+month.
   - Expected: blocked by deterministic submission ID.

### D. Score Management (Admin)

1. Score all fields within limits.
   - Expected: totalScore recalculated and saved.
2. Input out-of-range values.
   - Expected: values clamped to allowed range.
3. Score stale submission row.
   - Expected: blocked with stale-view message.

### E. Leaderboard

1. Leaderboard renders sorted by points desc.
2. Tie handling:
   - Expected: tasksCompleted desc, then name asc.
3. Top-3 highlight visible.
4. Non-admin user view:
   - Expected: leaderboard view works without requiring aggregate writes.

### F. Role Management (Super Admin)

1. Add admin by email.
2. Remove admin by email.
3. Transfer super admin.
4. Transfer super admin to same current user.
   - Expected: no-op validation error.
5. Attempt role action as normal admin.
   - Expected: blocked.

### G. Monthly Logic

1. Current month label shown as Month YYYY.
2. On day 1, admin login triggers monthly reset workflow.
3. Non-admin should not trigger global reset writes.

## 4. Edge Case Matrix

1. Offline during submission.
   - Expected: submission blocked with offline notice.
2. Firestore permission denied.
   - Expected: auth still shown, actionable rule error notice displayed.
3. Invalid data in Firestore (malformed URLs, script tags, long text).
   - Expected: safely rendered (escaped text), invalid URL not clickable.
4. Empty collections.
   - Expected: clean empty state messages.
5. Browser refresh after sign-in.
   - Expected: session persists.

## 5. Security Validation

1. Confirm CSP headers are active on Netlify response.
2. Verify frame and content-type hardening headers are active.
3. Confirm non-admin cannot create/edit/delete challenges.
4. Confirm non-admin cannot update submission scores.
5. Confirm user cannot self-promote role in users collection.

## 6. Deployment Smoke Test

1. Deploy to Netlify.
2. Open live URL.
3. Perform one full cycle:
   - Sign in
   - Add challenge (admin)
   - Submit entry (user)
   - Score entry (admin)
   - Verify leaderboard update

## 7. Exit Criteria

Release only when all sections A-G pass without critical defects and security validation passes on live domain.
