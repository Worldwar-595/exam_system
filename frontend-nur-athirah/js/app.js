// ---------- 1. Config & small helpers ----------
const API_BASE = 'http://localhost:3000/api';
const VIEWS = ['dashboard', 'courses', 'examinations', 'results', 'notifications'];
 
const $ = (id) => document.getElementById(id);
 
// Escape text before putting it into innerHTML (prevents injected markup).
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
 
const state = {
  user: null,
  page: { courses: 1, examinations: 1, results: 1 },
};
 
const isAdmin = () => state.user && state.user.role === 'admin';
const isStaff = () => state.user && (state.user.role === 'admin' || state.user.role === 'lecturer');
const isStudent = () => state.user && state.user.role === 'student';
 
 
// ---------- 2. Session + API helper ----------
function getToken() { return localStorage.getItem('eh_token'); }
function getUser() {
  const raw = localStorage.getItem('eh_user');
  return raw ? JSON.parse(raw) : null;
}
function saveSession(token, user) {
  localStorage.setItem('eh_token', token);
  localStorage.setItem('eh_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('eh_token');
  localStorage.removeItem('eh_user');
}
 
// Every request goes through here: attaches the JWT, parses JSON,
// and throws an Error (with .status / .details) when the API reports a failure.
async function api(path, { method = 'GET', body = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
 
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
 
  const data = await res.json().catch(() => ({}));
 
  if (!res.ok) {
    // Token expired or invalid while logged in -> back to the login screen.
    if (res.status === 401 && token) logout();
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}
 
function formatError(err) {
  return err.details ? err.details.map((d) => d.message).join('; ') : err.message;
}
 
 
// ---------- 3. Auth ----------
document.querySelectorAll('.demo-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    $('loginEmail').value = btn.dataset.email;
    $('loginPassword').value = 'Password123!';
  });
});
 
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginError').classList.add('hidden');
 
  try {
    const { data } = await api('/auth/login', {
      method: 'POST',
      body: { email: $('loginEmail').value, password: $('loginPassword').value },
    });
    saveSession(data.token, data.user);
    state.user = data.user;
    location.hash = '#dashboard';
    showApp();
  } catch (err) {
    $('loginError').textContent = err.message;
    $('loginError').classList.remove('hidden');
  }
});
 
function logout() {
  clearSession();
  state.user = null;
  location.hash = '';
  location.reload();
}
$('logoutBtn').addEventListener('click', logout);
 
function showLogin() {
  $('loginView').classList.remove('hidden');
  $('appShell').classList.add('hidden');
}
 
function showApp() {
  $('loginView').classList.add('hidden');
  $('appShell').classList.remove('hidden');
 
  $('userName').textContent = state.user.name;
  $('userRole').textContent = state.user.role;
 
  // Role-based UI: show/hide controls the backend would reject anyway.
  document.querySelectorAll('.admin-only').forEach((el) => el.classList.toggle('hidden', !isAdmin()));
  document.querySelectorAll('.staff-only').forEach((el) => el.classList.toggle('hidden', !isStaff()));
 
  $('resultsHint').textContent = isStaff()
    ? 'Showing all published results.'
    : 'Showing your own published results only.';
 
  route();
}
 
 
// ---------- 4. Routing ----------
function route() {
  let name = location.hash.replace('#', '');
  if (!VIEWS.includes(name)) name = 'dashboard';
 
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $(`view-${name}`).classList.add('active');
  document.querySelectorAll('#sidebarNav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.view === name);
  });
 
  if (name === 'dashboard') loadDashboard();
  if (name === 'courses') loadCourses(state.page.courses);
  if (name === 'examinations') loadExams(state.page.examinations);
  if (name === 'results') loadResults(state.page.results);
  if (name === 'notifications') loadNotifications();
}
 
window.addEventListener('hashchange', () => { if (state.user) route(); });
 
 
// ---------- Shared pager ----------
// fnName is the global loader to call, e.g. 'loadCourses'.
function renderPager(elId, pagination, fnName) {
  const { page, totalPages } = pagination;
  $(elId).innerHTML = `
    <button ${page <= 1 ? 'disabled' : ''} onclick="${fnName}(${page - 1})">‹ Prev</button>
    <span>Page ${page} of ${totalPages || 1}</span>
    <button ${page >= totalPages ? 'disabled' : ''} onclick="${fnName}(${page + 1})">Next ›</button>
  `;
}
 
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
 
 
// ---------- 5. Dashboard ----------
async function loadDashboard() {
  const u = state.user;
 
  const initials = u.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  $('welcomeAvatar').textContent = initials;
 
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('welcomeGreeting').textContent = `${greeting}, ${u.name.split(' ')[0]}.`;
  $('welcomeRoleBadge').textContent = u.role;
  $('welcomeDate').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
 
  const grid = $('statsGrid');
  grid.innerHTML = '<p class="muted">Loading…</p>';
  try {
    // Three requests in parallel; only the pagination totals are needed.
    const [courses, exams, results] = await Promise.all([
      api('/courses?limit=1'),
      api('/examinations?limit=1'),
      api('/results?limit=1'),
    ]);
    grid.innerHTML = `
      ${statCard(courses.pagination.total, 'Courses')}
      ${statCard(exams.pagination.total, isStudent() ? 'Your exams' : 'Examinations scheduled')}
      ${statCard(results.pagination.total, isStudent() ? 'Your results' : 'Results published')}
    `;
  } catch (err) {
    grid.innerHTML = `<p class="alert alert-error">${esc(err.message)}</p>`;
  }
}
 
