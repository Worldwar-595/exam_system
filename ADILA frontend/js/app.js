const API_BASE = 'http://localhost:3000/api';

const state = {
  token: localStorage.getItem('examflow_token'),
  user: JSON.parse(localStorage.getItem('examflow_user') || 'null'),
  exams: [],
  results: [],
  courses: [],
  notifications: [],
};

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function toast(message, isError = false) {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast${isError ? ' error' : ''}`;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

async function api(path, options = {}) {
  const { method = 'GET', body = null, auth = true } = options;
  const headers = {};
  if (body !== null) headers['Content-Type'] = 'application/json';
  if (auth && state.token) headers['Authorization'] = `Bearer ${state.token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error('Unable to connect to the API. Make sure npm start is running.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
      showLogin();
    }
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

function saveSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('examflow_user', JSON.stringify(user));
  localStorage.setItem('examflow_token', token);
}

function clearSession() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('examflow_user');
  localStorage.removeItem('examflow_token');
}

function showLogin() {
  $('loginScreen').classList.remove('hidden');
  $('appShell').classList.add('hidden');
}

function showApp() {
  $('loginScreen').classList.add('hidden');
  $('appShell').classList.remove('hidden');
  updateProfile();
  applyRoleUI();
  switchView('dashboard');
  checkApiStatus();
}

function updateProfile() {
  const u = state.user || {};
  $('userName').textContent = u.name || 'User';
  $('userRole').textContent = u.role || 'unknown';
  $('avatar').textContent = (u.name || 'U').trim().charAt(0).toUpperCase();
  $('welcomeText').textContent = `Welcome back, ${u.name?.split(' ')[0] || 'there'}.`;
  $('welcomeSubtext').textContent = u.role === 'student'
    ? 'Your registered exams and published results are ready to view.'
    : 'Manage academic schedules, courses and results from one place.';
}

function applyRoleUI() {
  const role = state.user?.role;
  const isAdmin = role === 'admin';
  const isStaff = isAdmin || role === 'lecturer';
  document.querySelectorAll('.admin-only').forEach((el) => el.classList.toggle('hidden', !isAdmin));
  document.querySelectorAll('.staff-only').forEach((el) => el.classList.toggle('hidden', !isStaff));
}

async function login(email, password) {
  const button = $('loginForm').querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Signing in…';
  $('loginError').classList.add('hidden');
  try {
    const result = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    saveSession(result.data.user, result.data.token);
    showApp();
  } catch (err) {
    $('loginError').textContent = err.message;
    $('loginError').classList.remove('hidden');
  } finally {
    button.disabled = false;
    button.textContent = 'Sign in';
  }
}

async function checkApiStatus() {
  const dot = $('apiDot');
  const text = $('apiStatusText');
  try {
    await api('/health', { auth: false });
    dot.style.background = '#7bd8a3';
    text.textContent = 'API online';
  } catch {
    dot.style.background = '#ef7e7e';
    text.textContent = 'API offline';
  }
}

const pageMeta = {
  dashboard: ['DASHBOARD', 'Overview'],
  examinations: ['ACADEMIC SCHEDULE', 'Exam Schedule'],
  results: ['ACADEMIC RESULTS', 'Results'],
  courses: ['COURSE CATALOGUE', 'Courses'],
  notifications: ['SYSTEM UPDATES', 'Notifications'],
};

function switchView(view) {
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  const target = $(`view-${view}`);
  if (!target) return;
  target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  $('pageEyebrow').textContent = pageMeta[view][0];
  $('pageTitle').textContent = pageMeta[view][1];

  if (view === 'dashboard') loadDashboard();
  if (view === 'examinations') loadExams();
  if (view === 'results') loadResults();
  if (view === 'courses') loadCourses();
  if (view === 'notifications') loadNotifications();
}

