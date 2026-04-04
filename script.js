import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Replace placeholder values with your Firebase project credentials.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5FjkNJvivu1y2SbkykKiuaZJ1mfDBFYA",
  authDomain: "nammarust-c5c21.firebaseapp.com",
  projectId: "nammarust-c5c21",
  storageBucket: "nammarust-c5c21.firebasestorage.app",
  messagingSenderId: "66110495769",
  appId: "1:66110495769:web:9215d0122f527e2d409e88",
};

// Optional: use this for first-time bootstrapping of the super admin role.
const APP_CONFIG = {
  bootstrapSuperAdminEmail: "suriyasureshkumarkannian@gmail.com",
};

// Replace with Google Form action URL and entry IDs.
const GOOGLE_FORM_CONFIG = {
  actionUrl: "https://docs.google.com/forms/d/e/1FAIpQLSe1km1PmeIqhv_VkETrK2x7CxaeVIgere2xAMP2hzUTyF7KXw/formResponse",
  fields: {
    name: "entry.32089814",
    email: "entry.247825103",
    github: "entry.1069193195",
    explanation: "entry.1280007688",
    task: "entry.949126181",
    linkedin: "entry.1126576832",
  },
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard", "Open"];
const SCORE_LIMITS = {
  solve: { min: 0, max: 10 },
  explanation: { min: 0, max: 10 },
  code: { min: 0, max: 5 },
  linkedin: { min: 0, max: 5 },
  bonus: { min: 0, max: 5 },
  penalty: { min: -10, max: 0 },
};

const state = {
  currentMonth: "",
  currentUser: null,
  currentRole: "user",
  challenges: [],
  submissions: [],
  users: [],
};

const dom = {
  pages: Array.from(document.querySelectorAll(".page")),
  navLinks: Array.from(document.querySelectorAll("[data-route-link]")),
  menuToggle: document.getElementById("menuToggle"),
  mainNav: document.getElementById("mainNav"),
  currentMonthLabel: document.getElementById("currentMonthLabel"),

  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  userBadge: document.getElementById("userBadge"),
  userName: document.getElementById("userName"),
  userRole: document.getElementById("userRole"),
  adminNavLink: document.getElementById("adminNavLink"),

  easyChallenges: document.getElementById("easyChallenges"),
  mediumChallenges: document.getElementById("mediumChallenges"),
  hardChallenges: document.getElementById("hardChallenges"),
  openChallenges: document.getElementById("openChallenges"),
  emptyStateTemplate: document.getElementById("emptyStateTemplate"),

  submissionForm: document.getElementById("submissionForm"),
  submitName: document.getElementById("submitName"),
  submitEmail: document.getElementById("submitEmail"),
  taskSelect: document.getElementById("taskSelect"),
  githubLink: document.getElementById("githubLink"),
  explanation: document.getElementById("explanation"),
  linkedinLink: document.getElementById("linkedinLink"),
  submissionNotice: document.getElementById("submissionNotice"),

  leaderboardBody: document.getElementById("leaderboardBody"),
  topThree: document.getElementById("topThree"),

  adminPage: document.getElementById("adminPage"),
  adminLocked: document.getElementById("adminLocked"),
  adminContent: document.getElementById("adminContent"),
  tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
  adminPanels: Array.from(document.querySelectorAll("[data-admin-panel]")),

  challengeForm: document.getElementById("challengeForm"),
  challengeId: document.getElementById("challengeId"),
  challengeTitle: document.getElementById("challengeTitle"),
  challengeDescription: document.getElementById("challengeDescription"),
  challengeDifficulty: document.getElementById("challengeDifficulty"),
  challengeRequirements: document.getElementById("challengeRequirements"),
  challengeMonth: document.getElementById("challengeMonth"),
  challengeResetBtn: document.getElementById("challengeResetBtn"),
  challengeNotice: document.getElementById("challengeNotice"),
  adminChallengeBody: document.getElementById("adminChallengeBody"),

  adminSubmissionBody: document.getElementById("adminSubmissionBody"),

  adminTabAdmins: document.getElementById("adminTabAdmins"),
  superAdminPanel: document.getElementById("superAdminPanel"),
  adminRoleForm: document.getElementById("adminRoleForm"),
  adminTargetEmail: document.getElementById("adminTargetEmail"),
  adminRoleAction: document.getElementById("adminRoleAction"),
  adminRoleNotice: document.getElementById("adminRoleNotice"),
  usersRoleBody: document.getElementById("usersRoleBody"),
};

let firebaseApp = null;
let auth = null;
let db = null;
let provider = null;
let authBusy = false;

function hasFirebaseConfig() {
  return Object.values(FIREBASE_CONFIG).every((value) => value && !String(value).includes("YOUR_"));
}

function isGoogleFormConfigured() {
  return (
    GOOGLE_FORM_CONFIG.actionUrl &&
    !GOOGLE_FORM_CONFIG.actionUrl.includes("YOUR_GOOGLE_FORM_ID") &&
    Object.values(GOOGLE_FORM_CONFIG.fields).every(
      (value) => value && String(value).startsWith("entry.") && !String(value).includes("YOUR_")
    )
  );
}

function normalizeMonthLabel(date = new Date()) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function setNotice(target, message, isError = false) {
  if (!target) return;
  target.textContent = message;
  target.style.color = isError ? "#ff8f8f" : "#ff9a62";
}

function showPage(routeName) {
  const route = routeName || "home";
  dom.pages.forEach((page) => {
    const shouldShow = page.dataset.page === route;
    page.classList.toggle("hidden", !shouldShow);
  });

  dom.navLinks.forEach((link) => {
    const hrefRoute = link.getAttribute("href")?.replace("#", "") || "home";
    link.classList.toggle("active", hrefRoute === route);
  });

  if (route === "submit" && !state.currentUser) {
    setNotice(dom.submissionNotice, "Please sign in to submit your challenge.", true);
  }

  updateAdminAccessView();
}

function routeFromHash() {
  const raw = window.location.hash.replace("#", "").trim();
  if (!raw) return "home";

  const allowed = ["home", "challenges", "submit", "leaderboard", "start-here", "admin"];
  return allowed.includes(raw) ? raw : "home";
}

function bindNavigation() {
  window.addEventListener("hashchange", () => showPage(routeFromHash()));
  dom.menuToggle.addEventListener("click", () => dom.mainNav.classList.toggle("open"));

  dom.navLinks.forEach((link) => {
    link.addEventListener("click", () => dom.mainNav.classList.remove("open"));
  });
}

function updateAuthUi() {
  const signedIn = Boolean(state.currentUser);
  dom.loginBtn.classList.toggle("hidden", signedIn);
  dom.logoutBtn.classList.toggle("hidden", !signedIn);
  dom.userBadge.classList.toggle("hidden", !signedIn);

  dom.adminNavLink.classList.toggle("hidden", !isAdminRole());

  if (signedIn) {
    dom.userName.textContent = state.currentUser.displayName || "Community Member";
    dom.userRole.textContent = state.currentRole;
    dom.submitName.value = state.currentUser.displayName || "";
    dom.submitEmail.value = state.currentUser.email || "";
  } else {
    dom.userName.textContent = "Guest";
    dom.userRole.textContent = "user";
    dom.submitName.value = "";
    dom.submitEmail.value = "";
  }
}

function isAdminRole() {
  return state.currentRole === "admin" || state.currentRole === "super_admin";
}

function isSuperAdminRole() {
  return state.currentRole === "super_admin";
}

function updateAdminAccessView() {
  const onAdminPage = routeFromHash() === "admin";
  const canAccess = isAdminRole();

  dom.adminLocked.classList.toggle("hidden", !onAdminPage || canAccess);
  dom.adminContent.classList.toggle("hidden", !onAdminPage || !canAccess);

  dom.adminTabAdmins.classList.toggle("hidden", !isSuperAdminRole());
  dom.superAdminPanel.classList.toggle("hidden", !isSuperAdminRole());

  if (!canAccess && onAdminPage) {
    dom.adminPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.adminPanel !== "challenge"));
  }
}

