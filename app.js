const API_BASE = "https://progresssessionbackend.mohamednasr.deno.net";
const ADMIN_KEY_STORAGE = "brightpath-api-admin-key";
const THEME_STORAGE = "brightpath-theme";
const DEFAULT_COUNT = 8;
const IS_ADMIN = new URLSearchParams(location.search).has("admin");

const state = {
  currentMonth: monthKey(new Date()),
  sessions: [],
  editingId: null,
  loading: false,
  viewingId: null,
};

const els = {
  monthLabel: document.querySelector("#monthLabel"),
  sessionGrid: document.querySelector("#sessionGrid"),
  completedCount: document.querySelector("#completedCount"),
  greatCount: document.querySelector("#greatCount"),
  percentText: document.querySelector("#percentText"),
  miniRing: document.querySelector("#miniRing"),
  progressBar: document.querySelector("#progressBar"),
  dialog: document.querySelector("#sessionDialog"),
  form: document.querySelector("#sessionForm"),
  deleteBtn: document.querySelector("#deleteSession"),
  toast: document.querySelector("#toast"),
  loadingBar: document.querySelector("#loadingBar"),
  viewBadge: document.querySelector("#viewBadge"),
};

document.body.classList.toggle("view-mode", !IS_ADMIN);
document.body.classList.toggle("edit-mode", IS_ADMIN);
els.viewBadge.textContent = IS_ADMIN ? "Admin dashboard" : "Live viewer report";
document.title = IS_ADMIN ? "BrightPath — Admin Dashboard" : "BrightPath — Session Progress";

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDate(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value = "") {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

function emptySession(number) {
  return { id: uid(), number, title: "", date: "", note: "", status: "upcoming", placeholder: true };
}

function displaySessions() {
  if (state.sessions.length >= DEFAULT_COUNT) return state.sessions.slice().sort((a, b) => a.number - b.number);
  const usedNumbers = new Set(state.sessions.map((session) => session.number));
  const placeholders = [];
  for (let number = 1; number <= DEFAULT_COUNT; number += 1) {
    if (!usedNumbers.has(number)) placeholders.push(emptySession(number));
  }
  return [...state.sessions, ...placeholders].sort((a, b) => a.number - b.number);
}

function setLoading(value) {
  state.loading = value;
  els.loadingBar.classList.toggle("active", value);
  document.body.classList.toggle("is-loading", value);
}

function getAdminKey({ promptIfMissing = true } = {}) {
  let key = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
  if (!key && promptIfMissing) {
    key = prompt("Enter the ADMIN_KEY you configured in Deno Deploy:")?.trim() || "";
    if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
  }
  return key;
}

async function apiRequest(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (options.admin) {
    const key = getAdminKey();
    if (!key) throw new Error("Admin key is required");
    headers["X-Admin-Key"] = key;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    throw new Error("The admin key is incorrect. Set it again and retry.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.details?.join("\n") || payload.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

async function loadMonth() {
  setLoading(true);
  try {
    const payload = await apiRequest(`/api/months/${state.currentMonth}/sessions`);
    state.sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    render();
  } catch (error) {
    state.sessions = [];
    render();
    showToast(`Could not load sessions: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

function formatDate(dateString) {
  if (!dateString) return "Date not set";
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function render() {
  const sessions = displaySessions();
  const formattedMonth = monthDate(state.currentMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  els.monthLabel.textContent = formattedMonth;
  document.querySelector("#printMonthLabel").textContent = formattedMonth;
  document.querySelector("#printDate").textContent = `Printed ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`;

  const savedSessions = state.sessions;
  const completed = savedSessions.filter((session) => session.status !== "upcoming").length;
  const great = savedSessions.filter((session) => session.status === "great").length;
  const percent = Math.min(100, Math.round((completed / DEFAULT_COUNT) * 100));
  els.completedCount.textContent = completed;
  els.greatCount.textContent = great;
  els.percentText.textContent = `${percent}%`;
  els.miniRing.style.setProperty("--percent", `${percent}%`);
  els.progressBar.style.width = `${percent}%`;
  els.sessionGrid.innerHTML = sessions.map(sessionCard).join("");
  document.querySelectorAll(".session-card").forEach((card) => {
    card.addEventListener("click", () => openSession(card.dataset.id));
  });
}

function sessionCard(session) {
  const label = session.status === "great" ? "Great" : session.status === "completed" ? "Completed" : "Upcoming";
  const title = session.title || (IS_ADMIN ? "Add session details" : "Session coming soon");
  const action = session.note ? "VIEW NOTES" : IS_ADMIN ? "ADD DETAILS" : "VIEW DETAILS";
  return `<article class="session-card ${session.status} ${session.placeholder ? "placeholder" : ""}" data-id="${session.id}" tabindex="0" role="button" aria-label="${IS_ADMIN ? "Manage" : "View"} session ${session.number}">
    <div class="session-top"><span class="session-number">${session.number}</span><span class="status-badge">${session.status === "upcoming" ? "◷" : session.status === "great" ? "★" : "✓"} ${label}</span></div>
    <h3 class="${session.title ? "" : "empty-title"}">${escapeHTML(title)}</h3>
    <p class="session-date">${escapeHTML(formatDate(session.date))}</p>
    ${session.note ? `<p class="note-preview">${escapeHTML(session.note)}</p>` : ""}
    ${(session.homeworkText || session.attachments?.length || session.recordingLinks?.length) ? `<div class="resource-chip">⌁ Resources available</div>` : ""}
    <div class="card-footer"><span>${action}</span><span>→</span></div>
  </article>`;
}

function findDisplaySession(id) {
  return displaySessions().find((session) => session.id === id);
}

function openSession(id = null) {
  let session = findDisplaySession(id);
  if (!session && !IS_ADMIN) return;
  if (!session) session = emptySession(displaySessions().length + 1);
  state.editingId = session.placeholder ? null : session.id;
  state.viewingId = session.placeholder ? null : session.id;
  document.querySelector("#dialogTitle").textContent = IS_ADMIN ? (state.editingId ? `Manage session ${session.number}` : "Add a session") : `Session ${session.number} details`;
  document.querySelector("#sessionId").value = session.id;
  document.querySelector("#sessionNumber").value = session.number;
  document.querySelector("#sessionTitle").value = session.title;
  document.querySelector("#sessionDate").value = session.date;
  document.querySelector("#sessionNote").value = session.note;
  document.querySelector("#homeworkText").value = session.homeworkText || "";
  renderRecordingFields(session.recordingLinks);
  document.querySelector("#homeworkFile").value = "";
  const radio = document.querySelector(`input[name="status"][value="${session.status}"]`);
  if (radio) radio.checked = true;
  els.deleteBtn.style.visibility = IS_ADMIN && state.editingId ? "visible" : "hidden";
  els.form.querySelectorAll("input, textarea").forEach((field) => { field.disabled = !IS_ADMIN; });
  // Comment fields stay available to viewers even though session fields are read-only.
  document.querySelector("#commentName").disabled = false;
  document.querySelector("#commentMessage").disabled = false;
  document.querySelector("#commentWebsite").disabled = false;
  renderComments(session);
  renderHomework(session);
  els.dialog.showModal();
}

function renderRecordingFields(recordingLinks = [""]) {
  const links = recordingLinks?.length ? recordingLinks : [""];
  document.querySelector("#recordingFields").innerHTML = links.map((link, index) => `<div class="recording-field-row"><label><span>Recording link ${index + 1}</span><input class="recording-link-input" type="url" value="${escapeHTML(link)}" placeholder="https://drive.google.com/…" ${IS_ADMIN ? "" : "disabled"} /></label><button class="remove-recording-button" type="button" aria-label="Remove recording ${index + 1}" ${links.length === 1 || !IS_ADMIN ? "disabled" : ""}>×</button></div>`).join("");
}

document.querySelector("#addRecordingLink").addEventListener("click", () => {
  const links = [...document.querySelectorAll(".recording-link-input")].map((input) => input.value);
  renderRecordingFields([...links, ""]);
});

document.querySelector("#recordingFields").addEventListener("click", (event) => {
  const button = event.target.closest(".remove-recording-button");
  if (!button || button.disabled) return;
  const rows = [...document.querySelectorAll(".recording-field-row")];
  const index = rows.indexOf(button.closest(".recording-field-row"));
  const links = [...document.querySelectorAll(".recording-link-input")].map((input) => input.value).filter((_, itemIndex) => itemIndex !== index);
  renderRecordingFields(links);
});

function renderHomework(session) {
  const homeworkText = session.homeworkText || "";
  const links = Array.isArray(session.recordingLinks) ? session.recordingLinks : [];
  const attachments = Array.isArray(session.attachments) ? session.attachments : [];
  const count = (homeworkText ? 1 : 0) + links.length + attachments.length;
  document.querySelector("#resourceCount").textContent = count ? `${count} resource${count === 1 ? "" : "s"}` : "No resources";
  const viewerText = document.querySelector("#viewerHomeworkText");
  viewerText.textContent = homeworkText || "No written homework was added for this session.";
  viewerText.classList.toggle("empty", !homeworkText);
  document.querySelector("#recordingLinks").innerHTML = links.map((link, index) => `<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer"><span>▶</span> Meeting recording ${index + 1}</a>`).join("");
  document.querySelector("#attachmentsList").innerHTML = attachments.map((attachment) => {
    const url = `${API_BASE}/api/months/${state.currentMonth}/sessions/${encodeURIComponent(session.id)}/attachments/${encodeURIComponent(attachment.id)}`;
    const type = attachment.mimeType === "application/pdf" ? "PDF" : "TXT";
    const size = attachment.size < 1024 * 1024 ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : `${(attachment.size / 1024 / 1024).toFixed(1)} MB`;
    return `<article class="attachment-item"><span class="file-type">${type}</span><div><strong>${escapeHTML(attachment.name)}</strong><small>${size}</small></div><a href="${url}" target="_blank" rel="noopener" aria-label="Open ${escapeHTML(attachment.name)}">Open ↗</a>${IS_ADMIN ? `<button type="button" class="delete-attachment" data-file-id="${escapeHTML(attachment.id)}">×</button>` : ""}</article>`;
  }).join("");
}

function formatCommentDate(value) {
  if (!value) return "Just now";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function renderComments(session) {
  const panel = document.querySelector("#commentsPanel");
  const comments = Array.isArray(session.comments) ? session.comments : [];
  panel.hidden = Boolean(session.placeholder);
  document.querySelector("#commentCount").textContent = `${comments.length} comment${comments.length === 1 ? "" : "s"}`;
  document.querySelector("#commentsList").innerHTML = comments.length
    ? comments.map((comment) => `<article class="comment-item">
        <div class="comment-avatar">${escapeHTML(comment.name.charAt(0).toUpperCase())}</div>
        <div class="comment-body"><div><strong>${escapeHTML(comment.name)}</strong><time>${escapeHTML(formatCommentDate(comment.createdAt))}</time></div><p>${escapeHTML(comment.message)}</p></div>
        ${IS_ADMIN ? `<button class="delete-comment" type="button" data-comment-id="${escapeHTML(comment.id)}" aria-label="Delete comment">×</button>` : ""}
      </article>`).join("")
    : `<div class="comments-empty"><span>♡</span><p>No comments yet. Start the conversation.</p></div>`;
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!IS_ADMIN) return;
  const record = {
    id: state.editingId || document.querySelector("#sessionId").value || uid(),
    number: Number(document.querySelector("#sessionNumber").value),
    title: document.querySelector("#sessionTitle").value.trim(),
    date: document.querySelector("#sessionDate").value,
    note: document.querySelector("#sessionNote").value.trim(),
    status: document.querySelector('input[name="status"]:checked')?.value || "upcoming",
    homeworkText: document.querySelector("#homeworkText").value.trim(),
    recordingLinks: [...document.querySelectorAll(".recording-link-input")].map((input) => input.value.trim()).filter(Boolean),
  };
  setLoading(true);
  try {
    await apiRequest(`/api/months/${state.currentMonth}/sessions/${encodeURIComponent(record.id)}`, { method: "PUT", admin: true, body: JSON.stringify(record) });
    const selectedFile = document.querySelector("#homeworkFile").files[0];
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await apiRequest(`/api/months/${state.currentMonth}/sessions/${encodeURIComponent(record.id)}/attachments`, { method: "POST", admin: true, body: formData });
    }
    els.dialog.close();
    await loadMonth();
    showToast("Session saved to the shared database");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
});

els.deleteBtn.addEventListener("click", async () => {
  if (!IS_ADMIN || !state.editingId || !confirm("Delete this session for everyone?")) return;
  setLoading(true);
  try {
    await apiRequest(`/api/months/${state.currentMonth}/sessions/${encodeURIComponent(state.editingId)}`, { method: "DELETE", admin: true });
    els.dialog.close();
    await loadMonth();
    showToast("Session deleted");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
});

async function changeMonth(amount) {
  const date = monthDate(state.currentMonth);
  date.setMonth(date.getMonth() + amount);
  state.currentMonth = monthKey(date);
  await loadMonth();
}

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle("error", isError);
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 3200);
}

document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
document.querySelector("#addSessionBtn").addEventListener("click", () => openSession());
document.querySelector("#closeDialog").addEventListener("click", () => els.dialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => els.dialog.close());
document.querySelector("#printBtn").addEventListener("click", () => window.print());
document.querySelector("#themeBtn").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_STORAGE, next);
  showToast(`${next === "dark" ? "Dark" : "Light"} theme enabled`);
});
document.querySelector("#keyBtn").addEventListener("click", () => {
  const current = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
  const key = prompt("Set your Deno ADMIN_KEY. It stays in this browser only:", current)?.trim();
  if (key) { localStorage.setItem(ADMIN_KEY_STORAGE, key); showToast("Admin key saved in this browser"); }
});

document.querySelector("#submitComment").addEventListener("click", async () => {
  if (!state.viewingId) return;
  const name = document.querySelector("#commentName").value.trim();
  const message = document.querySelector("#commentMessage").value.trim();
  const website = document.querySelector("#commentWebsite").value;
  if (name.length < 2 || message.length < 2) return showToast("Please enter your name and a comment", true);
  setLoading(true);
  try {
    await apiRequest(`/api/months/${state.currentMonth}/sessions/${encodeURIComponent(state.viewingId)}/comments`, {
      method: "POST",
      body: JSON.stringify({ name, message, website }),
    });
    document.querySelector("#commentMessage").value = "";
    await loadMonth();
    const refreshed = state.sessions.find((session) => session.id === state.viewingId);
    if (refreshed) renderComments(refreshed);
    showToast("Your comment is now visible");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
});

document.querySelector("#commentsList").addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-comment");
  if (!button || !IS_ADMIN || !state.viewingId || !confirm("Delete this viewer comment?")) return;
  setLoading(true);
  try {
    await apiRequest(`/api/months/${state.currentMonth}/sessions/${encodeURIComponent(state.viewingId)}/comments/${encodeURIComponent(button.dataset.commentId)}`, { method: "DELETE", admin: true });
    await loadMonth();
    const refreshed = state.sessions.find((session) => session.id === state.viewingId);
    if (refreshed) renderComments(refreshed);
    showToast("Comment deleted");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
});

document.querySelector("#attachmentsList").addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-attachment");
  if (!button || !IS_ADMIN || !state.viewingId || !confirm("Delete this homework file?")) return;
  setLoading(true);
  try {
    await apiRequest(`/api/months/${state.currentMonth}/sessions/${encodeURIComponent(state.viewingId)}/attachments/${encodeURIComponent(button.dataset.fileId)}`, { method: "DELETE", admin: true });
    await loadMonth();
    const refreshed = state.sessions.find((session) => session.id === state.viewingId);
    if (refreshed) renderHomework(refreshed);
    showToast("Homework file deleted");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && document.activeElement?.classList.contains("session-card")) openSession(document.activeElement.dataset.id);
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  if (!IS_ADMIN) return;
  const blob = new Blob([JSON.stringify({ [state.currentMonth]: state.sessions }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `brightpath-${state.currentMonth}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#importInput").addEventListener("change", async (event) => {
  if (!IS_ADMIN) return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const sessions = Array.isArray(imported) ? imported : imported[state.currentMonth];
    if (!Array.isArray(sessions)) throw new Error("This backup has no sessions for the selected month");
    await apiRequest(`/api/months/${state.currentMonth}/sessions`, { method: "PUT", admin: true, body: JSON.stringify({ sessions }) });
    await loadMonth();
    showToast("Month imported to the shared database");
  } catch (error) {
    showToast(error.message, true);
  }
  event.target.value = "";
});

render();
loadMonth();
if (IS_ADMIN && !getAdminKey({ promptIfMissing: false })) setTimeout(() => getAdminKey(), 350);
