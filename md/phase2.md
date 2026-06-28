# 🚀 Job Tracker — Phase 2: Database Models Summary

## 📌 Overview
Phase 2 focuses on designing the core database structure for the Job Tracker application. This phase defines how users, job applications, notes, files, and contacts are stored and related in MongoDB.

---

## 🧱 1. User Model

The User model handles all user-related information including authentication and profile data.

### Key Features:
- Stores user authentication details (name, email, password)
- Contains profile information (photo, bio, location, phone, links)
- Stores resume URL (Cloudinary)
- Includes job preferences (currency, job search status)
- Uses timestamps for tracking creation and updates

---

## 📄 2. Application Model (Core of the Project)

The Application model represents each job application card in the system.

### Key Features:
- Links each application to a specific user
- Stores company name, role, logo, and status (Kanban flow)
- Tracks job details (URL, description, location, work mode, job type)
- Stores salary range and important dates (applied, follow-up, deadline)
- Supports tags for categorization

---

## 📝 3. Notes System

Each application can have multiple notes for tracking interview and experience details.

### Note Types:
- Interview questions
- Personal experiences
- Interview reflections (what went wrong / improvements)
- General notes

### Extra Features:
- Tracks interview rounds (HR, technical, final, etc.)
- Tracks outcomes (passed, failed, waiting)

---

## 📁 4. Prep Files System

Used to store preparation material related to job applications.

### Features:
- Supports PDFs and external links
- Stores Cloudinary file URLs
- Can store extracted text for future AI/RAG use

---

## 📞 5. Contacts System

Stores recruiter or company contact information.

### Features:
- Name, role, email, phone, LinkedIn
- Linked directly to a job application

---

## 🔗 6. Data Relationships

- One User → Many Applications
- One Application → Many Notes
- One Application → Many Prep Files
- One Application → Many Contacts

---

## 📊 7. TypeScript Types

- Strongly typed interfaces created for all models
- Ensures consistency between frontend and backend
- Includes types for:
  - User
  - Application
  - Notes
  - Files
  - Contacts
  - Dashboard statistics

---

## 🎯 Phase 2 Outcome

After completing this phase:

- Full database structure is defined
- Core entities of the system are established
- Application workflow (wishlist → offer/rejected) is modeled
- Notes and interview tracking system is implemented
- File and contact management system is ready
- Type-safe architecture is established for frontend/backend consistency

---

### Quick Visual of How Models Relate
User
 └── has many Applications
        ├── has many Notes
        │     ├── interview_question
        │     ├── personal_experience
        │     ├── experience_log
        │     └── general
        ├── has many PrepFiles
        │     ├── PDF (Cloudinary)
        │     └── Link (raw URL)
        └── has many Contacts
              └── recruiter info

              
## ➡️ Next Step
Proceed to Phase 3: Authentication System + API Routes