function statCard(number, label) {
  return `
    <div class="stat-card">
      <div class="stat-number">${esc(number)}</div>
      <div class="stat-label">${esc(label)}</div>
    </div>`;
}
 
 
// ---------- 6. Courses ----------
async function loadCourses(page = 1) {
  state.page.courses = page;
  const tbody = $('coursesTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="muted">Loading…</td></tr>';
 
  try {
    const params = new URLSearchParams({ page, limit: 6, sortBy: 'course_name', order: 'asc' });
    const search = $('courseSearch').value;
    if (search) params.set('search', search);
 
    const { data, pagination } = await api(`/courses?${params}`);
 
    tbody.innerHTML = data.map((c) => `
      <tr>
        <td><strong>${esc(c.course_code)}</strong></td>
        <td>${esc(c.course_name)}</td>
        <td>${esc(c.faculty_name)}</td>
        <td>${esc(c.lecturer_name)}</td>
        <td class="admin-only ${isAdmin() ? '' : 'hidden'}">
          <button class="link-btn danger" onclick="deleteCourse(${Number(c.course_id)})">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="5" class="muted">No courses found.</td></tr>';
 
    renderPager('coursesPager', pagination, 'loadCourses');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="alert alert-error">${esc(err.message)}</td></tr>`;
  }
}
 
$('courseSearch').addEventListener('input', debounce(() => loadCourses(1)));
 
async function deleteCourse(id) {
  if (!confirm('Delete this course? This will also remove its exams, registrations and results.')) return;
  try {
    await api(`/courses/${id}`, { method: 'DELETE' });
    showToast('Course deleted.');
    loadCourses(state.page.courses);
  } catch (err) {
    showToast(err.message, true);
  }
}
 
$('newCourseBtn').addEventListener('click', () => openModal('courseModal', 'courseForm', 'courseFormError'));
 
$('courseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('courseFormError').classList.add('hidden');
  try {
    await api('/courses', {
      method: 'POST',
      body: {
        course_code: $('f_course_code').value,
        course_name: $('f_course_name').value,
        faculty_id: Number($('f_faculty_id').value),
        lecturer_id: Number($('f_lecturer_id').value),
      },
    });
    closeModal('courseModal');
    showToast('Course created.');
    loadCourses(1);
  } catch (err) {
    showFormError('courseFormError', err);
  }
});
 
 
// ---------- 7. Examinations ----------
async function loadExams(page = 1) {
  state.page.examinations = page;
  const tbody = $('examsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="muted">Loading…</td></tr>';
 
  try {
    const params = new URLSearchParams({ page, limit: 6, sortBy: 'exam_date', order: 'asc' });
    const search = $('examSearch').value;
    if (search) params.set('search', search);
 
    const { data, pagination } = await api(`/examinations?${params}`);
 
    tbody.innerHTML = data.map((x) => `
      <tr>
        <td><strong>${esc(x.course_code)}</strong> — ${esc(x.course_name)}</td>
        <td>${esc(x.exam_date)}</td>
        <td>${esc(x.start_time)}–${esc(x.end_time)}</td>
        <td>${esc(x.venue)}</td>
        <td>
          ${isStudent() ? `<button class="link-btn" onclick="viewSlip(${Number(x.exam_id)})">Get slip (QR)</button>` : ''}
          ${isAdmin() ? `<button class="link-btn danger" onclick="deleteExam(${Number(x.exam_id)})">Delete</button>` : ''}
        </td>
      </tr>`).join('') || '<tr><td colspan="5" class="muted">No examinations found.</td></tr>';
 
    renderPager('examsPager', pagination, 'loadExams');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="alert alert-error">${esc(err.message)}</td></tr>`;
  }
}
 
$('examSearch').addEventListener('input', debounce(() => loadExams(1)));
 
async function deleteExam(id) {
  if (!confirm('Delete this examination? This will also remove any results tied to it.')) return;
  try {
    await api(`/examinations/${id}`, { method: 'DELETE' });
    showToast('Examination deleted.');
    loadExams(state.page.examinations);
  } catch (err) {
    showToast(err.message, true);
  }
}
 
$('newExamBtn').addEventListener('click', () => openModal('examModal', 'examForm', 'examFormError'));
 
$('examForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('examFormError').classList.add('hidden');
  try {
    await api('/examinations', {
      method: 'POST',
      body: {
        course_id: Number($('f_course_id').value),
        exam_date: $('f_exam_date').value,
        start_time: $('f_start_time').value,
        end_time: $('f_end_time').value,
        venue: $('f_venue').value,
      },
    });
    closeModal('examModal');
    showToast('Examination scheduled.');
    loadExams(1);
  } catch (err) {
    showFormError('examFormError', err);
  }
});
 
// Third-party API: QR-coded exam slip (api.qrserver.com, via the backend)
async function viewSlip(examId) {
  $('slipModal').classList.remove('hidden');
  const body = $('slipModalBody');
  body.innerHTML = '<p class="muted">Generating QR slip…</p>';
 
  try {
    const { data } = await api(`/examinations/${examId}/slip`);
    body.innerHTML = `
      <p><strong>${esc(data.exam.course_code)}</strong> — ${esc(data.exam.course_name)}</p>
      <p class="muted small">${esc(data.exam.exam_date)}, ${esc(data.exam.start_time)}–${esc(data.exam.end_time)}, ${esc(data.exam.venue)}</p>
      <p>Student: ${esc(data.student_name)}</p>
      <img src="${esc(data.qr_code.qr_image_url)}" alt="Exam slip QR code"
           style="max-width:100%;border-radius:8px;border:1px solid var(--border);">
      <p class="muted small">Generated via QR Code Generator API (api.qrserver.com).</p>
    `;
  } catch (err) {
    body.innerHTML = `<p class="alert alert-error">${esc(err.message)}</p>`;
  }
}
 
 
// ---------- 8. Results ----------
async function loadResults(page = 1) {
  state.page.results = page;
  const tbody = $('resultsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="muted">Loading…</td></tr>';
 
  try {
    const params = new URLSearchParams({ page, limit: 6, sortBy: 'published_at', order: 'desc' });
    const { data, pagination } = await api(`/results?${params}`);
 
    tbody.innerHTML = data.map((r) => `
      <tr>
        <td>${esc(r.student_name)}</td>
        <td><strong>${esc(r.course_code)}</strong> — ${esc(r.course_name)}</td>
        <td>${esc(r.score)}</td>
        <td><span class="grade-badge grade-${esc(r.grade)}">${esc(r.grade)}</span></td>
        <td>${new Date(r.published_at).toLocaleDateString()}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="muted">No results found.</td></tr>';
 
    renderPager('resultsPager', pagination, 'loadResults');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="alert alert-error">${esc(err.message)}</td></tr>`;
  }
}
 
$('newResultBtn').addEventListener('click', () => openModal('resultModal', 'resultForm', 'resultFormError'));
 
$('resultForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('resultFormError').classList.add('hidden');
  try {
    await api('/results', {
      method: 'POST',
      body: {
        student_id: Number($('f_student_id').value),
        exam_id: Number($('f_exam_id').value),
        score: Number($('f_score').value),
      },
    });
    closeModal('resultModal');
    showToast('Result published — student notified.');
    loadResults(1);
  } catch (err) {
    showFormError('resultFormError', err);
  }
});
 
 
// ---------- 9. Notifications ----------
async function loadNotifications() {
  const list = $('notifList');
  list.innerHTML = '<li class="muted">Loading…</li>';
 
  try {
    const { data } = await api('/notifications?limit=20');
    list.innerHTML = data.map((n) => `
      <li class="notif-item">
        <div class="notif-message">${esc(n.message)}</div>
        <div class="notif-meta">
          <span class="notif-type">${esc(n.type.replace('_', ' '))}</span>
          <span>${new Date(n.sent_at).toLocaleString()}</span>
        </div>
      </li>`).join('') || '<li class="muted">No notifications yet.</li>';
  } catch (err) {
    list.innerHTML = `<li class="alert alert-error">${esc(err.message)}</li>`;
  }
}
 
$('newNotifBtn').addEventListener('click', () => openModal('notifModal', 'notifForm', 'notifFormError'));
 
$('notifForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('notifFormError').classList.add('hidden');
  try {
    await api('/notifications', {
      method: 'POST',
      body: {
        user_id: Number($('f_user_id').value),
        message: $('f_message').value,
        type: $('f_type').value,
      },
    });
    closeModal('notifModal');
    showToast('Notification sent.');
    loadNotifications();
  } catch (err) {
    showFormError('notifFormError', err);
  }
});
 
 
// ---------- 10. Modals & toast ----------
function openModal(modalId, formId, errorId) {
  if (formId) $(formId).reset();
  if (errorId) $(errorId).classList.add('hidden');
  $(modalId).classList.remove('hidden');
}
function closeModal(modalId) { $(modalId).classList.add('hidden'); }
 
// Close a modal via its ✕ button or by clicking the dark backdrop.
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.hasAttribute('data-close')) overlay.classList.add('hidden');
  });
});
 
function showFormError(errorId, err) {
  $(errorId).textContent = formatError(err);
  $(errorId).classList.remove('hidden');
}
 
function showToast(message, isError = false) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 3000);
}
 
 
// ---------- 11. Boot ----------
state.user = getUser();
if (state.user && getToken()) {
  showApp();
} else {
  showLogin();
}