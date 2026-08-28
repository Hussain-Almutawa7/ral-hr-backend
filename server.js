const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const PORT = process.env.PORT || 3000;

// CONTROLLERS
const authCtrl = require("./controllers/auth-controller");
const userCtrl = require("./controllers/users-controller");

// PEOPLE & SETTINGS CONTROLLERS
const deptCtrl = require("./controllers/departments-controller");
const designationCtrl = require("./controllers/designations-controller");
const companyCtrl = require("./controllers/company-controller");
const bankCtrl = require("./controllers/bank-controller");
const settingsCtrl = require("./controllers/settings-controller");
const employeeCtrl = require("./controllers/employee-controller");
const docTypeCtrl = require("./controllers/document-type-controller");

// LEAVE CONTROLLERS
// const leaveRequestsCtrl = require("./controllers/leave-requests-controller")
// const leaveTypeCtrl = require("./controllers/leave-type-controller")
const leaveCtrl = require("./controllers/leave-controller")

// ATTENDANCE CONTROLLRES
const shiftTypeCtrl = require("./controllers/shift-type-controller");
const shiftAssignmentCtrl = require("./controllers/shift-assignment-controller");

// DOCUMENTS CONTROLLERS
const documentCtrl = require("./controllers/documents-controller");

// PAYROLL CONTROLLERS


// SYSTEM CONTROLLERS


// MIDDLEWARES
const verifyToken = require("./middleware/verify-token");
const requireRole = require("./middleware/require-role");

// PEOPLE & SETTINGS MIDDLEWARES


// LEAVE MIDDLEWARES


// ATTENDANCE MIDDLEWARES


// DOCUMENTS MIDDLEWARES
const uploadDocument = require("./middleware/upload-document");

// PAYROLL MIDDLEWARES

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// AUTH ROUTES
app.post("/api/auth/sign-in", authCtrl.signIn);
app.get("/api/users", verifyToken, userCtrl.index);

// PEOPLE & SETTINGS ROUTES
app.get("/api/departments", verifyToken, deptCtrl.index);
app.post("/api/departments", verifyToken, requireRole("HR Officer", "HR Manager"), deptCtrl.create);
app.patch("/api/departments/:departmentId", verifyToken, requireRole("HR Officer", "HR Manager"), deptCtrl.update);
app.patch("/api/departments/:departmentId/status", verifyToken, requireRole("HR Officer", "HR Manager"), deptCtrl.updateStatus);

app.get("/api/designations", verifyToken, requireRole("HR Officer", "HR Manager"), designationCtrl.index);
app.post("/api/designations", verifyToken, requireRole("HR Officer", "HR Manager"), designationCtrl.create);
app.patch("/api/designations/:designationId", verifyToken, requireRole("HR Officer", "HR Manager"), designationCtrl.update);
app.patch("/api/designations/:designationId/status", verifyToken, requireRole("HR Officer", "HR Manager"), designationCtrl.updateStatus);

app.get("/api/company", verifyToken, requireRole("HR Officer", "HR Manager"), companyCtrl.show);
app.patch("/api/company", verifyToken, requireRole("HR Manager"), companyCtrl.update);

app.get("/api/banks", verifyToken, requireRole("HR Officer", "HR Manager"), bankCtrl.index);
app.post("/api/banks", verifyToken, requireRole("HR Manager"), bankCtrl.create);
app.patch("/api/banks/:bankId", verifyToken, requireRole("HR Manager"), bankCtrl.update);
app.patch("/api/banks/:bankId/status", verifyToken, requireRole("HR Manager"), bankCtrl.updateStatus);

app.get("/api/settings", verifyToken, requireRole("HR Officer", "HR Manager"), settingsCtrl.show);
app.patch("/api/settings", verifyToken, requireRole("HR Manager"), settingsCtrl.update);

app.get("/api/employees/me", verifyToken, employeeCtrl.me);
app.patch("/api/employees/me/contact", verifyToken, employeeCtrl.updateMyContact);
app.get("/api/employees", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.index);
app.get("/api/employees/:employeeId", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.show);
app.post("/api/employees", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.create);
app.patch("/api/employees/:employeeId", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.update);
app.patch("/api/employees/:employeeId/status", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.updateStatus);

app.get("/api/document-types", verifyToken, docTypeCtrl.index);
app.post("/api/document-types", verifyToken, docTypeCtrl.create);
app.patch("/api/document-types/:docTypeId", verifyToken, requireRole("HR Manager"), docTypeCtrl.update);
app.patch("/api/document-types/:docTypeId/status", verifyToken, requireRole("HR Manager"), docTypeCtrl.updateStatus);

// LEAVE ROUTES
app.get("/api/leave/types", verifyToken, leaveCtrl.indexType)
app.post("/api/leave/types", verifyToken, requireRole("HR Manager"), leaveCtrl.createType)
app.patch("/api/leave/types/:leaveTypeId", verifyToken, requireRole("HR Manager"), leaveCtrl.updateType)

app.get("/api/leave/allocations", verifyToken, leaveCtrl.indexAllocations)
app.post("/api/leave/allocations", verifyToken, requireRole("HR Officer", "HR Manager"), leaveCtrl.createAllocation)

app.post("/api/leave/requests", verifyToken, leaveCtrl.createRequest)
app.get("/api/leave/requests", verifyToken, leaveCtrl.indexRequest)
// app.get("/api/leave/requests/:leaveRequestId", verifyToken, leaveRequestsCtrl.show)

// ATTENDANCE ROUTES
app.get("/api/shift-types", verifyToken, requireRole("HR Officer", "HR Manager"), shiftTypeCtrl.index);
app.post("/api/shift-types", verifyToken, requireRole("HR Manager"), shiftTypeCtrl.create);
app.patch("/api/shift-types/:shiftTypeId", verifyToken, requireRole("HR Manager"), shiftTypeCtrl.update);
app.patch("/api/shift-types/:shiftTypeId/status", verifyToken, requireRole("HR Manager"), shiftTypeCtrl.updateStatus);

app.post("/api/shift-assignments", verifyToken, requireRole("HR Officer", "HR Manager"), shiftAssignmentCtrl.create);

// DOCUMENTS ROUTES
app.post("/api/documents", verifyToken, uploadDocument.single("file"), documentCtrl.create);
app.get("/api/documents", verifyToken, documentCtrl.index);
app.get("/api/documents/archived", verifyToken, requireRole("HR Officer", "HR Manager"), documentCtrl.archived);
app.get("/api/documents/:documentId", verifyToken, documentCtrl.show);
app.get("/api/documents/:documentId/download", verifyToken, documentCtrl.download);
app.patch("/api/documents/:documentId/verify", verifyToken, requireRole("HR Officer", "HR Manager"), documentCtrl.verify);
app.patch("/api/documents/:documentId/reject", verifyToken, requireRole("HR Officer", "HR Manager"), documentCtrl.reject);
app.patch("/api/documents/:documentId/archive", verifyToken, requireRole("HR Officer", "HR Manager"), documentCtrl.archive);

// PAYROLL ROUTES

// SYSTEM ROUTES

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connected to MongoDB ${mongoose.connection.name}. 🥭`);
        app.listen(PORT, () => {
            console.log(`The express app is ready on port ${PORT}! 😀`);
        });
    } catch (e) {
        console.log("Error Message:", e.message)
    }
}

startServer();
