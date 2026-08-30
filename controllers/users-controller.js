const User = require("../models/user");
const bcrypt = require("bcrypt");
const Employee = require("../models/employee");

const createAuditLog = require("../utils/createAuditLog");

const index = async (req, res) => {
    try {
        const allUsers = await User.find()
            .populate("employee", "employeeCode nameEn nameAr status")
            .sort({ createdAt: -1 });

        res.status(200).json(allUsers);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const addUser = async (req, res) => {
    try {
        const employee = await Employee.findById(req.body.employee);

        if (!employee) return res.status(400).json({ err: "Employee not found" });

        const foundEmp = await User.findOne({
            employee: employee._id,
        });

        if (foundEmp) return res.status(409).json({ err: "This employee already have an account." });

        let email = req.body.email;

        if (email === undefined || typeof email !== "string" || email.trim() === "")
            return res.status(400).json({ err: "Email is required" });

        email = email.trim().toLowerCase();

        const userInDatabase = await User.findOne({
            email,
        });

        if (userInDatabase) return res.status(409).json({ err: "Email already taken." });

        const password = req.body.password;

        if (password === undefined || typeof password !== "string" || password.trim() === "")
            return res.status(400).json({ err: "Password is required" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            employee: employee._id,
            email,
            password: hashedPassword,
            role: req.body.role,
        }

        const userCreated = await User.create(userData);

        const changes = [
            {
                fieldName: "employee",
                oldValue: null,
                newValue: userCreated.employee
            },
            {
                fieldName: "email",
                oldValue: null,
                newValue: userCreated.email
            },
            {
                fieldName: "role",
                oldValue: null,
                newValue: userCreated.role,
            },
            {
                fieldName: "isActive",
                oldValue: null,
                newValue: userCreated.isActive,
            },
        ]

        await createAuditLog({
            tableName: "User",
            recordId: userCreated._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(userCreated);
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) return res.status(404).json({ err: "User not found" });

        if (req.body.email === undefined && req.body.role === undefined)
            return res.status(400).json({ err: "Email or role is required" });

        let email;

        if (req.body.email !== undefined) {
            if (typeof req.body.email !== "string" || req.body.email.trim() === "")
                return res.status(400).json({ err: "Email is required" });

            email = req.body.email.trim().toLowerCase();

            const existingEmail = await User.findOne({
                _id: { $ne: user._id },
                email,
            })

            if (existingEmail) return res.status(409).json({ err: "Email already taken" });
        }

        const allowedFields = [
            "email",
            "role",
        ];

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = user[field];
            let newValue = req.body[field];
            if (field === "email")
                newValue = email;
            else if (typeof newValue === "string")
                newValue = newValue.trim();

            user[field] = newValue;

            if (user.isModified(field)) {
                changes.push({
                    fieldName: field,
                    oldValue,
                    newValue: user[field],
                });
            }
        }

        if (changes.length === 0) return res.status(200).json(user);
        await user.save();

        await createAuditLog({
            tableName: "User",
            recordId: user._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(user);
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const updateStatus = async (req, res) => {
    try {
        const currentUser = await User.findById(req.params.userId);

        if (!currentUser) return res.status(404).json({ err: "User not found" });

        const isActive = req.body.isActive;

        if (typeof isActive !== "boolean") return res.status(400).json({ err: "isActive must be a boolean." });

        if (currentUser.isActive === isActive) return res.status(200).json(currentUser);

        const changes = [{
            fieldName: "isActive",
            oldValue: currentUser.isActive,
            newValue: isActive,
        }];

        currentUser.isActive = isActive;
        await currentUser.save();

        await createAuditLog({
            tableName: "User",
            recordId: currentUser._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentUser);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    addUser,
    updateUser,
    updateStatus,
}