# NammaRust Setup Guide (Firebase + Google Form)

This guide explains everything from scratch to make the app work end-to-end.

## 1. What you need before starting

1. A Google account.
2. A Firebase account (same Google account is fine).
3. A Netlify account (for hosting).
4. Your project files in this folder:
   - index.html
   - style.css
   - script.js

## 2. Create Firebase project from zero

1. Open Firebase Console.
2. Click Create a project.
3. Project name: NammaRust (or your preferred name).
4. Disable Google Analytics if you want a simpler setup.
5. Click Create project.

## 3. Register Web App and get config

1. In Firebase project overview, click the Web icon.
2. App nickname: nammarust-web.
3. Register app.
4. Firebase will show config values.
5. Copy these values into script.js inside FIREBASE_CONFIG:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId

## 4. Enable Google Authentication

1. In Firebase Console, open Authentication.
2. Click Get started.
3. Open Sign-in method tab.
4. Enable Google provider.
5. Add support email.
6. Save.

### Add authorized domains (important)

1. In Authentication settings, find Authorized domains.
2. Add your Netlify domain (for example your-site.netlify.app).
3. Add custom domain too, if you use one.
4. Keep localhost if you test locally.

## 5. Create Firestore database

1. Open Firestore Database.
2. Click Create database.
3. Start in Test mode for first boot (quick verification).
4. Choose a region close to your users.
5. Create.

After your app works, switch to stronger rules (section 9).

## 6. Firestore collections used by this app

This app uses these collections:

1. users
2. challenges
3. submissions
4. archives (created automatically for monthly archive)

Important: in Firestore, a collection exists only after at least one document is created.

### 6.1 Firestore field type quick reference

Use these Firestore types while creating attributes:

1. String
2. Number
3. Boolean
4. Timestamp
5. Map
6. Array

For this app, you mainly need String, Number, Timestamp, and Map.

### 6.2 Create users collection (step by step)

Recommended: do not manually add most users. The app creates or updates users on Google sign-in.

If you still want to create one manually:

1. Open Firestore Database.
2. Go to Data tab.
3. Click Start collection.
4. Collection ID: users
5. Document ID: set this to Firebase Auth UID (important for role checks).
6. Add fields exactly as below.
7. Click Save.

users fields and types:

1. userId: String (same value as document ID)
2. name: String
3. email: String
4. role: String (allowed values: user, admin, super_admin)
5. totalPoints: Number (start with 0)
6. tasksCompleted: Number (start with 0)
7. month: String (example: April 2026)
8. createdAt: Timestamp (optional if creating manually)
9. updatedAt: Timestamp (optional if creating manually)

### 6.3 Create challenges collection (step by step)

1. In Data tab, click Start collection (or Add document under existing collection).
2. Collection ID: challenges
3. Document ID: Auto-ID is fine.
4. Add fields below.
5. Save document.
6. Open saved document, copy generated document ID, then add id field with the same value.

challenges fields and types:

1. id: String (same as document ID)
2. title: String
3. description: String
4. difficulty: String (must be exactly one of Easy, Medium, Hard, Open)
5. requirements: String
6. month: String (must match app month format, example: April 2026)
7. createdAt: Timestamp
8. updatedAt: Timestamp

### 6.4 Create submissions collection (step by step)

Recommended: submissions should normally come from app form submission, not manual entry.

If you must seed one document manually:

1. In Data tab, click Start collection (or Add document).
2. Collection ID: submissions
3. Document ID: Auto-ID.
4. Add top-level fields below.
5. For scores, choose type Map and add child fields.
6. Save document.
7. Add id field equal to document ID.

submissions top-level fields and types:

1. id: String (same as document ID)
2. userId: String (must match users document ID)
3. userName: String
4. userEmail: String
5. taskId: String (challenge document ID)
6. taskTitle: String
7. github: String (URL)
8. explanation: String
9. linkedin: String (URL)
10. month: String (example: April 2026)
11. timestamp: Timestamp
12. totalScore: Number (start with 0 or computed value)
13. scoredBy: String (optional, admin uid)
14. scoredAt: Timestamp (optional)

scores map (inside submissions.scores):

1. solve: Number (0 to 10)
2. explanation: Number (0 to 10)
3. code: Number (0 to 5)
4. linkedin: Number (0 to 5)
5. bonus: Number (0 to 5)
6. penalty: Number (-10 to 0)

### 6.5 archives collection (auto-created by app)

You do not need to create this manually. App writes here during monthly reset/archive.

archives fields and types:

1. type: String (user_monthly_archive)
2. userId: String
3. month: String
4. totalPoints: Number
5. tasksCompleted: Number
6. archivedAt: Timestamp

### 6.6 Minimum data to make UI non-empty

After config is done, at minimum do this:

1. Sign in once with Google to create your users document.
2. Add at least one challenges document for current month (example: April 2026).
3. Submit one form entry from the app to create a submissions document.

If month string does not exactly match current app month label, data will not appear in UI.

## 7. Set first super admin

In script.js, set APP_CONFIG.bootstrapSuperAdminEmail to your email.

Example:

~~~js
const APP_CONFIG = {
  bootstrapSuperAdminEmail: "you@example.com",
};
~~~

Then:

1. Start app.
2. Sign in using that Google account.
3. Check Firestore users collection.
4. Confirm your role is super_admin.

After that, you can keep this value or remove it.

## 8. Create Google Form for submissions

Google Form is used as external submission record. Firestore still stores metadata and scores.

### 8.1 Create form

1. Open Google Forms.
2. Create a new blank form.
3. Add these fields in this order:
   - Name (Short answer)
   - Email (Short answer)
   - GitHub link (Short answer)
   - Explanation (Paragraph)
   - Task selection (Short answer)
   - LinkedIn link (Short answer)