function switchAdminPanel(panelName) {
  dom.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminView === panelName);
  });

  dom.adminPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.adminPanel !== panelName);
  });
}

function challengeContainerByDifficulty(difficulty) {
  const normalized = String(difficulty || "").toLowerCase();
  if (normalized === "easy") return dom.easyChallenges;
  if (normalized === "medium") return dom.mediumChallenges;
  if (normalized === "hard") return dom.hardChallenges;
  return dom.openChallenges;
}

function difficultyTagClass(difficulty) {
  const normalized = String(difficulty || "").toLowerCase();
  if (normalized === "easy") return "easy";
  if (normalized === "medium") return "medium";
  if (normalized === "hard") return "hard";
  return "open";
}

function renderEmptyChallengeState(container) {
  container.innerHTML = "";
  container.appendChild(dom.emptyStateTemplate.content.cloneNode(true));
}

function renderChallenges() {
  const difficultyBuckets = {
    easy: [],
    medium: [],
    hard: [],
    open: [],
  };

  state.challenges.forEach((challenge) => {
    const key = String(challenge.difficulty || "open").toLowerCase();
    if (key.includes("easy")) difficultyBuckets.easy.push(challenge);
    else if (key.includes("medium")) difficultyBuckets.medium.push(challenge);
    else if (key.includes("hard")) difficultyBuckets.hard.push(challenge);
    else difficultyBuckets.open.push(challenge);
  });

  const mapping = [
    { key: "easy", container: dom.easyChallenges },
    { key: "medium", container: dom.mediumChallenges },
    { key: "hard", container: dom.hardChallenges },
    { key: "open", container: dom.openChallenges },
  ];

  mapping.forEach(({ key, container }) => {
    container.innerHTML = "";
    if (!difficultyBuckets[key].length) {
      renderEmptyChallengeState(container);
      return;
    }

    difficultyBuckets[key].forEach((challenge) => {
      const card = document.createElement("article");
      card.className = "challenge-card";
      card.innerHTML = `
        <div class="meta">
          <span class="tag ${difficultyTagClass(challenge.difficulty)}">${challenge.difficulty}</span>
          <span class="challenge-code">${challenge.month}</span>
        </div>
        <h4>${challenge.title}</h4>
        <p>${challenge.description}</p>
        <p><strong>Requirements:</strong> ${challenge.requirements}</p>
        <p><strong>Deadline bonus:</strong> Same day +5 | Next day +2</p>
        <button class="small-btn save" data-submit-task="${challenge.id}">Submit for this task</button>
      `;
      container.appendChild(card);
    });
  });

  populateTaskSelect();
  renderAdminChallengeTable();
}

