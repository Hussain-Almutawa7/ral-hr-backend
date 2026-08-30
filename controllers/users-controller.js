const User = require("../models/user");
const bcrypt = require("bcrypt");
const Employee = require("../models/employee");

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

        res.status(201).json(userCreated);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    addUser,
}