async function loadDashboard() {
  $('statGrid').innerHTML = '<div class="loading">Loading dashboard…</div>';
  $('upcomingList').innerHTML = '<div class="loading">Loading…</div>';
  try {
    const [courses, exams, results] = await Promise.all([
      api('/courses?limit=1'),
      api('/examinations?limit=10'),
      api('/results?limit=1'),
    ]);
    $('statGrid').innerHTML = [
      [courses.pagination?.total ?? courses.data?.length ?? 0, 'Courses'],
      [exams.pagination?.total ?? exams.data?.length ?? 0, state.user.role === 'student' ? 'Your examinations' : 'Scheduled examinations'],
      [results.pagination?.total ?? results.data?.length ?? 0, state.user.role === 'student' ? 'Your results' : 'Published results'],
      [state.user.role, 'Current role'],
    ].map(([value, label]) => `<div class="stat-card"><div class="value">${escapeHtml(value)}</div><div class="label">${escapeHtml(label)}</div></div>`).join('');

    const examsData = [...(exams.data || [])].sort((a,b) => `${a.exam_date} ${a.start_time}`.localeCompare(`${b.exam_date} ${b.start_time}`));
    $('upcomingList').innerHTML = examsData.slice(0, 4).map(exam => {
      const d = new Date(`${exam.exam_date}T00:00:00`);
      return `<div class="mini-row">
        <div class="date-box"><span class="d">${String(d.getDate()).padStart(2,'0')}</span><span class="m">${d.toLocaleString('en-US',{month:'short'})}</span></div>
        <div><strong>${escapeHtml(exam.course_code)}</strong><span>${escapeHtml(exam.course_name)} · ${escapeHtml(exam.venue)}</span></div>
        <span>${escapeHtml(exam.start_time)}</span>
      </div>`;
    }).join('') || '<div class="empty-state">No examinations found.</div>';
  } catch (err) {
    $('statGrid').innerHTML = `<div class="form-alert">${escapeHtml(err.message)}</div>`;
    $('upcomingList').innerHTML = '';
  }

  const actions = [];
  actions.push(['examinations', 'View exam schedule', 'Check dates, times and venues.']);
  actions.push(['results', 'View results', 'See scores and calculated grades.']);
  if (state.user.role === 'admin') actions.push(['courses', 'Manage courses', 'Add, edit and remove courses.']);
  if (state.user.role === 'admin' || state.user.role === 'lecturer') actions.push(['examinations', 'Schedule an exam', 'Create a new examination entry.']);
  $('quickActions').innerHTML = actions.map(([view, title, desc]) => `<button class="quick-action" data-go="${view}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(desc)}</span></button>`).join('');
  bindGoButtons();
}

