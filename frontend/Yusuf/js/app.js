// ============================================================
// ExamHub frontend — vanilla JS client for the Exam Scheduling
// & Result Management RESTful API (SWC3633 project).
// ============================================================

const API_BASE = 'http://localhost:3000/api';
const apiBaseLabel = document.getElementById('apiBaseLabel');
if (apiBaseLabel) apiBaseLabel.textContent = API_BASE;

let state = {
  token: localStorage.getItem('exam_token') || null,
  user: JSON.parse(localStorage.getItem('exam_user') || 'null'),
  page: { courses: 1, examinations: 1, results: 1 },
};

// ---------- API helper ----------
async function api(path, { method = 'GET', body = null, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.details = data.details;
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Toast ----------
function toast(message, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return alert(message);
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ---------- Auth ----------
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

document.querySelectorAll('.chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('loginEmail').value = btn.dataset.email;
    document.getElementById('loginPassword').value = 'Password123!';
  });
});

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginError) loginError.classList.add('hidden');
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const { data } = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('exam_token', state.token);
      localStorage.setItem('exam_user', JSON.stringify(state.user));
      onLoggedIn();
    } catch (err) {
      if (loginError) {
        loginError.textContent = err.message;
        loginError.classList.remove('hidden');
      } else {
        toast(err.message, true);
      }
    }
  });
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('exam_token');
  localStorage.removeItem('exam_user');
  location.reload();
});

function onLoggedIn() {
  document.getElementById('burgerBtn')?.classList.remove('hidden');
  document.getElementById('userbox')?.classList.remove('hidden');
  
  const userLabel = document.getElementById('userLabel');
  if (userLabel) userLabel.textContent = state.user.name;

  const roleLabel = document.getElementById('roleLabel');
  if (roleLabel) {
    roleLabel.textContent = state.user.role;
    roleLabel.classList.remove('hidden');
  }

  const isAdmin = state.user.role === 'admin';
  const isStaff = isAdmin || state.user.role === 'lecturer';
  document.querySelectorAll('.admin-only').forEach((el) => el.classList.toggle('hidden', !isAdmin));
  document.querySelectorAll('.staff-only').forEach((el) => el.classList.toggle('hidden', !isStaff));

  switchView('dashboard');
}

// ---------- View switching & Navigation ----------
function switchView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const targetView = document.getElementById(`view-${name}`);
  if (targetView) targetView.classList.add('active');

  const navDropdown = document.getElementById('navDropdown');
  if (navDropdown) {
    navDropdown.querySelectorAll('.menu-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
    navDropdown.classList.add('hidden');
  }

  if (name === 'dashboard') loadDashboard();
  if (name === 'courses') loadCourses();
  if (name === 'examinations') loadExams();
  if (name === 'results') loadResults();
  if (name === 'notifications') loadNotifications();
}

// Burger menu popover handlers
const burgerBtn = document.getElementById('burgerBtn');
const navDropdown = document.getElementById('navDropdown');

if (burgerBtn && navDropdown) {
  burgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!navDropdown.contains(e.target) && !burgerBtn.contains(e.target)) {
      navDropdown.classList.add('hidden');
    }
  });

  navDropdown.querySelectorAll('.menu-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) switchView(view);
    });
  });
}

