const User = require("../models/user");

const index = async (req, res) => {
    try {
        const allUsers = await User.find();
        res.json(allUsers);
    } catch (e) {
        res.status(500).json({err: e.message});
    }
}

module.exports = {
    index,
}