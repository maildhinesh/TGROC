# Tamil School (Aathichudi) Feature Plan

Date: 2026-05-04
Status: Planning only (no code changes)

## Objective
Introduce a Tamil School module with three new roles and role-specific workflows:
- School-Parent
- School-Teacher
- School-Admin

## Core Requirements
- School-Parent must be a paid member.
- School-Teacher and School-Admin can be members or school-only users.
- If teacher/admin is school-only (not a TGROC member), they should only see school-related menus.
- School-Parent is assigned when a paid member has enrolled students.
- Parents can re-enroll students each school year (September through June).
- Enrollment must collect:
  - Student details
  - Health insurance details
  - Pediatrician details
  - Medical waiver (authorization to use insurance details in case of injury/illness)
  - Media waiver (photos/videos taken during school activities can be published on social media)
- Parent dashboard must show student attendance summary and recent grades.
- Teacher must see class roster and update attendance/grades.
- School-Admin must review enrollment documents, manage teachers, assign classes/students, and view attendance/grades for all students.
- School-Admin must create and maintain a school calendar for each school year.
- School operates on Saturdays only.
- Classroom assigned to a class can vary week-to-week based on availability.
- More than one class can run in the same classroom.
- Any school-calendar update must trigger email notifications to School-Teachers and School-Parents.

## Phased Execution Plan

## Phase 1: Foundation and Access Control
- Define school domain glossary.
- Model new school roles.
- Specify membership-role linkage rules.
- Plan role-based navigation behavior.
- Define authorization matrix per role/action.

Deliverables:
- Role-permission matrix
- Membership linkage rules table
- Navigation visibility rules

## Phase 2: Data and Lifecycle Design
- Design school-year enrollment lifecycle (September to June, re-enrollment).
- Design school calendar model for each school year.
- Design Saturday-only session rule and calendar validation.
- Design weekly class-to-classroom assignment model (variable room per week).
- Design shared-classroom scheduling model (multiple classes per room at the same time slot if intended).
- Design student profile schema.
- Design enrollment document schema.
- Design waivers and consent tracking (with timestamps and versioning).
- Design attendance data model.
- Design grading data model.
- Design class and teacher/student assignment model.
- Define validations and business rules.

Deliverables:
- Data model specification
- Lifecycle/state diagrams
- Validation rulebook

## Phase 3: Workflows and APIs
- Plan school-parent dashboard widgets.
- Plan teacher classroom workflows.
- Plan admin oversight workflows.
- Plan school-admin calendar management workflows (create, edit, publish, revise).
- Define API endpoints and permissions, including school calendar and weekly classroom allocations.

Deliverables:
- Workflow specs (parent, teacher, admin)
- Endpoint catalog and contracts
- Permission coverage map

## Phase 4: Rollout, Ops, and Quality
- Plan migration and backfill strategy.
- Plan auditing and access logging.
- Plan notifications and reminders.
- Define calendar-change email notification rules and templates for School-Teachers and School-Parents.
- Define reporting and exports.
- Define QA and test scenarios.
- Update docs and admin runbook.

Deliverables:
- Rollout checklist
- Test plan and edge-case suite
- Operations runbook updates

## Master Todo Checklist
- [x] Define school domain glossary
- [x] Model new school roles
- [x] Specify membership-role linkage rules
- [x] Design school-year enrollment lifecycle
- [x] Design school-year calendar model
- [x] Define Saturday-only school-day rules
- [x] Design student profile schema
- [x] Design weekly class-to-classroom assignment model
- [x] Design shared-classroom scheduling rules
- [x] Design enrollment document schema
- [x] Design waivers and consent tracking
- [x] Design attendance data model
- [x] Design grading data model
- [x] Design class and teacher assignments
- [x] Plan role-based navigation behavior
- [x] Plan school-parent dashboard widgets
- [x] Plan teacher classroom workflows
- [x] Plan admin oversight workflows
- [x] Plan school-admin calendar management workflows
- [x] Define API endpoints and permissions
- [x] Define validations and business rules
- [x] Plan migration and backfill strategy
- [x] Plan auditing and access logging
- [x] Plan notifications and reminders
- [x] Define calendar-change email notification workflow
- [x] Define reporting and exports
- [x] Define QA and test scenarios
- [x] Update docs and admin runbook

