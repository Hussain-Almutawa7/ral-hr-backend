const AttendanceCorrection = require("../models/attendanceCorrection");
const Attendance = require("../models/attendance");
const Employee = require("../models/employee");

const create = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.body.attendance);
        const employee = await Employee.findById(attendance.employee);

        if (!attendance) return res.status(404).json({ err: "Attendance not found." });
        if (attendance.locked) return res.status(400).json({ err: "Locked attendance cannot be changed." });

        if (!employee) return res.status(404).json({ err: "Employee not found." });
        if (!employee.reportsTo || !employee.reportsTo.equals(req.user.employee))
            return res.status(403).json({ err: "Employee is not your direct report." });

        if (req.body.reason === undefined) return res.status(400).json({ err: "Reason must be applied" });

        const correctionFields = [
            "requestedInTime",
            "requestedOutTime",
            "requestedStatus"
        ];

        const hasRequestedChange = correctionFields.some(field => req.body[field] !== undefined);
        if (!hasRequestedChange) return res.status(400).json({ err: "At least one correction value must be provided." });

        const existingAttendanceCorrection = await AttendanceCorrection.findOne({
            employee: attendance.employee,
            date: attendance.date,
            status: "Requested",
        });

        if (existingAttendanceCorrection) return res.status(409).json({ err: "A correction request already exists for this attendace" });

        const correctionData = {
            employee: attendance.employee,
            date: attendance.date,
            requestedBy: req.user._id,
            reason: req.body.reason,
            requestedInTime: req.body.requestedInTime,
            requestedOutTime: req.body.requestedOutTime,
            requestedStatus: req.body.requestedStatus,
        };

        const createdCorrection = await AttendanceCorrection.create(correctionData);

        res.status(201).json(createdCorrection);

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    create,
}