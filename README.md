# HMRS School Management System

Modern Bangla school website for **হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়** (EIIN 112359), Sonargaon, Narayanganj.

## Stack
Next.js App Router, JavaScript, React, Tailwind CSS, Firebase Authentication, Firestore, Firebase Admin SDK, Lucide icons.

## Setup
1. Run npm install.
2. Copy .env.example to .env.local and configure Firebase Web App and Admin service-account environment variables.
3. Enable **Email/Password** provider in Firebase Authentication and create a Firestore database.
4. Deploy the included firestore.rules (all client access denied; private records are accessed only through role-checked server endpoints).
5. Deploy to Vercel with Firebase variables and `APP_ORIGIN` set to the canonical URL with `https://` (for example `https://hmrshs.vercel.app`). A bare hostname is also handled; requests from the site's actual host are accepted, including other Vercel aliases.
6. First-time `/install` uses name, a Bangladesh mobile number and a 5-digit PIN. Once the school is installed, this page cannot create new principals.
7. For **already installed** principal, use `/migrate` *once* with the existing email/password to register mobile + PIN. The old Firebase password is randomized server-side afterward.

**Security warning:** Without a setup key or another ownership check, the first person to successfully submit the public `/install` page can become principal. Keep the site private until the authorized principal installs it; perform setup immediately after Firebase connection. After installation, subsequent registration is blocked. For institutional production use, add an owner-verification step before enabling a fresh install.

**Important:** The GitHub repository intentionally contains no Firebase secrets and no seeded student personal data. The site cannot perform real logins or save applications until you supply a Firebase project. For Vercel, set FIREBASE_PRIVATE_KEY to the full PEM value; escaped newlines are supported.

### Login identities
- Every portal uses a Bangladesh mobile number (`01...`, `8801...`, `+8801...`) and 5-digit PIN, preserving leading zeros.
- Staff accounts are created by principal with mobile+PIN; students receive unique mobile+PIN on approval.
- Legacy accounts migrate once at `/migrate`; afterward the old password is randomized and not used again.
- **No school sections:** Grades 6–8 use class only; grades 9–10 select Science, Business Studies or Humanities. The admission form and dashboard no longer ask for sections. Existing legacy student document IDs and linked records remain intact; class teacher permissions accept grade assignments as well as older `6-a`-style assignments.

### Modules
Public site: home, announcements, admission form, role logins.
Student: profile, attendance, payable balance, published marks and printable report.
Teacher: students, attendance (present/absent/left_early), guardian WhatsApp click-to-chat, exam marks.
Class teacher: teacher tools plus assigned-class admission approvals, ledger, dues and report print.
Principal: all classes, notices, staff user creation, payments manual verification, school banner URL, results publication.

### Payment & messaging limitations
- Application captures preference for **mobile banking**, **online banking**, or **pay later**. It does **not** charge or confirm a payment; an authorized principal can manually flag a payment after independently verifying it. Add a contracted payment gateway and server-side webhook verification before claiming payment acceptance.
- WhatsApp is a **manual click-to-chat link** with a prefilled message; the staff member must send the message. Automatic WhatsApp/SMS delivery requires an approved provider and opt-in/consent.
- The banner uses a clearly labeled campus illustration until the principal uploads a genuine campus JPG/PNG/WebP using the server-side ImgBB API or provides a genuine HTTPS URL. Set `IMGBB_API_KEY` in Vercel's **Production** environment (and Preview if testing a preview deployment), then deploy/redeploy after the variable is added. Website Settings > image upload stores ImgBB's direct HTTPS image URL in Firestore `settings/school.photoUrl`, which the home hero reads through `/api/public`; no separate Save Settings click is required for uploads. Uploads accept JPG/PNG/WebP up to 3 MB, and only the principal can upload. The API key must never be prefixed with `NEXT_PUBLIC_`. No unrelated school's photo is presented as authentic.

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

### Phone-first portal
- Firebase custom tokens are minted server-side after validating phone + PIN (no raw PIN stored in Firebase Auth).
- PIN credentials are scrypt-salted in `loginCredentials` and phone mappings in `loginPhones`; direct Firestore client access remains forbidden.
- Five failures per 15 minutes lock phone/PIN login temporarily. Phone-number entry is NOT SMS verification or proof of SIM ownership; OTP, recovery and anti-abuse improvements are still required.
- One phone per account, including students; siblings sharing a guardian phone need a future profile selection design or different numbers.
- App manifest gives installable app feel; no offline cache or push notifications implemented yet.


### Principal record management & dashboard performance
- The principal can edit enrolled students (class, roll, demographics, login phone and elective subjects) and pending/rejected applications.
- Deleting a student requires entering their exact full name. The server deactivates login access before deleting the Firebase account, Firestore student, marks, attendance, PIN credentials, phone mappings, account-security record and device-recognition entries. The admission entry is retained with a `student_deleted` status for audit rather than silently erased.
- Changing a student's class or roll preserves the existing internal student ID, which keeps historical marks and attendance associated with the correct student. New enrollments use stable random IDs and grade/roll reservations.
- `/api/portal?resource=dashboard.data` returns authorized, route-specific payloads and actor information with one session check. Overview uses Firestore aggregate counts; the client caches visited sections, updates marks/attendance without full refreshes, and limits student/admission rendering to 25/20 records per page.
- Legacy section fields may still exist in historical Firestore documents. They are not exposed by the dashboard and are removed from updated records; no destructive data migration is performed automatically.


### Applicant self-service edits
- A newly submitted admission returns a private 256-bit edit token once; the database saves only its SHA-256 hash.
- The confirmation screen offers a copyable link whose secret is carried in the URL fragment, never the query string. Applicants may reopen their pending application from that link and save changes in the same three-step form. Once approved/rejected, the link stops allowing edits.
- The API checks the secret with constant-time comparison and checks pending status again in a Firestore transaction to prevent approval/edit races.
- **Existing applications created before edit tokens were added** cannot self-edit with an application ID alone; the principal can edit pending/rejected applications securely. Do not implement access using public application IDs or guessable phone/birth-registration combinations.


### Routine, notices, account-aware header
- **Principal dashboard → Routines:** add, edit, publish/unpublish or delete a class/exam routine, choosing all classes or class 6–10; groups (Science/Business/Humanities) are available only for classes 9–10. No sections are used.
- Upload JPG/PNG/WebP images (max 5 MB) via the server-side `/api/routine-image` endpoint and `IMGBB_API_KEY`. The editor includes drag-and-drop, image preview, and a separate save/publish action. Image URLs are validated as ImgBB HTTPS links before saving. Uploaded images live at ImgBB; deleting an HMRS routine removes its Firestore entry, not the remote ImgBB file.
- **Home → Routines:** only published routines appear; selecting a routine opens its full image.
- **Home → Notices:** rows show the title only, and full notice content opens on selection.
- **Site header:** on Firebase authentication confirmation, a signed-in visitor sees the Dashboard link instead of Portal Login. While checking session state, a neutral placeholder prevents flashing the wrong button.
- **Student removal:** the principal uses a clear confirm/cancel modal; the API requires `confirmed: true` rather than retyping the student name. Existing permission and record-deletion safeguards remain in place.
