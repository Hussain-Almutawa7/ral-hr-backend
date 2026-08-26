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

// LEAVE CONTROLLERS


// ATTENDANCE CONTROLLRES


// DOCUMENTS CONTROLLERS


// PAYROLL CONTROLLERS


// SYSTEM CONTROLLERS


// MIDDLEWARES
const verifyToken = require("./middleware/verify-token");
const requireRole = require("./middleware/require-role");

// PEOPLE & SETTINGS MIDDLEWARES


// LEAVE MIDDLEWARES


// ATTENDANCE MIDDLEWARES


// DOCUMENTS MIDDLEWARES


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
app.get("/api/employees", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.index);
app.get("/api/employees/:employeeId", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.show);
app.post("/api/employees", verifyToken, requireRole("HR Officer", "HR Manager"), employeeCtrl.create);

// LEAVE ROUTES

// ATTENDANCE ROUTES

// DOCUMENTS ROUTES

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