## Suggested Execution Order
1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4

---

## Phase 1 Execution (Completed Draft)

This section executes Phase 1 planning deliverables so implementation can begin with clear role and access boundaries.

### 1) School Domain Glossary

| Term | Definition |
|---|---|
| Tamil School | The Aathichudi program operated under TGROC. |
| School Year | Academic cycle from September through June. |
| School Calendar | The scheduled list of school days and class sessions for a specific school year. |
| School Day | A Saturday in the school year on which classes are scheduled. |
| Class | A teaching group (for example by level/grade) in a school year. |
| Classroom | Physical room used to host one or more classes for a scheduled slot. |
| Enrollment | Parent submission that registers a student for a specific school year. |
| Re-enrollment | New enrollment record for a returning student in a new school year. |
| Student Profile | Core student details retained across years (name, DOB, etc.). |
| Enrollment Document Set | School-year-specific documents/details: insurance, pediatrician, waivers. |
| Medical Waiver | Parent consent allowing school to use provided medical/insurance info in emergency. |
| Media Waiver | Parent consent allowing photo/video capture and publication on social media. |
| Paid Member | User with ACTIVE status and valid (non-expired) membership. |
| School-only Staff | Teacher/Admin user without an active TGROC membership role. |

### 2) Role Model (Phase 1 Decision)

New school roles are additive capability roles and can coexist with existing portal roles.

| Role | Purpose | Coexistence |
|---|---|---|
| School-Parent | Manage school enrollments and view their students' progress | Must coexist with paid member eligibility |
| School-Teacher | Manage assigned class roster, attendance, grades | Can coexist with member roles or be school-only |
| School-Admin | Full school operations and oversight | Can coexist with member roles or be school-only |

Role assignment principles:
- A user may hold multiple roles.
- School capabilities are granted by school roles, not by MEMBER/OFFICE_BEARER/ADMIN alone.
- Existing community roles keep existing portal behavior unless explicitly restricted by school-only mode.

### 3) Membership-Linkage Rules (Phase 1 Decision)

| Rule ID | Rule |
|---|---|
| ML-01 | School-Parent role can be assigned only if user is a paid member. |
| ML-02 | Paid member for ML-01 means ACTIVE user status and membership not expired. |
| ML-03 | If membership expires, School-Parent enters restricted state until membership is restored. |
| ML-04 | School-Teacher can exist with or without paid membership. |
| ML-05 | School-Admin can exist with or without paid membership. |
| ML-06 | School-only Teacher/Admin users can access only school menus and school routes. |
| ML-07 | A user can be both School-Parent and School-Teacher/Admin if all eligibility rules are met. |

Membership-expiry behavior for School-Parent:
- Existing historical school data remains readable.
- New enrollment/re-enrollment and parent write-actions are blocked until paid membership is valid again.
- Optional grace-period behavior can be introduced later (not part of Phase 1 baseline).

### 4) Navigation Visibility Rules (Phase 1 Decision)

Global navigation rule:
- Show menus by union of granted capabilities.
- If user is school-only (Teacher/Admin without member eligibility), render school-only navigation shell.

| User Type | Visible Navigation |
|---|---|
| Member-only (no school role) | Existing non-school portal menus only |
| School-Parent + paid member | Existing member menus + School Parent menus |
| School-Teacher (member) | Existing member/other-role menus + School Teacher menus |
| School-Teacher (school-only) | School Teacher menus only |
| School-Admin (member) | Existing role menus + School Admin menus |
| School-Admin (school-only) | School Admin menus only |
| Multi-role school user | Combined school menus; admin-level school menus supersede teacher-level school menus |