function formatDate(value) {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadExams() {
  $('examTableWrap').innerHTML = '<div class="loading">Loading examinations…</div>';
  const search = $('examSearch').value.trim();
  const query = search ? `?search=${encodeURIComponent(search)}&limit=100` : '?limit=100';
  try {
    const result = await api(`/examinations${query}`);
    state.exams = result.data || [];
    renderExams();
  } catch (err) {
    $('examTableWrap').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function renderExams() {
  if (!state.exams.length) {
    $('examTableWrap').innerHTML = '<div class="empty-state">No examinations found.</div>';
    return;
  }
  const canManage = state.user.role === 'admin' || state.user.role === 'lecturer';
  $('examTableWrap').innerHTML = `<table>
    <thead><tr><th>Course</th><th>Date</th><th>Time</th><th>Venue</th><th>Actions</th></tr></thead>
    <tbody>
      ${state.exams.map(e => `<tr>
        <td><strong>${escapeHtml(e.course_code)}</strong><div class="muted">${escapeHtml(e.course_name)}</div></td>
        <td>${escapeHtml(formatDate(e.exam_date))}</td>
        <td>${escapeHtml(e.start_time)} – ${escapeHtml(e.end_time)}</td>
        <td>${escapeHtml(e.venue)}</td>
        <td><div class="action-row">
          <button class="small-btn" data-qr="${e.exam_id}">QR slip</button>
          ${canManage ? `<button class="small-btn" data-edit-exam="${e.exam_id}">Edit</button>` : ''}
          ${state.user.role === 'admin' ? `<button class="small-btn danger" data-delete-exam="${e.exam_id}">Delete</button>` : ''}
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table>`;

  $('examTableWrap').querySelectorAll('[data-qr]').forEach(btn => btn.addEventListener('click', () => openQrModal(Number(btn.dataset.qr))));
  $('examTableWrap').querySelectorAll('[data-edit-exam]').forEach(btn => btn.addEventListener('click', () => openExamForm(Number(btn.dataset.editExam))));
  $('examTableWrap').querySelectorAll('[data-delete-exam]').forEach(btn => btn.addEventListener('click', () => deleteExam(Number(btn.dataset.deleteExam))));
}

async function loadResults() {
  $('resultTableWrap').innerHTML = '<div class="loading">Loading results…</div>';
  try {
    const result = await api('/results?limit=100&sortBy=published_at&order=DESC');
    state.results = result.data || [];
    renderResults();
  } catch (err) {
    $('resultTableWrap').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function renderResults() {
  if (!state.results.length) {
    $('resultTableWrap').innerHTML = '<div class="empty-state">No published results found.</div>';
    return;
  }
  const staff = state.user.role === 'admin' || state.user.role === 'lecturer';
  $('resultTableWrap').innerHTML = `<table>
    <thead><tr><th>Student</th><th>Course</th><th>Exam date</th><th>Score</th><th>Grade</th><th>Published</th>${staff ? '<th>Actions</th>' : ''}</tr></thead>
    <tbody>${state.results.map(r => `<tr>
      <td><strong>${escapeHtml(r.student_name)}</strong></td>
      <td><strong>${escapeHtml(r.course_code)}</strong><div class="muted">${escapeHtml(r.course_name)}</div></td>
      <td>${escapeHtml(formatDate(r.exam_date))}</td>
      <td>${escapeHtml(r.score)}</td>
      <td><span class="badge badge-${escapeHtml(r.grade)}">${escapeHtml(r.grade)}</span></td>
      <td>${escapeHtml(r.published_at || '-')}</td>
      ${staff ? `<td><div class="action-row"><button class="small-btn" data-edit-result="${r.result_id}">Edit score</button>${state.user.role === 'admin' ? `<button class="small-btn danger" data-delete-result="${r.result_id}">Delete</button>` : ''}</div></td>` : ''}
    </tr>`).join('')}</tbody>
  </table>`;
  $('resultTableWrap').querySelectorAll('[data-edit-result]').forEach(btn => btn.addEventListener('click', () => openResultForm(Number(btn.dataset.editResult))));
  $('resultTableWrap').querySelectorAll('[data-delete-result]').forEach(btn => btn.addEventListener('click', () => deleteResult(Number(btn.dataset.deleteResult))));
}

async function loadCourses() {
  $('courseGrid').innerHTML = '<div class="loading">Loading courses…</div>';
  const search = $('courseSearch').value.trim();
  try {
    const query = search ? `?search=${encodeURIComponent(search)}&limit=100` : '?limit=100';
    const result = await api(`/courses${query}`);
    state.courses = result.data || [];
    renderCourses();
  } catch (err) {
    $('courseGrid').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function renderCourses() {
  if (!state.courses.length) {
    $('courseGrid').innerHTML = '<div class="empty-state">No courses found.</div>';
    return;
  }
  const canDelete = state.user.role === 'admin';
  $('courseGrid').innerHTML = state.courses.map(c => `<article class="course-card">
    <div class="code">${escapeHtml(c.course_code)}</div>
    <h3>${escapeHtml(c.course_name)}</h3>
    <div class="course-meta">
      <span>Faculty: <strong>${escapeHtml(c.faculty_name || c.faculty_id)}</strong></span>
      <span>Lecturer: <strong>${escapeHtml(c.lecturer_name || c.lecturer_id)}</strong></span>
    </div>
    ${canDelete || state.user.role === 'lecturer' ? `<div class="action-row"><button class="small-btn" data-edit-course="${c.course_id}">Edit</button>${canDelete ? `<button class="small-btn danger" data-delete-course="${c.course_id}">Delete</button>` : ''}</div>` : ''}
  </article>`).join('');
  $('courseGrid').querySelectorAll('[data-edit-course]').forEach(btn => btn.addEventListener('click', () => openCourseForm(Number(btn.dataset.editCourse))));
  $('courseGrid').querySelectorAll('[data-delete-course]').forEach(btn => btn.addEventListener('click', () => deleteCourse(Number(btn.dataset.deleteCourse))));
}

async function loadNotifications() {
  $('notificationList').innerHTML = '<div class="loading">Loading notifications…</div>';
  try {
    const result = await api('/notifications?limit=50');
    state.notifications = result.data || [];
    if (!state.notifications.length) {
      $('notificationList').innerHTML = '<div class="empty-state">No notifications yet.</div>';
      return;
    }
    $('notificationList').innerHTML = state.notifications.map(n => `<article class="notification">
      <strong>${escapeHtml(n.message)}</strong>
      <p>${escapeHtml(n.type || 'system')} · ${n.sent_at ? escapeHtml(new Date(n.sent_at).toLocaleString()) : 'Recently'}</p>
    </article>`).join('');
  } catch (err) {
    $('notificationList').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function openModal(eyebrow, title, html) {
  $('modalEyebrow').textContent = eyebrow;
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  $('modalBackdrop').classList.remove('hidden');
}
function closeModal() { $('modalBackdrop').classList.add('hidden'); }

function openExamForm(id = null) {
  const exam = id ? state.exams.find(e => e.exam_id === id) : null;
  openModal(id ? 'EDIT EXAM' : 'NEW EXAM', id ? 'Update examination' : 'Schedule an examination', `
    <form id="examForm" class="modal-form">
      <label>Course ID<input id="examCourseId" type="number" min="1" value="${exam ? escapeHtml(exam.course_id) : '1'}" required /></label>
      <div class="form-grid-2">
        <label>Exam date<input id="examDate" type="date" value="${exam ? escapeHtml(exam.exam_date) : ''}" required /></label>
        <label>Venue<input id="examVenue" value="${exam ? escapeHtml(exam.venue) : ''}" placeholder="Hall A, Block 3" required /></label>
      </div>
      <div class="form-grid-2">
        <label>Start time<input id="examStart" type="time" value="${exam ? escapeHtml(exam.start_time) : '09:00'}" required /></label>
        <label>End time<input id="examEnd" type="time" value="${exam ? escapeHtml(exam.end_time) : '11:00'}" required /></label>
      </div>
      <p class="form-help">Use an existing course ID from the Courses page. Lecturers can only manage exams for courses they teach.</p>
      <div id="modalError" class="form-alert hidden"></div>
      <div class="form-actions"><button type="button" class="btn btn-secondary" id="cancelModal">Cancel</button><button class="btn btn-primary" type="submit">${id ? 'Save changes' : 'Schedule exam'}</button></div>
    </form>`);

  $('cancelModal').addEventListener('click', closeModal);
  $('examForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      course_id: Number($('examCourseId').value),
      exam_date: $('examDate').value,
      start_time: $('examStart').value,
      end_time: $('examEnd').value,
      venue: $('examVenue').value.trim(),
    };
    try {
      await api(id ? `/examinations/${id}` : '/examinations', { method: id ? 'PUT' : 'POST', body });
      closeModal();
      toast(id ? 'Examination updated.' : 'Examination scheduled.');
      loadExams();
      loadDashboard();
    } catch (err) {
      showModalError(err);
    }
  });
}

async function deleteExam(id) {
  if (!confirm(`Delete examination #${id}?`)) return;
  try {
    await api(`/examinations/${id}`, { method: 'DELETE' });
    toast('Examination deleted.');
    loadExams();
    loadDashboard();
  } catch (err) { toast(err.message, true); }
}

function openCourseForm(id = null) {
  const course = id ? state.courses.find(c => c.course_id === id) : null;
  openModal(id ? 'EDIT COURSE' : 'NEW COURSE', id ? 'Update course' : 'Add a course', `
    <form id="courseForm" class="modal-form">
      <label>Course code<input id="courseCode" value="${course ? escapeHtml(course.course_code) : ''}" placeholder="SWC4003" required /></label>
      <label>Course name<input id="courseName" value="${course ? escapeHtml(course.course_name) : ''}" placeholder="Advanced Web Development" required /></label>
      <div class="form-grid-2">
        <label>Faculty ID<input id="facultyId" type="number" min="1" value="${course ? escapeHtml(course.faculty_id) : '1'}" required /></label>
        <label>Lecturer ID<input id="lecturerId" type="number" min="1" value="${course ? escapeHtml(course.lecturer_id) : '2'}" required /></label>
      </div>
      <p class="form-help">For this existing API, faculty and lecturer are referenced by their numeric database IDs.</p>
      <div id="modalError" class="form-alert hidden"></div>
      <div class="form-actions"><button type="button" class="btn btn-secondary" id="cancelModal">Cancel</button><button class="btn btn-primary" type="submit">${id ? 'Save changes' : 'Create course'}</button></div>
    </form>`);

  $('cancelModal').addEventListener('click', closeModal);
  $('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      course_code: $('courseCode').value.trim(),
      course_name: $('courseName').value.trim(),
      faculty_id: Number($('facultyId').value),
      lecturer_id: Number($('lecturerId').value),
    };
    try {
      await api(id ? `/courses/${id}` : '/courses', { method: id ? 'PUT' : 'POST', body });
      closeModal();
      toast(id ? 'Course updated.' : 'Course created.');
      loadCourses();
      loadDashboard();
    } catch (err) { showModalError(err); }
  });
}

async function deleteCourse(id) {
  if (!confirm(`Delete course #${id}? Make sure it is not needed by an existing exam.`)) return;
  try {
    await api(`/courses/${id}`, { method: 'DELETE' });
    toast('Course deleted.');
    loadCourses();
    loadExams();
    loadDashboard();
  } catch (err) { toast(err.message, true); }
}

function openResultForm(id = null) {
  const result = id ? state.results.find(r => r.result_id === id) : null;
  openModal(id ? 'EDIT RESULT' : 'PUBLISH RESULT', id ? 'Update result score' : 'Publish a result', `
    <form id="resultForm" class="modal-form">
      ${id ? `<div class="detail-box"><strong>${escapeHtml(result?.student_name || '')}</strong> · ${escapeHtml(result?.course_code || '')}<br>Result ID: ${escapeHtml(id)}</div>` : ''}
      ${id ? '' : '<label>Student ID<input id="resultStudentId" type="number" min="1" value="5" required /></label>'}
      ${id ? '' : '<label>Exam ID<input id="resultExamId" type="number" min="1" value="3" required /></label>'}
      <label>Score<input id="resultScore" type="number" min="0" max="100" step="0.1" value="${id ? escapeHtml(result?.score) : '85'}" required /></label>
      <p class="form-help">Grade is calculated automatically by the API from the score. Publishing a result also creates a student notification.</p>
      <div id="modalError" class="form-alert hidden"></div>
      <div class="form-actions"><button type="button" class="btn btn-secondary" id="cancelModal">Cancel</button><button class="btn btn-primary" type="submit">${id ? 'Save result' : 'Publish result'}</button></div>
    </form>`);

  $('cancelModal').addEventListener('click', closeModal);
  $('resultForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { score: Number($('resultScore').value) };
    if (!id) {
      body.student_id = Number($('resultStudentId').value);
      body.exam_id = Number($('resultExamId').value);
    }
    try {
      await api(id ? `/results/${id}` : '/results', { method: id ? 'PUT' : 'POST', body });
      closeModal();
      toast(id ? 'Result updated.' : 'Result published and notification created.');
      loadResults();
      loadNotifications();
      loadDashboard();
    } catch (err) { showModalError(err); }
  });
}