4. Make all required.

### 8.2 Get form action URL

1. Open the form in editor.
2. Copy form URL.
3. It looks like this:
   https://docs.google.com/forms/d/e/FORM_ID/viewform
4. Convert it to:
   https://docs.google.com/forms/d/e/FORM_ID/formResponse

This is your actionUrl.

### 8.3 Get entry IDs

1. In Google Form editor, click three-dot menu.
2. Click Get pre-filled link.
3. Fill sample values and click Get link.
4. Open generated link and inspect query params.
5. You will see keys like entry.123456789.
6. Map them to fields in script.js GOOGLE_FORM_CONFIG.fields:
   - name
   - email
   - github
   - explanation
   - task
   - linkedin

### 8.4 Update app config

Update script.js:

~~~js
const GOOGLE_FORM_CONFIG = {
  actionUrl: "https://docs.google.com/forms/d/e/FORM_ID/formResponse",
  fields: {
    name: "entry.xxxxx",
    email: "entry.xxxxx",
    github: "entry.xxxxx",
    explanation: "entry.xxxxx",
    task: "entry.xxxxx",
    linkedin: "entry.xxxxx",
  },
};
~~~

## 9. Firestore security rules

Because this is a client-only app, there is a tradeoff between strict security and convenience.

### 9.1 First boot rules (easy, fast testing)

Use these only for initial bring-up:

~~~txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
~~~

### 9.2 Recommended stronger rules (after first verification)

Use this baseline to protect role and admin actions:

~~~txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function me() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function role() {
      return signedIn() && me().data.role != null ? me().data.role : "user";
    }

    function isAdmin() {
      return signedIn() && (role() == "admin" || role() == "super_admin");
    }

    function isSuperAdmin() {
      return signedIn() && role() == "super_admin";
    }

    match /users/{userId} {
      allow read: if signedIn();
      allow create: if signedIn() && request.auth.uid == userId;

      allow update: if
        (signedIn() && request.auth.uid == userId
         && request.resource.data.role == resource.data.role)
        || isSuperAdmin();

      allow delete: if isSuperAdmin();
    }

    match /challenges/{challengeId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /submissions/{submissionId} {
      allow read: if isAdmin() || (signedIn() && resource.data.userId == request.auth.uid);

      allow create: if signedIn() && request.resource.data.userId == request.auth.uid;

      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    match /archives/{archiveId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if false;
    }
  }
}
~~~

Important note:

The current app computes leaderboard totals on client side. For strict anti-cheat fairness, move leaderboard updates to Firebase Cloud Functions later.

## 10. Composite indexes

You may get an index error for multi-field queries.

If Firebase shows an error with a Create index link:

1. Click the generated link.
2. Create the index.
3. Wait until index is ready.
4. Retry.

Possible query needing composite index in this app:

- submissions with userId + taskId + month

## 11. Update placeholders in your app file

Edit script.js and replace all placeholders:

1. FIREBASE_CONFIG values
2. APP_CONFIG.bootstrapSuperAdminEmail
3. GOOGLE_FORM_CONFIG.actionUrl
4. GOOGLE_FORM_CONFIG.fields entries

## 12. Local testing checklist

1. Open app using a local server (not file double-click).
2. Click Sign in with Google.
3. Confirm users document appears in Firestore.
4. Add a challenge from Admin Dashboard.
5. Submit a task from submission page.
6. Confirm:
   - response appears in Google Form responses
   - submission document appears in Firestore
7. Score from admin panel.
8. Confirm leaderboard updates.

## 13. Netlify deployment steps

1. Push project to GitHub.
2. In Netlify, Add new site from Git.
3. Build command: leave empty (static site).
4. Publish directory: project root.
5. Deploy.
6. Copy netlify domain.
7. Add this domain in Firebase Auth authorized domains.
8. Retest login and submission on live site.

## 14. Monthly reset behavior in this app

Current logic:

1. App calculates current month as Month Year.
2. On day 1, resetMonthlyView archives old user points and resets monthly counters.
3. Old data is archived, not deleted.

Important:

This runs from client session. For guaranteed monthly automation even when nobody opens app, schedule a Cloud Function in future.

## 15. Common issues and fixes

1. Error: auth/unauthorized-domain
   - Add your domain in Firebase Auth authorized domains.

2. Error: Missing or insufficient permissions
   - Firestore rules are too strict for current action.
   - Start with first-boot rules, then tighten gradually.

3. Google Form not receiving values
   - Wrong actionUrl or wrong entry IDs.
   - Re-check pre-filled link mapping.

4. Admin page locked for expected admin
   - Verify users role field for that uid.
   - Ensure role is admin or super_admin.

5. Duplicate submission blocked
   - App intentionally blocks same user + same task + same month.

## 16. Final production hardening roadmap

1. Move score and leaderboard calculation to Cloud Functions.
2. Enforce stricter Firestore rules.
3. Add audit logs for admin scoring changes.
4. Add server timestamps for all critical writes.
5. Add backup strategy for Firestore and Form responses.

## 17. Production files now included in this project

The project now includes production-oriented config files:

1. firestore.rules
2. firestore.indexes.json
3. netlify.toml
4. PRODUCTION_QA.md

### 17.1 Deploy Firestore rules and indexes

If Firebase CLI is installed and project is initialized, run:

~~~bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
~~~

### 17.2 Netlify

netlify.toml is already prepared with:

1. SPA redirect handling
2. Security headers (CSP, X-Frame-Options, etc.)
3. Basic cache headers for html/css/js

---

If you want, next step I can create:

1. A ready-to-paste Firestore indexes file.
2. A strict Cloud Function plan for secure leaderboard updates.
3. A pre-launch QA checklist for admin workflows.