function populateTaskSelect() {
  dom.taskSelect.innerHTML = '<option value="">Select a challenge</option>';
  state.challenges.forEach((challenge) => {
    const option = document.createElement("option");
    option.value = challenge.id;
    option.textContent = `${challenge.title} (${challenge.difficulty})`;
    dom.taskSelect.appendChild(option);
  });
}

function renderLeaderboard(rows) {
  dom.leaderboardBody.innerHTML = "";
  dom.topThree.innerHTML = "";

  if (!rows.length) {
    dom.leaderboardBody.innerHTML = `
      <tr>
        <td colspan="4">No leaderboard data for ${state.currentMonth} yet.</td>
      </tr>
    `;
    return;
  }

  rows.slice(0, 3).forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "top-card";
    card.innerHTML = `
      <small>#${index + 1}</small>
      <h3>${entry.name}</h3>
      <p>${entry.totalPoints} pts</p>
      <small>${entry.tasksCompleted} tasks</small>
    `;
    dom.topThree.appendChild(card);
  });

  rows.forEach((entry, index) => {
    const rank = index + 1;
    const row = document.createElement("tr");
    const rankClass = rank <= 3 ? `rank-top-${rank}` : "";
    row.innerHTML = `
      <td class="${rankClass}">${rank}</td>
      <td>${entry.name}</td>
      <td>${entry.totalPoints}</td>
      <td>${entry.tasksCompleted}</td>
    `;
    dom.leaderboardBody.appendChild(row);
  });
}

function renderAdminChallengeTable() {
  dom.adminChallengeBody.innerHTML = "";

  if (!state.challenges.length) {
    dom.adminChallengeBody.innerHTML = `
      <tr>
        <td colspan="4">No challenge available yet</td>
      </tr>
    `;
    return;
  }

  state.challenges.forEach((challenge) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${challenge.title}</td>
      <td>${challenge.difficulty}</td>
      <td>${challenge.month}</td>
      <td>
        <button class="small-btn" data-edit-challenge="${challenge.id}">Edit</button>
        <button class="small-btn delete" data-delete-challenge="${challenge.id}">Delete</button>
      </td>
    `;
    dom.adminChallengeBody.appendChild(row);
  });
}

function getNumericField(value, limits) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(limits.max, Math.max(limits.min, parsed));
}

function normalizeScorePayload(raw) {
  return {
    solve: getNumericField(raw.solve, SCORE_LIMITS.solve),
    explanation: getNumericField(raw.explanation, SCORE_LIMITS.explanation),
    code: getNumericField(raw.code, SCORE_LIMITS.code),
    linkedin: getNumericField(raw.linkedin, SCORE_LIMITS.linkedin),
    bonus: getNumericField(raw.bonus, SCORE_LIMITS.bonus),
    penalty: getNumericField(raw.penalty, SCORE_LIMITS.penalty),
  };
}

function getSubmissionScore(submission, key) {
  const scores = submission.scores || {};
  if (typeof scores[key] === "number") return scores[key];

  if (key === "code" && typeof scores.code_quality_score === "number") return scores.code_quality_score;
  if (key === "linkedin" && typeof scores.linkedin_score === "number") return scores.linkedin_score;
  if (key === "bonus" && typeof scores.time_bonus === "number") return scores.time_bonus;
  if (key === "solve" && typeof scores.solve_score === "number") return scores.solve_score;
  if (key === "explanation" && typeof scores.explanation_score === "number") return scores.explanation_score;
  return 0;
}

function calculateScore(scores) {
  const safeScores = normalizeScorePayload(scores);
  return (
    safeScores.solve +
    safeScores.explanation +
    safeScores.code +
    safeScores.linkedin +
    safeScores.bonus +
    safeScores.penalty
  );
}

function formatTimestamp(value) {
  if (!value) return "-";
  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function renderAdminSubmissions() {
  dom.adminSubmissionBody.innerHTML = "";

  if (!state.submissions.length) {
    dom.adminSubmissionBody.innerHTML = `
      <tr>
        <td colspan="5">No submissions found for ${state.currentMonth}.</td>
      </tr>
    `;
    return;
  }

  state.submissions.forEach((submission) => {
    const scores = {
      solve: getSubmissionScore(submission, "solve"),
      explanation: getSubmissionScore(submission, "explanation"),
      code: getSubmissionScore(submission, "code"),
      linkedin: getSubmissionScore(submission, "linkedin"),
      bonus: getSubmissionScore(submission, "bonus"),
      penalty: getSubmissionScore(submission, "penalty"),
    };

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${submission.userName || "Unknown"}</strong>
        <br />
        <small>${submission.userEmail || "-"}</small>
      </td>
      <td>${submission.taskTitle || submission.taskId}</td>
      <td><a href="${submission.github}" target="_blank" rel="noreferrer">Open</a></td>
      <td>${formatTimestamp(submission.timestamp)}</td>
      <td>
        <form class="score-form" data-submission-id="${submission.id}">
          <div class="score-grid">
            <label>Solve (0-10)<input name="solve" type="number" min="0" max="10" value="${scores.solve}" /></label>
            <label>Explanation (0-10)<input name="explanation" type="number" min="0" max="10" value="${scores.explanation}" /></label>
            <label>Code (0-5)<input name="code" type="number" min="0" max="5" value="${scores.code}" /></label>
            <label>LinkedIn (0-5)<input name="linkedin" type="number" min="0" max="5" value="${scores.linkedin}" /></label>
            <label>Bonus (0-5)<input name="bonus" type="number" min="0" max="5" value="${scores.bonus}" /></label>
            <label>Penalty (-10 to 0)<input name="penalty" type="number" min="-10" max="0" value="${scores.penalty}" /></label>
          </div>
          <div class="score-actions">
            <button type="submit" class="small-btn save">Save Score</button>
            <span class="mono">Current: ${submission.totalScore || calculateScore(scores)} pts</span>
          </div>
        </form>
      </td>
    `;
    dom.adminSubmissionBody.appendChild(row);
  });
}

