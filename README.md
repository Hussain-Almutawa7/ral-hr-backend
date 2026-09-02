# RAL HR - Backend

RAL HR is a Human Resources Management System developed for RAL Technologies Bahrain.

This repository contains the Node.js, Express, MongoDB, and Mongoose backend for the system.

The API handles authentication, employee management, attendance, leave, documents, settings, user management, audit logs, notifications, and role-based authorization.

## Frontend Repository

The frontend for this project can be found here:

[RAL HR Frontend](https://github.com/Hussain-Almutawa7/ral-hr-frontend)

---

## Features

### Authentication

- JWT authentication
- Secure password hashing using bcrypt
- Protected API routes
- Role-based authorization
- Active/inactive user validation

### Employee Management

- Create employees
- View employees
- View employee profile
- Update employee information
- Update permitted personal contact information
- Employee status management
- Reporting hierarchy validation
- Department and designation assignments
- Shift assignments
- Holiday list assignments

### Attendance

- Employee check in and check out
- Raw attendance tap recording
- Attendance generation
- Shift-based attendance calculations
- Late entry tracking
- Early exit tracking
- Incomplete attendance detection
- Worked-hours calculation
- Overtime tracking
- Team attendance
- Attendance corrections
- Manager and HR correction workflow

### Leave Management

- Leave types
- Leave allocations
- Leave balances
- Leave requests
- Leave request drafts
- Submit workflow
- Approval and rejection
- Cancellation
- Supporting document uploads
- Leave calendar
- Working-day calculations

### Employee Documents

- MongoDB GridFS file storage
- Upload employee documents
- Download documents
- Verification
- Rejection with reason
- Archiving
- Configurable document types
- Document expiry tracking

### User Management

HR Managers can:

- View users
- Create user accounts
- Link users to employees
- Update email and role
- Activate and deactivate accounts
- Reset passwords

### Audit Logging

Important changes are recorded using the AuditLog model.

Audit records include:

- Table/model name
- Record ID
- Action
- Changed user
- Changed field
- Previous value
- New value
- Reason
- IP address
- Date and time

The application creates one audit log record for each changed field.

### Settings

The backend supports configurable HR reference data including:

- Company
- Departments
- Designations
- Banks
- Leave types
- Document types
- Shift types
- Shift assignments
- Holiday lists
- Holidays

### Dashboard

The dashboard API calculates live statistics using MongoDB queries such as `countDocuments()`.

Examples include:

- Total employees
- Active employees
- Pending leave requests
- Pending documents
- Team members
- Total user accounts
- Inactive accounts

---

## User Roles

The system supports:

- Employee
- Manager
- HR Officer
- HR Manager
- Owner/Finance

Authorization middleware protects API endpoints according to role.

Example:

```js
app.get(
    "/api/users",
    verifyToken,
    requireRole("HR Manager"),
    userCtrl.index
);
```

Frontend role restrictions improve the user experience, while backend middleware provides the actual security.

---

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- MongoDB GridFS
- JSON Web Tokens
- bcrypt
- Multer
- CORS
- dotenv

---

## Installation

Clone the repository:

```bash
git clone https://github.com/Hussain-Almutawa7/ral-hr-backend.git
```

Navigate into the project:

```bash
cd ral-hr-backend
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the project root.

Example:

```env
PORT=3000
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_JWT_SECRET
```

Use the environment variable names configured in your project if they differ.

Never commit real credentials or secrets to GitHub.

---

## Running the Server

Start the backend:

```bash
npm run dev
```

or, depending on the configured scripts:

```bash
npm start
```

The server will normally run at:

```text
http://localhost:3000
```

---

## Main API Areas

```text
/api/auth
/api/users
/api/employees
/api/attendances
/api/checkins
/api/attendance-corrections
/api/leave
/api/documents
/api/dashboard
/api/audit-logs
/api/notifications
/api/settings
```

Exact endpoints are defined in `server.js`.

---

## Authentication

Protected requests require a JWT token:

```text
Authorization: Bearer <token>
```

The `verifyToken` middleware validates the token and adds the authenticated user to the request.

Role-based middleware then controls access:

```js
requireRole("HR Officer", "HR Manager")
```

---

## Attendance Architecture

Attendance uses three main concepts:

```text
Shift Type
    ↓
Defines working hours

Shift Assignment
    ↓
Assigns the shift to an employee for a date range

Attendance
    ↓
Stores the calculated attendance result
```

Employees record check-in and check-out activity.

Attendance generation uses the applicable shift assignment and shift type to calculate information such as:

- Attendance status
- Worked hours
- Late entry
- Early exit
- Incomplete attendance
- Overtime

Attendance statuses include:

```text
Present
Absent
Half Day
On Leave
Holiday
Weekly Off
```

---

## Attendance Corrections

Attendance corrections follow a controlled workflow.

```text
Manager requests correction
        ↓
HR Officer / HR Manager corrects attendance
        ↓
Manager / HR Manager approves or rejects
```

This allows attendance problems to be corrected without silently replacing the original workflow history.

---

## File Storage

Files are stored using MongoDB GridFS.

The reusable GridFS utility handles file uploads and downloads.

Employee documents store their GridFS file reference in the EmployeeDocument model.

```text
EmployeeDocument
    ↓
fileId
    ↓
GridFS
```

Leave supporting documents store their own GridFS reference directly on the LeaveRequest:

```text
LeaveRequest
    ↓
documentFileId
    ↓
GridFS
```

This keeps employee HR documents and leave attachments logically separate while allowing both to use the same file-storage system.

---

## Audit Logs

Controllers send changed values to the reusable `createAuditLog` utility.

Example:

```js
await createAuditLog({
    tableName: "User",
    recordId: user._id,
    action: "Update",
    changedBy: req.user._id,
    changes,
    ipAddress: req.ip,
});
```

The utility converts each changed field into its own AuditLog record.

This provides detailed traceability for important HR operations.

---

## Database

The project uses MongoDB with Mongoose models and references between related collections.

Examples include:

```text
User → Employee

Employee → Department
Employee → Designation
Employee → Manager
Employee → Shift Type
Employee → Holiday List

Attendance → Employee

Leave Request → Employee
Leave Request → Leave Type

Employee Document → Employee
Employee Document → Document Type
```

Indexes are used where appropriate to maintain uniqueness and improve lookup performance.

---

## Developed By

- Hussain Almutawa
- Hawra Markhoos

Developed as part of the General Assembly Software Engineering Bootcamp.