School menu groups for Phase 1:
- Parent: My Students, Enrollment, Attendance and Grades
- Teacher: My Classes, Attendance Entry, Grade Entry
- School Admin: Calendar, Classes and Rooms, Teacher Management, Enrollment Review, School Reports

### 5) Authorization Matrix (Phase 1 Decision)

Legend:
- Allow: action permitted
- Conditional: permitted only when condition holds
- Deny: not permitted

| Action | School-Parent | School-Teacher | School-Admin |
|---|---|---|---|
| View own student profiles | Allow | Deny | Allow |
| Create/re-enroll own students for school year | Conditional (paid member valid) | Deny | Allow |
| Edit own submitted enrollment docs before approval | Conditional (paid member valid) | Deny | Allow |
| Accept waivers for own students | Conditional (paid member valid) | Deny | Allow |
| View own students attendance summary | Allow | Deny | Allow |
| View own students recent grades | Allow | Deny | Allow |
| View assigned class roster | Deny | Allow | Allow |
| Update attendance for assigned classes | Deny | Allow | Allow |
| Update grades for assigned classes | Deny | Allow | Allow |
| View all students across school | Deny | Deny | Allow |
| Review enrollment documents | Deny | Deny | Allow |
| Approve/reject enrollment records | Deny | Deny | Allow |
| Add/remove school teachers | Deny | Deny | Allow |
| Assign classes to teachers | Deny | Deny | Allow |
| Assign students to classes/teachers | Deny | Deny | Allow |
| Create school calendar per year | Deny | Deny | Allow |
| Update school calendar | Deny | Deny | Allow |
| Trigger calendar-change notifications | Deny | Deny | Allow |
| View school-wide attendance and grades | Deny | Deny | Allow |

Cross-cutting authorization constraints:
- Parents can act only on students linked to their own parent account.
- Teachers can write only for classes currently assigned to them.
- Admin can read/write across all school entities.
- School-only users are blocked from non-school protected routes by middleware/nav policy.

### 6) Phase 1 Deliverables Status

| Deliverable | Status |
|---|---|
| School glossary | Done |
| Role-permission model | Done |
| Membership linkage rules | Done |
| Navigation visibility rules | Done |
| Authorization matrix | Done |

### 7) Open Decisions (Need Your Confirmation)

| Decision | Current Draft |
|---|---|
| Paid member definition for School-Parent | ACTIVE + membership not expired |
| Parent behavior on membership expiry | Read-only historical visibility; no new writes |
| Multi-role navigation behavior | Union of menus (school-only exception applies) |
| Teacher write scope | Assigned classes only |
| School-only scope enforcement | Middleware + menu filtering |

If approved, Phase 2 can proceed directly from these access and policy baselines.

---

## Phase 2 Execution (Completed Draft)

This section executes Phase 2 planning deliverables: lifecycle, school-year data model, calendar/scheduling model, and validation rules.

### 1) School-Year Enrollment Lifecycle

Lifecycle baseline:
- School Year window: September 1 through June 30.
- No regular classes outside school-year window.
- Re-enrollment is a new enrollment record each school year.

Enrollment states (per student per school year):
- Draft: parent started but not submitted.
- Submitted: parent completed and submitted required data and waivers.
- UnderReview: school-admin reviewing docs/details.
- Approved: enrollment active for attendance and grades.
- Rejected: admin rejected with reason; parent can correct and resubmit.
- Withdrawn: parent/admin withdrew from school year.

State transitions:
- Draft -> Submitted (parent submit)
- Submitted -> UnderReview (system/admin intake)
- UnderReview -> Approved (admin approve)
- UnderReview -> Rejected (admin reject with reason)
- Rejected -> Submitted (parent resubmit)
- Approved -> Withdrawn (parent/admin withdraw)

### 2) Student Profile Schema (Cross-Year Identity)