async function deleteResult(id) {
  if (!confirm(`Delete result #${id}?`)) return;
  try {
    await api(`/results/${id}`, { method: 'DELETE' });
    toast('Result deleted.');
    loadResults();
    loadDashboard();
  } catch (err) { toast(err.message, true); }
}

async function openQrModal(examId) {
  try {
    const isStudent = state.user.role === 'student';
    const studentId = isStudent ? '' : prompt('Enter student ID for the exam slip:', '4');
    if (!isStudent && !studentId) return;
    const path = isStudent ? `/examinations/${examId}/slip` : `/examinations/${examId}/slip?student_id=${encodeURIComponent(studentId)}`;
    const result = await api(path);
    const qr = result.data.qr_code;
    openModal('EXAM SLIP', 'QR code ready', `
      <div class="qr-wrap">
        <img src="${escapeHtml(qr.qr_image_url)}" alt="Exam slip QR code" />
        <p class="form-help" style="margin-top:12px;"><strong>${escapeHtml(result.data.student_name)}</strong><br>${escapeHtml(result.data.exam.course_code)} · ${escapeHtml(result.data.exam.exam_date)} · ${escapeHtml(result.data.exam.start_time)} · ${escapeHtml(result.data.exam.venue)}</p>
        <p class="form-help">Generated through the project's external QR Code Generator API.</p>
      </div>`);
  } catch (err) {
    toast(err.message, true);
  }
}

