const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user");

// const signToken = (req, res) => {

//     const user = {
//         id: 1,
//         username: "test",
//         password: "test",
//     }

//     // Create a token
//     const token = jwt.sign({ user }, process.env.JWT_SECRET);
//     res.json({ token });
// }

// const verifyToken = (req, res) => {
//     const token = req.headers.authorization.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     res.json({ decoded })
// }

const signUp = async (req, res) => {
    try {

        const userInDatabase = await User.findOne({
            username: req.body.username,
        });

        if (userInDatabase) return res.status(409).json({ err: "Username already taken." });

        const password = req.body.password;
        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            username: req.body.username,
            password: hashedPassword,
        }

        const userCreated = await User.create(userData);

        // Create the payload
        const payload = { username: userCreated.username, _id: userCreated._id };

        // Create the token with payload + secret
        const token = jwt.sign({ payload }, process.env.JWT_SECRET);

        res.status(201).json({ token });

    } catch (e) {
        res.status(400).json({ err: err.message });
    }
}

const signIn = async (req, res) => {
    try {
        const userInDatabase = await User.findOne({
            username: req.body.username
        });

        if (!userInDatabase) return res.status(404).json({ err: "User does not exist" });

        const password = req.body.password;
        const comparePassword = userInDatabase.password;

        const isValidPassword = await bcrypt.compare(password, comparePassword);

        if (!isValidPassword) res.status(401).json({ err: "Login Failed. Please try again." });

        // payload
        const payload = { username: userInDatabase.username, _id: userInDatabase._id };

        // token
        const token = jwt.sign({ payload }, process.env.JWT_SECRET);

        res.json({ token })

    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    // signToken,
    // verifyToken,
    signUp,
    signIn
}