// ---------- Dashboard ----------
async function loadDashboard() {
  const grid = document.getElementById('dashboardCards');
  if (!grid) return;
  grid.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const [courses, exams, results] = await Promise.all([
      api('/courses?limit=1'),
      api('/examinations?limit=1'),
      api('/results?limit=1'),
    ]);
    grid.innerHTML = `
      ${statCard(courses.pagination.total, 'Courses')}
      ${statCard(exams.pagination.total, state.user.role === 'student' ? 'Your upcoming exams' : 'Examinations scheduled')}
      ${statCard(results.pagination.total, state.user.role === 'student' ? 'Your published results' : 'Results published')}
    `;
  } catch (err) {
    grid.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function statCard(number, label) {
  return `<div class="stat-card"><div class="stat-number">${number}</div><div class="stat-label">${label}</div></div>`;
}

// ---------- Courses ----------
async function loadCourses(page = state.page.courses) {
  state.page.courses = page;
  const searchInput = document.getElementById('courseSearch');
  const search = searchInput ? searchInput.value : '';
  const tbody = document.getElementById('coursesTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="muted">Loading…</td></tr>`;
  try {
    const q = new URLSearchParams({ page, limit: 5, sortBy: 'course_name', order: 'asc' });
    if (search) q.set('search', search);
    const { data, pagination } = await api(`/courses?${q}`);
    tbody.innerHTML = data.map((c) => `
      <tr>
        <td>${c.course_code}</td>
        <td>${c.course_name}</td>
        <td>${c.faculty_name}</td>
        <td>${c.lecturer_name}</td>
        <td class="row-actions admin-only ${state.user.role === 'admin' ? '' : 'hidden'}">
          <button onclick="deleteCourse(${c.course_id})" class="danger">Delete</button>
        </td>
      </tr>`).join('') || `<tr><td colspan="5" class="muted">No courses found.</td></tr>`;
    renderPager('coursesPager', pagination, loadCourses);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="error">${err.message}</td></tr>`;
  }
}

document.getElementById('courseSearch')?.addEventListener('input', debounce(() => loadCourses(1), 300));

document.getElementById('courseAddBtn')?.addEventListener('click', () => {
  openModal('New course', `
    <label>Course code <input id="f_course_code" placeholder="SWC3633"></label>
    <label>Course name <input id="f_course_name" placeholder="Web API Development"></label>
    <label>Faculty ID <input id="f_faculty_id" type="number" value="1"></label>
    <label>Lecturer ID <input id="f_lecturer_id" type="number" placeholder="e.g. 2"></label>
    <div id="f_error" class="form-error hidden"></div>
    <button class="btn-primary" onclick="submitCourse()">Create course</button>
  `);
});

async function submitCourse() {
  try {
    await api('/courses', { method: 'POST', body: {
      course_code: val('f_course_code'), course_name: val('f_course_name'),
      faculty_id: Number(val('f_faculty_id')), lecturer_id: Number(val('f_lecturer_id')),
    }});
    closeModal(); toast('Course created.'); loadCourses(1);
  } catch (err) { showFormError(err); }
}

async function deleteCourse(id) {
  if (!confirm('Delete this course?')) return;
  try { await api(`/courses/${id}`, { method: 'DELETE' }); toast('Course deleted.'); loadCourses(state.page.courses); }
  catch (err) { toast(err.message, true); }
}

// ---------- Examinations ----------
async function loadExams(page = state.page.examinations) {
  state.page.examinations = page;
  const searchInput = document.getElementById('examSearch');
  const search = searchInput ? searchInput.value : '';
  const tbody = document.getElementById('examsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="muted">Loading…</td></tr>`;
  try {
    const q = new URLSearchParams({ page, limit: 5, sortBy: 'exam_date', order: 'asc' });
    if (search) q.set('search', search);
    const { data, pagination } = await api(`/examinations?${q}`);
    tbody.innerHTML = data.map((x) => `
      <tr>
        <td>${x.course_code} — ${x.course_name}</td>
        <td>${x.exam_date}</td>
        <td>${x.start_time}–${x.end_time}</td>
        <td>${x.venue}</td>
        <td class="row-actions">
          ${state.user.role === 'student' ? `<button onclick="viewSlip(${x.exam_id})">Get slip (QR)</button>` : ''}
          ${state.user.role === 'admin' ? `<button onclick="deleteExam(${x.exam_id})" class="danger">Delete</button>` : ''}
        </td>
      </tr>`).join('') || `<tr><td colspan="5" class="muted">No examinations found.</td></tr>`;
    renderPager('examsPager', pagination, loadExams);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="error">${err.message}</td></tr>`;
  }
}

document.getElementById('examSearch')?.addEventListener('input', debounce(() => loadExams(1), 300));

document.getElementById('examAddBtn')?.addEventListener('click', () => {
  openModal('Schedule examination', `
    <label>Course ID <input id="f_course_id" type="number" placeholder="1"></label>
    <label>Date <input id="f_exam_date" type="date"></label>
    <label>Start time <input id="f_start_time" type="time"></label>
    <label>End time <input id="f_end_time" type="time"></label>
    <label>Venue <input id="f_venue" placeholder="Hall A, Block 3"></label>
    <div id="f_error" class="form-error hidden"></div>
    <button class="btn-primary" onclick="submitExam()">Schedule exam</button>
  `);
});

async function submitExam() {
  try {
    await api('/examinations', { method: 'POST', body: {
      course_id: Number(val('f_course_id')), exam_date: val('f_exam_date'),
      start_time: val('f_start_time'), end_time: val('f_end_time'), venue: val('f_venue'),
    }});
    closeModal(); toast('Examination scheduled.'); loadExams(1);
  } catch (err) { showFormError(err); }
}

async function deleteExam(id) {
  if (!confirm('Delete this examination?')) return;
  try { await api(`/examinations/${id}`, { method: 'DELETE' }); toast('Examination deleted.'); loadExams(state.page.examinations); }
  catch (err) { toast(err.message, true); }
}

async function viewSlip(examId) {
  openModal('Exam slip', '<p class="muted">Generating QR slip…</p>');
  try {
    const { data } = await api(`/examinations/${examId}/slip`);
    document.getElementById('modalBody').innerHTML = `
      <p><strong>${data.exam.course_code}</strong> — ${data.exam.course_name}</p>
      <p>${data.exam.exam_date}, ${data.exam.start_time}–${data.exam.end_time}, ${data.exam.venue}</p>
      <p>Student: ${data.student_name}</p>
      <img src="${data.qr_code.qr_image_url}" alt="Exam slip QR code">
      <p class="muted small">Generated via third-party QR Code Generator API (api.qrserver.com).</p>
    `;
  } catch (err) {
    document.getElementById('modalBody').innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// ---------- Results ----------
async function loadResults(page = state.page.results) {
  state.page.results = page;
  const tbody = document.getElementById('resultsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="muted">Loading…</td></tr>`;
  try {
    const q = new URLSearchParams({ page, limit: 5, sortBy: 'published_at', order: 'desc' });
    const { data, pagination } = await api(`/results?${q}`);
    tbody.innerHTML = data.map((r) => `
      <tr>
        <td>${r.student_name}</td>
        <td>${r.course_code} — ${r.course_name}</td>
        <td>${r.score}</td>
        <td><span class="badge badge-${r.grade}">${r.grade}</span></td>
        <td>${new Date(r.published_at).toLocaleDateString()}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="muted">No results found.</td></tr>`;
    renderPager('resultsPager', pagination, loadResults);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="error">${err.message}</td></tr>`;
  }
}

document.getElementById('resultAddBtn')?.addEventListener('click', () => {
  openModal('Publish result', `
    <label>Student ID <input id="f_student_id" type="number" placeholder="4"></label>
    <label>Exam ID <input id="f_exam_id" type="number" placeholder="1"></label>
    <label>Score (0–100) <input id="f_score" type="number" step="0.1" min="0" max="100"></label>
    <div id="f_error" class="form-error hidden"></div>
    <button class="btn-primary" onclick="submitResult()">Publish result</button>
  `);
});

async function submitResult() {
  try {
    await api('/results', { method: 'POST', body: {
      student_id: Number(val('f_student_id')), exam_id: Number(val('f_exam_id')), score: Number(val('f_score')),
    }});
    closeModal(); toast('Result published — student notified.'); loadResults(1);
  } catch (err) { showFormError(err); }
}

// ---------- Notifications ----------
async function loadNotifications() {
  const list = document.getElementById('notificationsList');
  if (!list) return;
  list.innerHTML = '<li class="muted">Loading…</li>';
  try {
    const { data } = await api('/notifications?limit=20');
    list.innerHTML = data.map((n) => `
      <li>${n.message}<div class="notif-meta">${n.type} · ${new Date(n.sent_at).toLocaleString()}</div></li>
    `).join('') || '<li class="muted">No notifications yet.</li>';
  } catch (err) {
    list.innerHTML = `<li class="error">${err.message}</li>`;
  }
}

// ---------- Pagination helper ----------
function renderPager(elId, pagination, loader) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { page, totalPages } = pagination;
  el.innerHTML = `
    <button ${page <= 1 ? 'disabled' : ''} onclick="(${loader.name})(${page - 1})">Prev</button>
    <span>Page ${page} of ${totalPages || 1}</span>
    <button ${page >= totalPages ? 'disabled' : ''} onclick="(${loader.name})(${page + 1})">Next</button>
  `;
}

// ---------- Modal helpers ----------
function openModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') closeModal(); });

function val(id) { return document.getElementById(id).value; }
function showFormError(err) {
  const box = document.getElementById('f_error');
  if (!box) return toast(err.message, true);
  const details = err.details ? err.details.map((d) => d.message).join('; ') : '';
  box.textContent = details || err.message;
  box.classList.remove('hidden');
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---------- Boot ----------
if (state.token && state.user) onLoggedIn();