function showModalError(err) {
  const el = $('modalError');
  if (!el) { toast(err.message, true); return; }
  let message = err.message;
  if (Array.isArray(err.details)) message += ' ' + err.details.map(x => x.msg || x.message).join(' ');
  el.textContent = message;
  el.classList.remove('hidden');
}

function bindGoButtons() {
  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.onclick = () => switchView(btn.dataset.go);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    login($('loginEmail').value.trim(), $('loginPassword').value);
  });

  $('passwordToggle').addEventListener('click', () => {
    const field = $('loginPassword');
    const isPassword = field.type === 'password';
    field.type = isPassword ? 'text' : 'password';
    $('passwordToggle').textContent = isPassword ? '◌' : '◉';
    $('passwordToggle').setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });

  $('logoutBtn').addEventListener('click', () => {
    clearSession();
    showLogin();
    toast('Signed out.');
  });

  $('sidebarNav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn) switchView(btn.dataset.view);
  });

  $('closeModalBtn').addEventListener('click', closeModal);
  $('modalBackdrop').addEventListener('click', (e) => { if (e.target === $('modalBackdrop')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  $('addExamBtn').addEventListener('click', () => openExamForm());
  $('addResultBtn').addEventListener('click', () => openResultForm());
  $('addCourseBtn').addEventListener('click', () => openCourseForm());
  $('examSearch').addEventListener('input', () => loadExams());
  $('courseSearch').addEventListener('input', () => loadCourses());
  bindGoButtons();

  if (state.token) {
    try {
      const me = await api('/auth/me');
      state.user = me.data;
      localStorage.setItem('examflow_user', JSON.stringify(state.user));
      showApp();
    } catch {
      clearSession();
      showLogin();
    }
  } else {
    showLogin();
  }
});
