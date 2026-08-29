const Checkin = require("../models/checkin");
const Employee = require("../models/employee");
const ShiftAssignemt = require("../models/shiftAssignment");
const Attendance = require("../models/attendance");

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

        if (logType === "IN") {
            const attendanceData = {
                employee: employee._id,
                date: todayStart,
                status: "Present",
                shiftType: shiftAssignemt.shiftType._id,
                inTime: timestamp,
                isIncomplete: true,
            };

            const existingAttendance = await Attendance.findOne({
                employee: employee._id,
                date: todayStart,
            });

            if (existingAttendance) return res.status(400).json({ err: "Attendance available today" });
            const createdAttendance = await Attendance.create(attendanceData);

            const checkinData = {
                employee: employee._id,
                timestamp,
                logType,
                source: "Web",
                attendance: createdAttendance._id,
            };

            const createdCheckin = await Checkin.create(checkinData);

            return res.status(201).json(createdCheckin);
        }

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const index = async (req, res) => {
    try {
        const checkin = await Checkin.find({
            employee: req.user.employee,
        }).sort({ timestamp: -1 });

        if (checkin.length === 0) return res.status(404).json({ err: "Check-in not found" });

        res.status(200).json(checkin);
    } catch (e) {
        return res.status(500).json({ err: e.message })
    }
}

module.exports = {
    create,
    index,
}