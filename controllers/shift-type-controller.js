const ShiftType = require("../models/shiftType");
const createAuditLog = require("../utils/createAuditLog");

const index = async (req, res) => {
    try {
        const filter = req.user.role === "HR Manager" ? {} : { isActive: true };
        const shiftTypes = await ShiftType.find(filter)
            .populate("holidayList");

        res.status(200).json(shiftTypes);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
}