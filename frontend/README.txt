EXAMFLOW - INDIVIDUAL FRONTEND
================================

This is a separate individual frontend for the SWC3633 Exam Scheduling & Result Management project.
It uses only HTML, CSS and JavaScript. No npm install is required for the frontend.

API BASE URL
------------
http://localhost:3000/api

HOW TO RUN
----------
1. Start the backend first:
   cd C:\xampp\htdocs\exam-system-project\exam-system\backend
   npm start

2. Copy the folder named "examflow-frontend" into:
   C:\xampp\htdocs\exam-system-project\exam-system\

3. Start Apache in XAMPP if you want to open it through localhost.
   MySQL is NOT required for this project because the backend uses SQLite.

4. Open:
   http://localhost/exam-system-project/exam-system/examflow-frontend/

5. Login using an existing account from your project, for example:
   Admin: admin@uptm.edu.my
   Student test account: student.test@uptm.edu.my
   Use the password you already set for that account.

FEATURES
--------
- JWT login and protected API calls
- Role-aware dashboard for admin / lecturer / student
- Exam schedule search
- Examination create/edit/delete for permitted roles
- Results view and publish/update/delete for permitted roles
- Course search and admin course management
- Notifications
- QR exam-slip generation through the existing third-party API integration
- API status indicator
- Error messages for failed requests
- Responsive layout

IMPORTANT
---------
This frontend is intentionally separate from the shared reference frontend supplied in the project.
For your report/video, describe it as your individual frontend and show its API integration.
