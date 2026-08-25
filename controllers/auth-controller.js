const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user");

const signIn = async (req, res) => {
    try {
        const userInDatabase = await User.findOne({
            email: req.body.email
        });

        if (!userInDatabase) return res.status(404).json({ err: "User does not exist" });
        if (!userInDatabase.isActive) return res.status(403).json({ err: "This Account has been deactivated" });

        const password = req.body.password;
        const comparePassword = userInDatabase.password;

        const isValidPassword = await bcrypt.compare(password, comparePassword);

        if (!isValidPassword) return res.status(401).json({ err: "Login Failed. Please try again." });

        // payload
        const payload = {
            _id: userInDatabase._id,
            email: userInDatabase.email,
            role: userInDatabase.role,
            employee: userInDatabase.employee,
        };

        // token
        const token = jwt.sign({ payload }, process.env.JWT_SECRET);

        res.status(200).json({ token })

    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    signIn,
}