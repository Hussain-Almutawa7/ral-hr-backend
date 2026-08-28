const Checkin = require("../models/checkin");
const Employee = require("../models/employee");
const ShiftAssignemt = require("../models/shiftAssignment");


const create = async (req, res) => {
    try {
        const employee = await Employee.findById(req.user.employee);

        if (!employee) return res.status(404).json({ err: "Employee not found" });

        const logType = req.body.logType;

        if (logType !== "IN" && logType !== "OUT") return res.status(400).json({ err: "logType must be IN or OUT." });

        const timestamp = new Date();

        const todayStart = new Date(timestamp);
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date(timestamp);
        todayEnd.setHours(23, 59, 59, 999);

        const shiftAssignemt = await ShiftAssignemt.findOne({
            employee: employee._id,
            fromDate: { $lte: todayEnd },
            $or: [
                { toDate: null },
                { toDate: { $gte: todayStart } }
            ]
        }).populate("shiftType");

        if (!shiftAssignemt) return res.status(400).json({ err: "No shift assignment found for today." });

        const latestCheckin = await Checkin.findOne({
            employee: employee._id
        }).sort({ timestamp: -1 });

        if (!latestCheckin && logType === "OUT") return res.status(400).json({ err: "You must clock in before clocking out." });

        if (latestCheckin && latestCheckin.logType === logType) {
            if (logType === "IN") return res.status(400).json({ err: "You are already clocked in" });

            return res.status(400).json({ err: "You are already clocked out" });
        }

        const checkinData = {
            employee: employee._id,
            timestamp,
            logType,
            source: "Web",
            attendance: null,
        };

        const createdCheckin = await Checkin.create(checkinData);

        res.status(201).json(createdCheckin);

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    create,
}