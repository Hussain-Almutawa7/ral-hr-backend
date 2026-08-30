const User = require("../models/user");

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

module.exports = {
    index,
}