StudentProfile (persistent across school years):
- id
- parentUserId (owner parent account)
- firstName
- lastName
- dateOfBirth
- gender (optional)
- emergencyContactName (optional)
- emergencyContactPhone (optional)
- notes (optional)
- createdAt
- updatedAt

Rules:
- Parent can only create/manage profiles linked to own account.
- StudentProfile is not deleted on year change; each year gets a new enrollment record.

### 3) School-Year Enrollment Schema (Per-Year Record)

SchoolEnrollment (student + schoolYear):
- id
- schoolYearId
- studentProfileId
- parentUserId
- status (Draft/Submitted/UnderReview/Approved/Rejected/Withdrawn)
- submittedAt
- reviewedAt
- reviewedByUserId
- rejectionReason (nullable)
- approvedAt (nullable)
- withdrawnAt (nullable)
- createdAt
- updatedAt

Uniqueness:
- Unique(studentProfileId, schoolYearId)

### 4) Enrollment Document Set Schema

EnrollmentMedicalInfo (1:1 with SchoolEnrollment):
- enrollmentId
- insuranceProviderName
- insurancePolicyNumber
- insuranceGroupNumber (optional)
- insurancePhone (optional)
- policyHolderName (optional)
- pediatricianName
- pediatricianPhone
- pediatricianAddress (optional)
- medicalNotes (optional)
- updatedAt

EnrollmentWaivers (1:1 with SchoolEnrollment):
- enrollmentId
- medicalWaiverAccepted (boolean)
- medicalWaiverAcceptedAt
- medicalWaiverVersion
- mediaWaiverAccepted (boolean)
- mediaWaiverAcceptedAt
- mediaWaiverVersion
- acceptedByUserId

Versioning approach:
- Waiver text revisions increment version.
- Enrollment stores accepted version to preserve legal history.

### 5) School Year and Calendar Model

SchoolYear:
- id
- label (example: 2026-2027)
- startsOn
- endsOn
- enrollmentOpenOn
- enrollmentCloseOn
- status (Planned/Active/Closed)

SchoolCalendar:
- id
- schoolYearId
- publishedVersion (integer)
- lastUpdatedByUserId
- lastUpdatedAt

SchoolCalendarDay:
- id
- schoolYearId
- date
- isSchoolDay (boolean)
- note (optional)

Saturday-only rule:
- If isSchoolDay is true, date weekday must be Saturday.
- Non-Saturday date may exist only as non-school informational calendar date.

### 6) Class and Teacher Assignment Model

SchoolClass:
- id
- schoolYearId
- classCode
- className
- levelOrGrade
- maxCapacity (optional)
- isActive

ClassTeacherAssignment:
- id
- schoolClassId
- teacherUserId
- assignedFrom
- assignedTo (nullable)

ClassStudentAssignment:
- id
- schoolClassId
- studentProfileId
- schoolYearId
- assignedOn
- removedOn (nullable)

Rules:
- Student can have at most one primary class assignment per school day slot.
- Teacher can be assigned to multiple classes.

### 7) Weekly Classroom Assignment Model

CampusClassroom:
- id
- roomCode
- roomName
- capacity (optional)
- isActive

ClassSession:
- id
- schoolYearId
- schoolClassId
- calendarDate
- startTime
- endTime
- classroomId
- status (Scheduled/Completed/Cancelled)

Shared-room support:
- Multiple classes are allowed in one classroom when explicitly scheduled.
- Optional safety check: total expected students for overlapping sessions should not exceed capacity when capacity is configured.

### 8) Attendance Data Model

AttendanceSession (derived from ClassSession or explicitly tracked):
- id
- classSessionId
- markedByUserId
- markedAt

StudentAttendance:
- id
- attendanceSessionId
- studentProfileId
- status (Present/Absent/Late/Excused)
- note (optional)
- updatedByUserId
- updatedAt

Aggregations for parent dashboard:
- DaysAttended = count(Present or Late by policy)
- TotalSchoolDays = count of applicable scheduled sessions for student's class
- AttendancePercent = DaysAttended / TotalSchoolDays

