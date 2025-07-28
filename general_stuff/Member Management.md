- ## **Member Management – Core Features**

  Your app should allow the aero club to **register, track, and manage members** (students, licensed pilots, instructors).

  ### **1. Member Profiles**

  Each member needs a **comprehensive profile**:

  - **Personal Info**
    - Full Name
    - Date of Birth
    - Contact details (email, phone, address)
    - Emergency contact
  - **Membership Info**
    - Membership type (Student, Private Pilot, Instructor, Club Admin)
    - Membership start & renewal dates
    - Status (Active, Inactive, Suspended)
    - Club fees (paid/unpaid status)
  - **Licenses & Medical Certificates**
    - License type (Student Pilot, LAPL, PPL, CPL, etc.)
    - License number & issuing authority
    - License expiry date (automatic reminders when close to expiry)
    - Medical certificate type (Class 1, 2, LAPL) & expiry date
  - **Flight Data**
    - Total flight hours (tracked automatically via bookings)
    - Last flight date
    - Aircraft types flown (SEP, MEP, Glider, etc.)
  - **Training Progress (for students)**
    - Lessons completed & upcoming lessons
    - Instructor notes & assessments
    - Required hours vs. completed hours
  - **Document Uploads**
    - Copies of licenses, IDs, insurance (if required)
    - Medical certificate PDFs/images

  ------

  ### **2. Member Portal (Self-service)**

  Members should be able to:

  - **Update their personal data** (except verified fields like licenses).
  - **View their bookings** (past & future).
  - **Access their invoices & payment history**.
  - **Check training progress** (for students).
  - **Get notifications** (license expiry, bookings, unpaid fees).

  ------

  ### **3. Admin Features for Members**

  For club admins:

  - **Add/modify members**
  - **Set roles & permissions** (Student, Pilot, Instructor, Admin)
  - **Suspend or reinstate accounts**
  - **Export member lists** (for auditing or club records)
  - **Search & filter** (by status, license type, medical expiry, etc.)

  ------

  ### **4. Notifications & Reminders**

  Automated alerts:

  - **License expiry** (e.g., 60/30/7 days before expiry).
  - **Medical expiry** (same as above).
  - **Unpaid fees** reminders.
  - **Membership renewal** notifications.

  ------

  ## **UI Flow (for Member Management)**

  Here’s how the **user experience** could look:

  1. **Dashboard** → Quick stats (Active members, expiring licenses, unpaid members).
  2. **Members List** → Search & filter (Active, Instructors, Students).
  3. **Member Profile View** → Tabs for:
     - Profile & documents
     - Flight history
     - Invoices & payments
     - Training progress
  4. **Add/Edit Member** → Form for personal info, license, medical, documents.

  ------

  ## **Database Tables (Initial Draft for Members)**

  Here’s a simplified **relational schema**:

  ### `members`

  - id (PK)
  - first_name
  - last_name
  - email
  - phone
  - address
  - date_of_birth
  - membership_type (enum: Student, Pilot, Instructor, Admin)
  - membership_start_date
  - membership_status (enum: Active, Inactive, Suspended)
  - created_at
  - updated_at

  ### `licenses`

  - id (PK)
  - member_id (FK → members.id)
  - license_type (enum: SPL, LAPL, PPL, CPL, etc.)
  - license_number
  - issuing_authority
  - expiry_date
  - document_path (uploaded PDF/image)

  ### `medical_certificates`

  - id (PK)
  - member_id (FK → members.id)
  - certificate_type (Class 1, Class 2, LAPL)
  - expiry_date
  - document_path

  ### `training_progress` (for students)

  - id (PK)
  - member_id (FK → members.id)
  - lesson_name
  - instructor_id (FK → members.id)
  - status (Not started, In progress, Completed)
  - notes
  - flight_hours_logged

  ### `member_payments`

  - id (PK)
  - member_id (FK → members.id)
  - amount
  - description (Membership fee, Flight payment, etc.)
  - due_date
  - paid_date
  - status (Paid, Pending, Overdue)

  ------

  **Question for you:**
   Do you want **roles & permissions** to be **RBAC (Role-Based Access Control)** (e.g., Admin can manage everything, Instructors only see their students, Students only see their data)? This affects the database structure and API security.