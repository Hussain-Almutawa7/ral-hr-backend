const Department = require("../models/department");

const index = async (req, res) => {
    try {
        const departments = await Department.find({
            isActive: true,
        });

        res.status(200).json(departments);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
}