### 9) Grading Data Model

GradeCategory:
- id
- schoolClassId
- name (Homework/Quiz/Test/Participation/Project)
- weight (optional)

GradeItem:
- id
- schoolClassId
- categoryId (optional)
- title
- maxScore
- assignedOn
- dueOn (optional)

StudentGrade:
- id
- gradeItemId
- studentProfileId
- score
- letterGrade (optional)
- comment (optional)
- gradedByUserId
- gradedAt
- updatedAt

Recent grades widget baseline:
- Show latest N graded items with score, maxScore, grade date, and optional comment.

### 10) Validation and Business Rules (Phase 2)

Enrollment validations:
- Parent must satisfy School-Parent eligibility (paid membership valid).
- Required student identity fields must be present.
- Required medical/insurance and pediatrician fields must be present at submission.
- Both waivers must be explicitly accepted before Submitted state.
- One active enrollment per student per school year.

Calendar/scheduling validations:
- SchoolDay must be Saturday.
- ClassSession date must be a SchoolCalendarDay where isSchoolDay = true.
- Session startTime must be earlier than endTime.
- Classroom assignment must exist and be active.

Assignment validations:
- Teacher must hold School-Teacher or School-Admin role.
- Student must have Approved enrollment for the same school year before class assignment.

Attendance/grade validations:
- Teacher can mark attendance/grades only for classes currently assigned to them.
- Attendance cannot be marked for students not assigned to that class session.
- Grade score must be between 0 and maxScore.

### 11) Phase 2 Deliverables Status

| Deliverable | Status |
|---|---|
| Enrollment lifecycle design | Done |
| Student and enrollment schema design | Done |
| Waiver and medical info schema design | Done |
| School-year calendar and Saturday rules | Done |
| Class/teacher/student assignment model | Done |
| Weekly classroom scheduling model | Done |
| Attendance and grading models | Done |
| Validation/business rule baseline | Done |

### 12) Finalized Decisions for Phase 3 Readiness

| Decision | Final Decision |
|---|---|
| Shared-room policy | Shared-room capacity warning check not needed in v1. |
| Attendance denominator | Completed assigned class sessions per student. |
| Late attendance counting | Late counts as attended for summary percent. |
| Grade weighting | Grade weighting not needed in v1. |
| Enrollment review flow | Submitted automatically enters UnderReview for admin action. |

Phase 2 is locked and Phase 3 can proceed with workflows and endpoint contracts based on this model.

---

## Phase 3 Execution (Completed Draft)

This section executes Phase 3 planning deliverables: role workflows, calendar administration workflows, and API endpoint contracts with permission rules.

### 1) School-Parent Dashboard and Workflow Specs

Primary widgets:
- My Students list (name, class, enrollment status)
- Attendance Summary by student
  - Days Attended
  - Total Completed Assigned Sessions
  - Attendance Percent
- Recent Grades by student (latest N entries)
- Enrollment Action Card
  - Start enrollment
  - Continue draft
  - Re-enroll for next school year

Parent workflow: New enrollment
1. Parent selects school year and student profile (or creates a new student profile).
2. Parent enters/updates medical insurance and pediatrician details.
3. Parent accepts medical and media waivers.
4. Parent submits enrollment.
5. System moves record to Submitted then UnderReview.
6. Parent sees status updates and rejection reasons if applicable.

Parent workflow: Re-enrollment
1. Parent chooses returning student.
2. System pre-fills prior-year student data.
3. Parent confirms/edits medical details and re-accepts current waiver versions.
4. Parent submits for new school year.

Read/write constraints:
- Parents can only access students linked to their own account.
- Parent write actions require paid-member validity.

### 2) School-Teacher Workflow Specs

Primary views:
- My Classes (active class assignments)
- Class Roster by session date
- Attendance Entry
- Grade Entry

Teacher workflow: Attendance entry
1. Teacher picks class and date/session.
2. System shows assigned students for that class/session.
3. Teacher marks Present/Absent/Late/Excused and saves.
4. System records marker identity and timestamp.

