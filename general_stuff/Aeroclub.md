# Aeroclub 

## **1. Should You Make an App or Just Store Data in the Cloud?**

**Short answer:** Both.

- **Cloud-based web app (primary):**
  - Accessible on any browser (PC, tablet, smartphone).
  - Easier for clubs to adopt (no installation).
  - Data is centralized, secure, and always up-to-date.
- **Mobile app (optional, later):**
  - For quick actions (booking flights, logging hours, checking invoices).
  - Could be Phase 2 after validating the product.

**Cloud hosting:**

- Use AWS / Azure / GCP (or DigitalOcean for lower costs).
- **Managed database (e.g., PostgreSQL)** for reliability.
- **Cloud storage** for documents (e.g., aircraft logs, licenses).

------

## **2. Core Modules & Functionalities**

Here’s a breakdown of **what your product should include** (think of these as separate modules you can charge extra for):

------

### **A) Fleet Management**

- **Aircraft profiles:** Model, tail number, category (SEP, MEP, glider, etc.), maintenance history.
- **Maintenance tracking:**
  - Hours until next inspection.
  - Scheduled & unscheduled maintenance logs.
  - Airworthiness documentation upload.
- **Flight hours logging:**
  - Automatically updated when flights are booked and flown.
- **Booking system:**
  - Members book aircraft, see availability.
  - Optional instructor assignment.
  - Booking restrictions (e.g., cannot book if license expired or account unpaid).

------

### **B) Instructor Management**

- **Instructor profiles:**
  - Certificates, ratings, expiry dates.
  - Hourly rates.
- **Availability calendar:** Instructors can mark when they are available.
- **Instructor payment tracking:**
  - Automatically calculate hours flown.
  - Generate monthly payment reports.

------

### **C) Student & Member Management**

- **Member profiles:**
  - License details (PPL, LAPL, Student Pilot).
  - Medical certificate expiry.
  - Flight hours summary.
- **Training progress tracking:**
  - Lessons completed.
  - Instructors’ notes & student evaluations.
- **Notifications:**
  - License or medical expiry warnings.
  - Upcoming flights & maintenance notifications.

------

### **D) Financial Management**

- **Pricing rules:**
  - Aircraft hourly rates (wet/dry).
  - Instructor fees.
  - Club membership fees (monthly/annual).
- **Automatic invoicing:**
  - Generate invoices for each member based on flights & services.
  - Online payments (Stripe, PayPal, etc.).
- **Budgeting & analytics:**
  - Revenue per aircraft.
  - Instructor utilization.
  - Flight hours per member.

------

### **E) Reporting & Analytics**

- Flight activity reports (by aircraft, member, instructor).
- Maintenance cost reports.
- Monthly & yearly revenue breakdown.
- Pilot training progress dashboards.

------

### **F) Admin Panel**

- Manage members, aircraft, instructors.
- Approve bookings.
- Upload documents (insurance, maintenance reports).

------

### **G) Communication & Notifications**

- Email/SMS reminders for bookings.
- License expiry alerts.
- Maintenance alerts.
- Club announcements.

------

## **3. Tech Stack**

- **Frontend:** React (web), React Native (for future mobile).
- **Backend:** Node.js / Django / Laravel (depending on preference).
- **Database:** PostgreSQL (relational, good for structured data).
- **Authentication:** OAuth (Google/Microsoft login), multi-role access (Admin, Instructor, Student).
- **Cloud hosting:** AWS or Azure.
- **Payments:** Stripe for online payments.

------

## **4. Business & Monetization Strategy**

- **License model:**
  - Per-club subscription (e.g., €50–€200/month depending on fleet size).
- **Optional add-ons:**
  - SMS notifications.
  - Advanced analytics module.
  - White-labeling (club branding).
- **Freemium model:**
  - Free for small clubs (1–2 aircraft), pay for more.



**MAKE WEIGHT BALANCE APP**

------

## **5. Development Roadmap**

**Phase 1 (MVP):**

- Member management
- Aircraft booking
- Flight & instructor logging
- Basic invoicing

**Phase 2:**

- Maintenance tracking
- Training progress tracking
- Notifications

**Phase 3:**

- Mobile app
- Advanced analytics
- Payment integration