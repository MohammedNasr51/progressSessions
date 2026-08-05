const STORAGE_KEY = "brightpath-session-progress-v1";
const DEFAULT_COUNT = 8;

const state = {
  currentMonth: monthKey(new Date()),
  data: loadData(),
  editingId: null
};

const els = {
  monthLabel: document.querySelector("#monthLabel"), sessionGrid: document.querySelector("#sessionGrid"),
  completedCount: document.querySelector("#completedCount"), greatCount: document.querySelector("#greatCount"),
  percentText: document.querySelector("#percentText"), miniRing: document.querySelector("#miniRing"), progressBar: document.querySelector("#progressBar"),
  dialog: document.querySelector("#sessionDialog"), form: document.querySelector("#sessionForm"), deleteBtn: document.querySelector("#deleteSession"),
  toast: document.querySelector("#toast")
};

function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthDate(key) { const [year, month] = key.split("-").map(Number); return new Date(year, month - 1, 1); }
function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHTML(value = "") { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; }

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); }
function getSessions() {
  if (!state.data[state.currentMonth]) {
    state.data[state.currentMonth] = Array.from({ length: DEFAULT_COUNT }, (_, index) => ({ id: uid(), number: index + 1, title: "", date: "", note: "", status: "upcoming" }));
    saveData();
  }
  return state.data[state.currentMonth];
}

function formatDate(dateString) {
  if (!dateString) return "Date not set";
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function render() {
  const sessions = getSessions().slice().sort((a, b) => a.number - b.number);
  const formattedMonth = monthDate(state.currentMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  els.monthLabel.textContent = formattedMonth;
  document.querySelector("#printMonthLabel").textContent = formattedMonth;
  document.querySelector("#printDate").textContent = `Printed ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`;
  const completed = sessions.filter(session => session.status !== "upcoming").length;
  const great = sessions.filter(session => session.status === "great").length;
  const target = Math.max(DEFAULT_COUNT, sessions.length);
  const percent = Math.min(100, Math.round((completed / target) * 100));
  els.completedCount.textContent = completed;
  els.greatCount.textContent = great;
  els.percentText.textContent = `${percent}%`;
  els.miniRing.style.setProperty("--percent", `${percent}%`);
  els.progressBar.style.width = `${percent}%`;
  els.sessionGrid.innerHTML = sessions.map(sessionCard).join("");
  document.querySelectorAll(".session-card").forEach(card => card.addEventListener("click", () => openEditor(card.dataset.id)));
}

function sessionCard(session) {
  const label = session.status === "great" ? "Great" : session.status === "completed" ? "Completed" : "Upcoming";
  const title = session.title || "Add session details";
  return `<article class="session-card ${session.status}" data-id="${session.id}" tabindex="0" role="button" aria-label="Edit session ${session.number}">
    <div class="session-top"><span class="session-number">${session.status === "upcoming" ? session.number : "✓"}</span><span class="status-badge">${label}</span></div>
    <h3 class="${session.title ? "" : "empty-title"}">${escapeHTML(title)}</h3>
    <p class="session-date">${escapeHTML(formatDate(session.date))}</p>
    ${session.note ? `<p class="note-preview">${escapeHTML(session.note)}</p>` : ""}
    <div class="card-footer"><span>${session.note ? "VIEW NOTES" : "ADD DETAILS"}</span><span>→</span></div>
  </article>`;
}

function openEditor(id = null) {
  const sessions = getSessions();
  let session = sessions.find(item => item.id === id);
  if (!session) session = { id: "", number: sessions.length + 1, title: "", date: "", note: "", status: "upcoming" };
  state.editingId = session.id || null;
  document.querySelector("#dialogTitle").textContent = state.editingId ? `Session ${session.number}` : "Add a session";
  document.querySelector("#sessionId").value = session.id;
  document.querySelector("#sessionNumber").value = session.number;
  document.querySelector("#sessionTitle").value = session.title;
  document.querySelector("#sessionDate").value = session.date;
  document.querySelector("#sessionNote").value = session.note;
  const radio = document.querySelector(`input[name="status"][value="${session.status}"]`);
  if (radio) radio.checked = true;
  els.deleteBtn.style.visibility = state.editingId ? "visible" : "hidden";
  els.dialog.showModal();
}

els.form.addEventListener("submit", event => {
  event.preventDefault();
  const sessions = getSessions();
  const record = {
    id: state.editingId || uid(),
    number: Number(document.querySelector("#sessionNumber").value),
    title: document.querySelector("#sessionTitle").value.trim(),
    date: document.querySelector("#sessionDate").value,
    note: document.querySelector("#sessionNote").value.trim(),
    status: document.querySelector('input[name="status"]:checked')?.value || "upcoming"
  };
  const index = sessions.findIndex(item => item.id === state.editingId);
  if (index >= 0) sessions[index] = record; else sessions.push(record);
  saveData(); render(); els.dialog.close(); showToast("Session saved successfully");
});

els.deleteBtn.addEventListener("click", () => {
  if (!state.editingId || !confirm("Delete this session?")) return;
  state.data[state.currentMonth] = getSessions().filter(item => item.id !== state.editingId);
  saveData(); render(); els.dialog.close(); showToast("Session deleted");
});

function changeMonth(amount) {
  const date = monthDate(state.currentMonth); date.setMonth(date.getMonth() + amount); state.currentMonth = monthKey(date); render();
}
function showToast(message) { els.toast.textContent = message; els.toast.classList.add("show"); setTimeout(() => els.toast.classList.remove("show"), 2200); }

document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
document.querySelector("#addSessionBtn").addEventListener("click", () => openEditor());
document.querySelector("#closeDialog").addEventListener("click", () => els.dialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => els.dialog.close());
document.querySelector("#printBtn").addEventListener("click", () => window.print());
document.addEventListener("keydown", event => { if (event.key === "Enter" && document.activeElement?.classList.contains("session-card")) openEditor(document.activeElement.dataset.id); });

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `brightpath-backup-${monthKey(new Date())}.json`; link.click(); URL.revokeObjectURL(link.href); showToast("Backup exported");
});
document.querySelector("#importInput").addEventListener("change", async event => {
  const file = event.target.files[0]; if (!file) return;
  try { const imported = JSON.parse(await file.text()); if (!imported || Array.isArray(imported) || typeof imported !== "object") throw new Error(); state.data = imported; saveData(); render(); showToast("Backup imported"); }
  catch { alert("That file is not a valid BrightPath backup."); }
  event.target.value = "";
});

render();