Teacher workflow: Grade entry
1. Teacher selects class and grade item (or creates one if permitted by policy).
2. Teacher enters student scores/comments.
3. System validates score range and persists grade records.

Read/write constraints:
- Teacher can only read/write for currently assigned classes.
- Teacher cannot alter enrollments, staffing, or global calendar.

### 3) School-Admin Oversight Workflow Specs

Primary views:
- Enrollment Review Queue
- Teacher Management
- Class and Assignment Management
- School Calendar Management
- School-wide Attendance and Grades View

Admin workflow: Enrollment review
1. Open Submitted/UnderReview enrollments.
2. Validate documents and waivers.
3. Approve or reject with reason.
4. System updates status and parent-facing reason/history.

Admin workflow: Teacher and assignment management
1. Add/remove teacher role assignments.
2. Assign classes to teachers.
3. Assign students to classes.
4. Track effective dates for assignment changes.

Admin workflow: Global progress view
1. Filter by school year, class, teacher, student.
2. View attendance and grades across all classes.
3. Export capabilities defined in Phase 4.

### 4) School-Admin Calendar Management Workflow Specs

Workflow: Create school calendar
1. Admin selects school year.
2. Admin creates calendar days and marks school days.
3. Validation enforces Saturday-only school days.
4. Admin saves draft calendar.

Workflow: Publish calendar revision
1. Admin updates days/sessions/classroom allocations.
2. System increments publishedVersion.
3. System computes change summary (added/removed/modified sessions).
4. System triggers notification job to School-Teachers and School-Parents.

Workflow: Weekly classroom allocations
1. Admin sets session date/time/classroom per class.
2. Multiple classes per classroom are allowed (per finalized decision).
3. Capacity warning checks are skipped in v1 (per finalized decision).

### 5) API Endpoint Catalog and Permissions

Authorization levels used below:
- Parent: School-Parent with paid-member validity
- Teacher: School-Teacher
- Admin: School-Admin

School year and calendar
- GET /api/school/years
  - Access: Parent, Teacher, Admin
  - Purpose: list school years with status

- POST /api/school/years
  - Access: Admin
  - Purpose: create school year

- GET /api/school/years/:yearId/calendar
  - Access: Parent, Teacher, Admin
  - Purpose: get published calendar and sessions

- PUT /api/school/years/:yearId/calendar
  - Access: Admin
  - Purpose: create/update calendar day set and publish revision
  - Side effect: queue calendar-change notifications

Student and enrollment
- GET /api/school/parent/students
  - Access: Parent
  - Purpose: list own student profiles and enrollment statuses

- POST /api/school/parent/students
  - Access: Parent
  - Purpose: create student profile

- PATCH /api/school/parent/students/:studentId
  - Access: Parent (own student only)
  - Purpose: update student profile

- POST /api/school/enrollments
  - Access: Parent, Admin
  - Purpose: create enrollment for school year

- PATCH /api/school/enrollments/:enrollmentId
  - Access: Parent (own draft/rejected), Admin
  - Purpose: update enrollment data/docs

- POST /api/school/enrollments/:enrollmentId/submit
  - Access: Parent (own enrollment), Admin
  - Purpose: move Draft/Rejected to Submitted

- POST /api/school/enrollments/:enrollmentId/review
  - Access: Admin
  - Purpose: approve/reject and set reason

Class and assignment
- GET /api/school/classes
  - Access: Teacher (assigned only), Admin
  - Purpose: list classes in scope

- POST /api/school/classes
  - Access: Admin
  - Purpose: create class definition

- POST /api/school/classes/:classId/teachers
  - Access: Admin
  - Purpose: assign teacher to class

- POST /api/school/classes/:classId/students
  - Access: Admin
  - Purpose: assign student to class

Attendance and grades
- GET /api/school/classes/:classId/sessions/:sessionId/roster
  - Access: Teacher (assigned class), Admin
  - Purpose: roster for attendance/grades

