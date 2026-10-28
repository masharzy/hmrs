# HMRS School Management System

Modern Bangla school website for **হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়** (EIIN 112359), Sonargaon, Narayanganj.

## Stack
Next.js App Router, JavaScript, React, Tailwind CSS, Firebase Authentication, Firestore, Firebase Admin SDK, Lucide icons.

## Setup
1. Run npm install.
2. Copy .env.example to .env.local and configure Firebase Web App and Admin service-account environment variables.
3. Enable **Email/Password** provider in Firebase Authentication and create a Firestore database.
4. Deploy the included firestore.rules (all client access denied; private records are accessed only through role-checked server endpoints).
5. Deploy to Vercel with Firebase variables and `APP_ORIGIN` set to the canonical URL.
6. Visit `/install` over HTTPS, and create the principal's account with name, email and strong password. No setup key or UID lookup is required. The installer registers one principal only and marks the Firestore installation record as complete.
7. Sign in at `/login/principal` with the created email and password.

**Security warning:** Without a setup key or another ownership check, the first person to successfully submit the public `/install` page can become principal. Keep the site private until the authorized principal installs it; perform setup immediately after Firebase connection. After installation, subsequent registration is blocked. For institutional production use, add an owner-verification step before enabling a fresh install.

**Important:** The GitHub repository intentionally contains no Firebase secrets and no seeded student personal data. The site cannot perform real logins or save applications until you supply a Firebase project. For Vercel, set FIREBASE_PRIVATE_KEY to the full PEM value; escaped newlines are supported.

### Login identities
- Student login (class, section, roll, password) maps internally to Firebase email s{grade}-{section}-{roll}@students.hmrs.school.
- Staff accounts use {username}@staff.hmrs.school, created only by principal.
- Principal signs in with the email and password created once at `/install`; role authorization is stored in Firestore `users/{uid}`.
- Section identifiers: a (ক), b (খ), c (গ). Additional identifiers are supported in the backend.

### Modules
Public site: home, announcements, admission form, role logins.
Student: profile, attendance, payable balance, published marks and printable report.
Teacher: students, attendance (present/absent/left_early), guardian WhatsApp click-to-chat, exam marks.
Class teacher: teacher tools plus assigned-class admission approvals, ledger, dues and report print.
Principal: all classes, notices, staff user creation, payments manual verification, school banner URL, results publication.

### Payment & messaging limitations
- Application captures preference for **mobile banking**, **online banking**, or **pay later**. It does **not** charge or confirm a payment; an authorized principal can manually flag a payment after independently verifying it. Add a contracted payment gateway and server-side webhook verification before claiming payment acceptance.
- WhatsApp is a **manual click-to-chat link** with a prefilled message; the staff member must send the message. Automatic WhatsApp/SMS delivery requires an approved provider and opt-in/consent.
- The banner uses a clearly labeled campus illustration until the principal uploads a genuine campus JPG/PNG/WebP to Firebase Storage or provides a genuine HTTPS URL. Upload requires service-account Storage bucket permissions. No unrelated school's photo is presented as authentic.

### Academic grading
Rules are in lib/academic.js and covered by tests/academic.test.js. Grades 6-8 combine Bangla and English papers; grades 9-10 implement CQ/MCQ/practical separate pass thresholds, combined Bangla CQ/MCQ and English paper marks, and an optional-subject bonus. A subject passes at **33% inclusive**, consistent with the supplied marks-to-GPA table. Configure each student elective/fourth subject with the class-teacher tool. School and board administrators should review the grading rules before official publication.

### Security notes
- Firebase ID tokens checked on every private API request; Firestore client reads/writes denied.
- Role and class-scoped authorization checked on the server. `/install` uses a Firestore transaction to reserve the first registration and locks itself after success. Without an ownership check it remains vulnerable to a first-visitor takeover before setup, so do not expose an uninstalled school publicly.
- Passwords are held by Firebase Authentication, not Firestore. Never send passwords by WhatsApp, and require users to change initial passwords operationally.
- Attendance and sensitive records are never exposed in public API; audit entries are written for private operations.
- Before production, configure App Check/captcha and distributed rate limiting on the public admission endpoint, backup/retention, guardian consent, account recovery, and transaction-safe payment integration.

## Commands
npm run dev
npm run test
npm run build

### CI
GitHub Actions runs tests and a production build for pushes and pull requests. 