function renderUsersRoleTable() {
  dom.usersRoleBody.innerHTML = "";

  if (!state.users.length) {
    dom.usersRoleBody.innerHTML = `
      <tr>
        <td colspan="4">No users found.</td>
      </tr>
    `;
    return;
  }

  state.users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.name || "-"}</td>
      <td>${user.email || "-"}</td>
      <td>${user.role || "user"}</td>
      <td>${user.totalPoints || 0}</td>
    `;
    dom.usersRoleBody.appendChild(row);
  });
}

async function signInWithGoogle() {
  if (!auth || !provider) {
    setNotice(dom.submissionNotice, "Firebase is not configured yet.", true);
    return;
  }

  if (authBusy) return;

  authBusy = true;
  dom.loginBtn.disabled = true;
  dom.loginBtn.textContent = "Signing in...";

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);

    // Popup flows can be blocked on some browsers/dev setups. Fallback to redirect.
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") {
      setNotice(dom.submissionNotice, "Popup was blocked. Switching to redirect sign-in...", true);
      await signInWithRedirect(auth, provider);
      return;
    }

    if (error?.code === "auth/unauthorized-domain") {
      const host = window.location.hostname || "current-host";
      setNotice(
        dom.submissionNotice,
        `This domain is not authorized in Firebase Auth. Add ${host} in Firebase Console > Authentication > Settings > Authorized domains.`,
        true
      );
      return;
    }

    if (error?.code === "auth/operation-not-allowed") {
      setNotice(dom.submissionNotice, "Google Sign-In is disabled in Firebase Authentication provider settings.", true);
      return;
    }

    if (error?.code === "auth/popup-closed-by-user") {
      setNotice(dom.submissionNotice, "Sign-in popup was closed before completion.", true);
      return;
    }

    setNotice(dom.submissionNotice, `Google sign-in failed (${error?.code || "unknown"}).`, true);
  } finally {
    authBusy = false;
    dom.loginBtn.disabled = false;
    dom.loginBtn.textContent = "Sign in with Google";
  }
}

async function signOut() {
  if (!auth) return;

  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error(error);
    setNotice(dom.submissionNotice, "Could not sign out right now.", true);
  }
}

async function checkUserRole(userId) {
  if (!db) return "user";

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return "user";

  return userSnap.data().role || "user";
}

async function upsertUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  const shouldBootstrapSuperAdmin =
    APP_CONFIG.bootstrapSuperAdminEmail &&
    user.email &&
    user.email.toLowerCase() === APP_CONFIG.bootstrapSuperAdminEmail.toLowerCase();

  const baseData = {
    userId: user.uid,
    name: user.displayName || "NammaRust Member",
    email: user.email || "",
    month: state.currentMonth,
    updatedAt: serverTimestamp(),
  };

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      ...baseData,
      role: shouldBootstrapSuperAdmin ? "super_admin" : "user",
      totalPoints: 0,
      tasksCompleted: 0,
      createdAt: serverTimestamp(),
    });
    return;
  }

  const existingData = userSnap.data();
  const updates = { ...baseData };

  if (!existingData.role) updates.role = "user";

  // Preserve old month stats by archiving before reset.
  if (existingData.month && existingData.month !== state.currentMonth) {
    await addDoc(collection(db, "archives"), {
      type: "user_monthly_archive",
      userId: user.uid,
      month: existingData.month,
      totalPoints: existingData.totalPoints || 0,
      tasksCompleted: existingData.tasksCompleted || 0,
      archivedAt: serverTimestamp(),
    });

    updates.totalPoints = 0;
    updates.tasksCompleted = 0;
  }

  await setDoc(userRef, updates, { merge: true });
}

async function fetchChallenges() {
  if (!db) {
    state.challenges = [];
    renderChallenges();
    return [];
  }

  const challengeQuery = query(collection(db, "challenges"), where("month", "==", state.currentMonth));
  const snapshot = await getDocs(challengeQuery);

  state.challenges = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
      const diff = DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });

  renderChallenges();
  return state.challenges;
}

async function submitToGoogleForm(payload) {
  if (!isGoogleFormConfigured()) {
    throw new Error("Google Form is not configured. Update GOOGLE_FORM_CONFIG in script.js.");
  }

  const body = new URLSearchParams();
  body.append(GOOGLE_FORM_CONFIG.fields.name, payload.name);
  body.append(GOOGLE_FORM_CONFIG.fields.email, payload.email);
  body.append(GOOGLE_FORM_CONFIG.fields.github, payload.github);
  body.append(GOOGLE_FORM_CONFIG.fields.explanation, payload.explanation);
  body.append(GOOGLE_FORM_CONFIG.fields.task, payload.taskTitle);
  body.append(GOOGLE_FORM_CONFIG.fields.linkedin, payload.linkedin);

  await fetch(GOOGLE_FORM_CONFIG.actionUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: body.toString(),
  });
}

async function saveSubmission(payload) {
  if (!db) throw new Error("Firebase is not configured.");

  const duplicateCheck = query(
    collection(db, "submissions"),
    where("userId", "==", payload.userId),
    where("taskId", "==", payload.taskId),
    where("month", "==", state.currentMonth)
  );

  const duplicateSnap = await getDocs(duplicateCheck);
  if (!duplicateSnap.empty) {
    throw new Error("You have already submitted this challenge for the current month.");
  }

  const submissionRef = await addDoc(collection(db, "submissions"), {
    userId: payload.userId,
    userName: payload.name,
    userEmail: payload.email,
    taskId: payload.taskId,
    taskTitle: payload.taskTitle,
    github: payload.github,
    explanation: payload.explanation,
    linkedin: payload.linkedin,
    month: state.currentMonth,
    timestamp: serverTimestamp(),
    scores: {
      solve: 0,
      explanation: 0,
      code: 0,
      linkedin: 0,
      bonus: 0,
      penalty: 0,
    },
    totalScore: 0,
  });

  await updateDoc(submissionRef, { id: submissionRef.id });
  return submissionRef.id;
}

async function updateLeaderboard() {
  if (!db) {
    state.users = [];
    renderLeaderboard([]);
    return [];
  }

  const [usersSnap, submissionsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(query(collection(db, "submissions"), where("month", "==", state.currentMonth))),
  ]);

  const aggregate = {};
  submissionsSnap.docs.forEach((submissionDoc) => {
    const submission = { id: submissionDoc.id, ...submissionDoc.data() };
    const userId = submission.userId;
    if (!aggregate[userId]) {
      aggregate[userId] = {
        userId,
        name: submission.userName || "Participant",
        email: submission.userEmail || "",
        totalPoints: 0,
        tasksCompleted: 0,
      };
    }

    const scoreFromDocument =
      typeof submission.totalScore === "number"
        ? submission.totalScore
        : calculateScore({
            solve: getSubmissionScore(submission, "solve"),
            explanation: getSubmissionScore(submission, "explanation"),
            code: getSubmissionScore(submission, "code"),
            linkedin: getSubmissionScore(submission, "linkedin"),
            bonus: getSubmissionScore(submission, "bonus"),
            penalty: getSubmissionScore(submission, "penalty"),
          });

    aggregate[userId].totalPoints += scoreFromDocument;
    aggregate[userId].tasksCompleted += 1;
  });

  const batch = writeBatch(db);
  const rows = usersSnap.docs.map((userDoc) => {
    const user = userDoc.data();
    const calc = aggregate[userDoc.id] || {
      userId: userDoc.id,
      name: user.name || "Community Member",
      email: user.email || "",
      totalPoints: 0,
      tasksCompleted: 0,
    };

    const entry = {
      userId: userDoc.id,
      name: calc.name || user.name || "Community Member",
      email: calc.email || user.email || "",
      role: user.role || "user",
      totalPoints: calc.totalPoints,
      tasksCompleted: calc.tasksCompleted,
      month: state.currentMonth,
    };

    batch.set(
      userDoc.ref,
      {
        totalPoints: entry.totalPoints,
        tasksCompleted: entry.tasksCompleted,
        month: state.currentMonth,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return entry;
  });

  await batch.commit();

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.tasksCompleted !== a.tasksCompleted) return b.tasksCompleted - a.tasksCompleted;
    return a.name.localeCompare(b.name);
  });

  state.users = rows;
  renderLeaderboard(rows);
  if (isSuperAdminRole()) renderUsersRoleTable();
  return rows;
}

async function fetchMonthlySubmissions() {
  if (!db || !isAdminRole()) {
    state.submissions = [];
    renderAdminSubmissions();
    return [];
  }

  const submissionQuery = query(collection(db, "submissions"), where("month", "==", state.currentMonth));
  const submissionSnap = await getDocs(submissionQuery);

  state.submissions = submissionSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    });

  renderAdminSubmissions();
  return state.submissions;
}

async function refreshRoleTable() {
  if (!db || !isSuperAdminRole()) {
    state.users = state.users.map((user) => ({ ...user }));
    renderUsersRoleTable();
    return;
  }

  const usersSnap = await getDocs(collection(db, "users"));
  state.users = usersSnap.docs.map((docSnap) => ({
    userId: docSnap.id,
    ...docSnap.data(),
  }));

  state.users.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  renderUsersRoleTable();
}

function clearChallengeForm() {
  dom.challengeId.value = "";
  dom.challengeTitle.value = "";
  dom.challengeDescription.value = "";
  dom.challengeDifficulty.value = "Easy";
  dom.challengeRequirements.value = "";
  dom.challengeMonth.value = state.currentMonth;
}

async function handleChallengeSubmit(event) {
  event.preventDefault();
  if (!isAdminRole()) {
    setNotice(dom.challengeNotice, "Only admins can manage challenges.", true);
    return;
  }

  const challengeId = dom.challengeId.value.trim();
  const payload = {
    title: dom.challengeTitle.value.trim(),
    description: dom.challengeDescription.value.trim(),
    difficulty: dom.challengeDifficulty.value,
    requirements: dom.challengeRequirements.value.trim(),
    month: dom.challengeMonth.value.trim() || state.currentMonth,
    updatedAt: serverTimestamp(),
  };

  if (!payload.title || !payload.description || !payload.requirements) {
    setNotice(dom.challengeNotice, "Please fill all challenge fields.", true);
    return;
  }

  try {
    if (challengeId) {
      await updateDoc(doc(db, "challenges", challengeId), payload);
      setNotice(dom.challengeNotice, "Challenge updated.");
    } else {
      const ref = await addDoc(collection(db, "challenges"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      await updateDoc(ref, { id: ref.id });
      setNotice(dom.challengeNotice, "Challenge added.");
    }

    clearChallengeForm();
    await fetchChallenges();
  } catch (error) {
    console.error(error);
    setNotice(dom.challengeNotice, "Could not save challenge.", true);
  }
}

function loadChallengeIntoForm(challengeId) {
  const challenge = state.challenges.find((item) => item.id === challengeId);
  if (!challenge) return;

  dom.challengeId.value = challenge.id;
  dom.challengeTitle.value = challenge.title;
  dom.challengeDescription.value = challenge.description;
  dom.challengeDifficulty.value = challenge.difficulty;
  dom.challengeRequirements.value = challenge.requirements;
  dom.challengeMonth.value = challenge.month;
}

async function deleteChallenge(challengeId) {
  if (!isAdminRole()) return;
  const ok = window.confirm("Delete this challenge?");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "challenges", challengeId));
    setNotice(dom.challengeNotice, "Challenge deleted.");
    await fetchChallenges();
  } catch (error) {
    console.error(error);
    setNotice(dom.challengeNotice, "Could not delete challenge.", true);
  }
}

async function handleSubmissionSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    setNotice(dom.submissionNotice, "Please sign in before submitting.", true);
    return;
  }

  const selectedTaskId = dom.taskSelect.value;
  const challenge = state.challenges.find((item) => item.id === selectedTaskId);
  if (!challenge) {
    setNotice(dom.submissionNotice, "Please select a valid challenge.", true);
    return;
  }

  const payload = {
    userId: state.currentUser.uid,
    name: dom.submitName.value.trim(),
    email: dom.submitEmail.value.trim(),
    taskId: selectedTaskId,
    taskTitle: challenge.title,
    github: dom.githubLink.value.trim(),
    explanation: dom.explanation.value.trim(),
    linkedin: dom.linkedinLink.value.trim(),
  };

  const submitButton = dom.submissionForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    await submitToGoogleForm(payload);
    await saveSubmission(payload);
    await updateLeaderboard();
    if (isAdminRole()) await fetchMonthlySubmissions();

    dom.githubLink.value = "";
    dom.explanation.value = "";
    dom.linkedinLink.value = "";
    dom.taskSelect.value = "";
    setNotice(dom.submissionNotice, "Submission saved and sent to Google Form.");
  } catch (error) {
    console.error(error);
    setNotice(dom.submissionNotice, error.message || "Submission failed.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Entry";
  }
}

async function handleScoreFormSubmit(event) {
  event.preventDefault();
  if (!isAdminRole()) return;

  const form = event.target;
  if (!form.classList.contains("score-form")) return;

  const submissionId = form.dataset.submissionId;
  const formData = new FormData(form);
  const normalizedScores = normalizeScorePayload({
    solve: formData.get("solve"),
    explanation: formData.get("explanation"),
    code: formData.get("code"),
    linkedin: formData.get("linkedin"),
    bonus: formData.get("bonus"),
    penalty: formData.get("penalty"),
  });

  const totalScore = calculateScore(normalizedScores);

  try {
    await updateDoc(doc(db, "submissions", submissionId), {
      scores: normalizedScores,
      totalScore,
      scoredBy: state.currentUser.uid,
      scoredAt: serverTimestamp(),
    });

    await updateLeaderboard();
    await fetchMonthlySubmissions();
    setNotice(dom.challengeNotice, "Submission score updated.");
  } catch (error) {
    console.error(error);
    setNotice(dom.challengeNotice, "Could not update score.", true);
  }
}

async function handleAdminRoleUpdate(event) {
  event.preventDefault();
  if (!isSuperAdminRole()) {
    setNotice(dom.adminRoleNotice, "Only super_admin can modify admin roles.", true);
    return;
  }

  const targetEmail = dom.adminTargetEmail.value.trim().toLowerCase();
  const action = dom.adminRoleAction.value;

  if (!targetEmail) {
    setNotice(dom.adminRoleNotice, "Please provide a target email.", true);
    return;
  }

  try {
    const userByEmailQuery = query(collection(db, "users"), where("email", "==", targetEmail));
    const userMatch = await getDocs(userByEmailQuery);

    if (userMatch.empty) {
      throw new Error("Target user not found in users collection.");
    }

    const targetDoc = userMatch.docs[0];
    const targetRole = targetDoc.data().role || "user";
    const targetRef = doc(db, "users", targetDoc.id);

    if (action === "add_admin") {
      await updateDoc(targetRef, { role: "admin", updatedAt: serverTimestamp() });
      setNotice(dom.adminRoleNotice, "User promoted to admin.");
    }

    if (action === "remove_admin") {
      if (targetRole === "super_admin") {
        throw new Error("Use transfer action before removing super_admin privileges.");
      }
      await updateDoc(targetRef, { role: "user", updatedAt: serverTimestamp() });
      setNotice(dom.adminRoleNotice, "Admin role removed.");
    }

    if (action === "transfer_super_admin") {
      const batch = writeBatch(db);
      const currentSuperAdmins = await getDocs(query(collection(db, "users"), where("role", "==", "super_admin")));
      currentSuperAdmins.docs.forEach((superAdminDoc) => {
        batch.update(doc(db, "users", superAdminDoc.id), {
          role: "admin",
          updatedAt: serverTimestamp(),
        });
      });
      batch.update(targetRef, { role: "super_admin", updatedAt: serverTimestamp() });
      await batch.commit();

      if (state.currentUser && state.currentUser.email?.toLowerCase() === targetEmail) {
        state.currentRole = "super_admin";
      } else {
        const refreshedRole = await checkUserRole(state.currentUser.uid);
        state.currentRole = refreshedRole;
      }

      setNotice(dom.adminRoleNotice, "Super admin transferred successfully.");
    }

    dom.adminTargetEmail.value = "";
    updateAuthUi();
    updateAdminAccessView();
    await refreshRoleTable();
    await updateLeaderboard();
  } catch (error) {
    console.error(error);
    setNotice(dom.adminRoleNotice, error.message || "Role update failed.", true);
  }
}

async function resetMonthlyView() {
  state.currentMonth = normalizeMonthLabel();
  dom.currentMonthLabel.textContent = state.currentMonth;
  dom.challengeMonth.value = state.currentMonth;

  if (!db) return state.currentMonth;

  const now = new Date();
  if (now.getDate() !== 1) return state.currentMonth;

  const resetToken = `namma-rust-reset-${state.currentMonth}`;
  if (localStorage.getItem(resetToken)) return state.currentMonth;

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const batch = writeBatch(db);

    usersSnapshot.docs.forEach((userDoc) => {
      const data = userDoc.data();
      if ((data.totalPoints || 0) > 0 || (data.tasksCompleted || 0) > 0) {
        const archiveRef = doc(collection(db, "archives"));
        batch.set(archiveRef, {
          type: "user_monthly_archive",
          userId: userDoc.id,
          month: data.month || "Unknown",
          totalPoints: data.totalPoints || 0,
          tasksCompleted: data.tasksCompleted || 0,
          archivedAt: serverTimestamp(),
        });
      }

      batch.set(
        userDoc.ref,
        {
          month: state.currentMonth,
          totalPoints: 0,
          tasksCompleted: 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    localStorage.setItem(resetToken, "done");
  } catch (error) {
    console.error("Monthly reset failed:", error);
  }

  return state.currentMonth;
}

async function refreshDataByRole() {
  try {
    await fetchChallenges();
    await updateLeaderboard();

    if (isAdminRole()) {
      await fetchMonthlySubmissions();
    } else {
      state.submissions = [];
      renderAdminSubmissions();
    }

    if (isSuperAdminRole()) {
      await refreshRoleTable();
    }
  } catch (error) {
    console.error("Role-based data refresh failed:", error);
    if (error?.code === "permission-denied") {
      setNotice(
        dom.submissionNotice,
        "Signed in, but Firestore rules blocked data access. Allow signed-in users to read/write their profile.",
        true
      );
    }
  }
}

async function handleAuthStateChange(user) {
  state.currentUser = user;
  state.currentRole = "user";

  // Reflect auth state immediately, even if Firestore rules reject profile queries.
  updateAuthUi();
  updateAdminAccessView();

  if (user) {
    try {
      await upsertUserProfile(user);
      state.currentRole = await checkUserRole(user.uid);
    } catch (error) {
      console.error("User profile sync failed:", error);
      if (error?.code === "permission-denied") {
        setNotice(
          dom.submissionNotice,
          "Login succeeded, but Firestore profile write was denied. Update Firestore rules for users/{uid} create/update.",
          true
        );
      }
    }
  }

  updateAuthUi();
  updateAdminAccessView();
  await refreshDataByRole();
}

function wireUiEvents() {
  dom.loginBtn.addEventListener("click", signInWithGoogle);
  dom.logoutBtn.addEventListener("click", signOut);

  dom.submissionForm.addEventListener("submit", handleSubmissionSubmit);

  dom.challengeForm.addEventListener("submit", handleChallengeSubmit);
  dom.challengeResetBtn.addEventListener("click", clearChallengeForm);

  dom.adminChallengeBody.addEventListener("click", (event) => {
    const editId = event.target.getAttribute("data-edit-challenge");
    const deleteId = event.target.getAttribute("data-delete-challenge");

    if (editId) loadChallengeIntoForm(editId);
    if (deleteId) deleteChallenge(deleteId);
  });

  document.querySelector(".challenge-groups").addEventListener("click", (event) => {
    const taskId = event.target.getAttribute("data-submit-task");
    if (!taskId) return;

    window.location.hash = "#submit";
    showPage("submit");
    dom.taskSelect.value = taskId;
    if (!state.currentUser) {
      setNotice(dom.submissionNotice, "Sign in first, then submit this task.", true);
    }
  });

  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchAdminPanel(button.dataset.adminView));
  });

  dom.adminSubmissionBody.addEventListener("submit", handleScoreFormSubmit);
  dom.adminRoleForm.addEventListener("submit", handleAdminRoleUpdate);
}

async function initFirebase() {
  firebaseApp = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  await setPersistence(auth, browserLocalPersistence);
  onAuthStateChanged(auth, async (user) => {
    try {
      await handleAuthStateChange(user);
    } catch (error) {
      console.error("Auth state processing failed:", error);
    }
  });

  try {
    await getRedirectResult(auth);
  } catch (error) {
    console.error("Redirect sign-in failed:", error);
    setNotice(dom.submissionNotice, `Redirect sign-in failed (${error?.code || "unknown"}).`, true);
  }

  try {
    await resetMonthlyView();
  } catch (error) {
    // Do not block sign-in flow for non-critical monthly view reset errors.
    console.error("Monthly reset initialization warning:", error);
  }
}

function renderSetupHints() {
  setNotice(
    dom.submissionNotice,
    "Firebase config and Google Form entry IDs are placeholders. Update script.js to enable live features.",
    true
  );
  setNotice(dom.challengeNotice, "Admin features are disabled until Firebase is configured.", true);
}

async function bootstrap() {
  bindNavigation();
  wireUiEvents();
  showPage(routeFromHash());

  state.currentMonth = normalizeMonthLabel();
  dom.currentMonthLabel.textContent = state.currentMonth;
  dom.challengeMonth.value = state.currentMonth;

  clearChallengeForm();
  renderChallenges();
  renderLeaderboard([]);
  renderAdminSubmissions();
  renderUsersRoleTable();

  if (!hasFirebaseConfig()) {
    renderSetupHints();
    return;
  }

  try {
    await initFirebase();
  } catch (error) {
    console.error(error);
    renderSetupHints();
  }
}

window.NammaRust = {
  signInWithGoogle,
  signOut,
  checkUserRole,
  fetchChallenges,
  submitToGoogleForm,
  saveSubmission,
  calculateScore,
  updateLeaderboard,
  resetMonthlyView,
};

bootstrap();