- PUT /api/school/classes/:classId/sessions/:sessionId/attendance
  - Access: Teacher (assigned class), Admin
  - Purpose: upsert attendance entries

- POST /api/school/classes/:classId/grade-items
  - Access: Teacher (assigned class), Admin
  - Purpose: create grade item

- PUT /api/school/classes/:classId/grade-items/:itemId/grades
  - Access: Teacher (assigned class), Admin
  - Purpose: upsert student grades

Dashboards and summaries
- GET /api/school/parent/dashboard
  - Access: Parent
  - Purpose: attendance summary + recent grades for own students

- GET /api/school/teacher/dashboard
  - Access: Teacher
  - Purpose: assigned classes + pending attendance/grade tasks

- GET /api/school/admin/dashboard
  - Access: Admin
  - Purpose: review queue + school-wide snapshots

### 6) Request/Response Contract Baselines

Enrollment submit request (example shape):
- enrollmentId
- studentProfile payload
- medicalInfo payload
- waiverAcceptance payload (medical, media, versions)

Enrollment review request:
- decision: approve or reject
- rejectionReason (required when reject)

Attendance upsert request:
- classId
- sessionId
- entries[]
  - studentProfileId
  - status
  - note

Grade upsert request:
- classId
- gradeItemId
- grades[]
  - studentProfileId
  - score
  - comment

All responses should include:
- success flag
- normalized payload
- validation errors with field-level messages (when failed)

### 7) Permission Coverage Map (Phase 3)

| Capability | Parent | Teacher | Admin |
|---|---|---|---|
| Own student progress view | Yes | No | Yes |
| Enrollment create/submit | Yes (conditional) | No | Yes |
| Enrollment approve/reject | No | No | Yes |
| Attendance write | No | Yes (assigned classes) | Yes |
| Grade write | No | Yes (assigned classes) | Yes |
| Calendar create/update | No | No | Yes |
| Calendar change notify trigger | No | No | Yes |
| Teacher/class/student assignment | No | No | Yes |

### 8) Phase 3 Deliverables Status

| Deliverable | Status |
|---|---|
| Parent workflow specs | Done |
| Teacher workflow specs | Done |
| Admin workflow specs | Done |
| Calendar admin workflow specs | Done |
| API endpoint catalog and permission model | Done |
| Request/response contract baseline | Done |
| Permission coverage map | Done |

### 9) Open Decisions for Phase 4 Readiness

| Decision | Current Baseline |
|---|---|
| Notification fan-out model | Async queue/event-driven delivery |
| API versioning approach | Unversioned internal routes in v1 |
| Grade item creation rights | Teacher and Admin for assigned class scope |
| Enrollment edit cutoff | Parent edits allowed until Approved unless reopened by Admin |

If approved, Phase 4 can proceed with rollout, audit, notifications, reporting, QA, and runbook planning.

---

## Phase 4 Execution (Completed Draft)

This section executes Phase 4 planning deliverables: rollout sequencing, migration/backfill, auditing, notifications, reporting, QA, and runbook updates.

### 1) Rollout and Migration Strategy

Release approach:
- Release in controlled stages: schema and backend first, then UI, then feature flags on production.
- Keep school features hidden behind role-aware navigation until initial data setup is complete.

Migration sequence:
1. Add school domain tables and role extensions.
2. Create baseline SchoolYear and empty SchoolCalendar.
3. Seed default classroom catalog and optional class templates.
4. Create School-Admin users.
5. Assign School-Teacher roles and initial class assignments.
6. Enable School-Parent assignment flow for eligible members.

Backfill policy:
- No forced historical backfill for prior years in v1.
- Start with one active school year at launch.
- Optionally import legacy students and enrollments via admin import tooling in a later iteration.

Rollback plan:
- Disable school routes via feature flag.
- Preserve migrated data (no destructive rollback).
- Re-run migration fix scripts if needed.

### 2) Audit and Access Logging Plan

Audit events to capture:
- Enrollment create/update/submit/review/approve/reject/withdraw
- Waiver acceptance events (with accepted version)
- Class, teacher, and student assignment changes
- Calendar publish/revision actions
- Attendance and grade create/update actions

Audit fields:
- actorUserId
- actorRoleSnapshot
- actionType
- entityType
- entityId
- beforeSnapshot (where applicable)
- afterSnapshot (where applicable)
- timestamp
- requestId

Access log minimums:
- Route/resource accessed
- userId
- role context
- allow/deny decision
- reason code for denial

Retention baseline:
- Keep audit logs for at least one full school cycle plus one additional year.

### 3) Notifications and Reminder Plan

Delivery model:
- Async queue/event-driven fan-out.
- Retry with exponential backoff for transient email failures.

Notification events (v1):
- Calendar revision published
- Enrollment submitted
- Enrollment approved/rejected
- Assignment changes affecting teachers

Recipients:
- School-Parents: own-student-impacting notifications + calendar revisions
- School-Teachers: class/schedule/assignment notifications + calendar revisions
- School-Admin: operational summaries and failed delivery alerts

### 4) Calendar-Change Email Workflow

Trigger:
- Any admin publish/update to school calendar revision.

Workflow:
1. Detect changed sessions and calendar days compared to prior published version.
2. Build change summary grouped by date and class.
3. Resolve recipient lists:
  - Teachers assigned to affected classes
  - Parents with students in affected classes
4. Queue email jobs.
5. Record notification batch with success/failure counts.

Email template sections:
- Subject including school year and revision marker
- Effective date(s) of changes
- Added/removed/updated session list
- Classroom change highlights
- Action guidance for parents/teachers

### 5) Reporting and Export Plan

Admin reporting views:
- Enrollment status summary by school year/class
- Attendance summary by class, student, and teacher
- Grade distribution and recent grade activity
- Calendar change history and notification delivery outcomes

Export formats:
- CSV for enrollment, attendance, grades, teacher assignments
- Date-range filters and school-year filters supported

Access:
- Reporting and exports are School-Admin only in v1.

### 6) QA and Test Scenario Plan

Test categories:
- Authorization and route protection
- Enrollment lifecycle and waiver enforcement
- Calendar Saturday-only validation
- Session scheduling and assignment integrity
- Attendance and grade write-scope constraints
- Notification fan-out correctness
- Dashboard aggregate accuracy

Critical test scenarios:
- Parent with expired membership cannot submit enrollment updates.
- Teacher cannot modify attendance for unassigned class.
- Calendar update sends notifications to impacted teachers and parents.
- Late attendance contributes to attendance percent as approved.
- Enrollment review transition logic enforces rejection reason.

Non-functional checks:
- Bulk notification throughput
- Query performance for parent/admin dashboards
- Audit log completeness for high-risk actions

### 7) Documentation and Admin Runbook Updates

Documentation updates required:
- Architecture doc: school module components and data model additions
- API reference: school endpoints and permission matrix
- Role/authorization guide: school-only vs member-linked behavior

Admin runbook sections:
- School year setup checklist
- Calendar publish checklist
- Teacher assignment checklist
- Enrollment review SOP
- Incident SOP for notification failures

### 8) Phase 4 Deliverables Status

| Deliverable | Status |
|---|---|
| Migration and rollout strategy | Done |
| Audit and access logging plan | Done |
| Notifications/reminders plan | Done |
| Calendar-change email workflow | Done |
| Reporting/export plan | Done |
| QA scenario plan | Done |
| Documentation and runbook update plan | Done |

### 9) Final Readiness Gate

Implementation readiness checklist:
- Phase 1 policy and role model locked
- Phase 2 data and lifecycle model locked
- Phase 3 workflows and API contracts locked
- Phase 4 rollout and quality plans locked

Result:
- Planning for Tamil School feature set is complete and ready for step-by-step implementation.
