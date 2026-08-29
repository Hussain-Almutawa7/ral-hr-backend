const Attendance = require("../models/attendance");
const ShiftAssignment = require("../models/shiftAssignment");
const Holiday = require("../models/holiday");
const LeaveRequest = require("../models/leaveRequest");
const Employee = require("../models/employee");

const getBahrainDate = require("../utils/getBahrainDate");
const createAuditLog = require("../utils/createAuditLog");

const index = async (req, res) => {
    try {
        const filter = {};

        if (req.query.employee !== undefined) filter.employee = req.query.employee;

        if (req.query.date !== undefined) {
            if (req.query.date === "") return res.status(400).json({ err: "Invalid date provided" });

            const date = new Date(req.query.date);

            if (isNaN(date.getTime())) return res.status(400).json({ err: "Invalid date provided." });

            date.setUTCHours(0, 0, 0, 0);

            filter.date = date;
        }

        const attendances = await Attendance.find(filter)
            .populate("employee", "employeeCode nameEn nameAr")
            .populate("shiftType", "shiftName startTime endTime")
            .populate("leaveRequest")
            .sort({ date: -1 });

        res.status(200).json(attendances);

    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const generate = async (req, res) => {
    try {
        if (req.body.date === undefined || req.body.date === null || req.body.date === "")
            return res.status(400).json({ err: "Date is required" });

        const date = new Date(req.body.date);

        if (isNaN(date.getTime())) return res.status(400).json({ err: "Invalid date provided" });

        date.setUTCHours(0, 0, 0, 0);

        const today = getBahrainDate(new Date());

        if (date >= today) return res.status(400).json({ err: "Attendance can only be generated for completed past dates." });

        const dateEnd = new Date(date);
        dateEnd.setUTCHours(23, 59, 59, 999);

        const shiftAssignemts = await ShiftAssignment.find({
            fromDate: { $lte: dateEnd },
            $or: [
                { toDate: null },
                { toDate: { $gte: date } }
            ]
        }).populate("employee")
            .populate({
                path: "shiftType",
                populate: {
                    path: "holidayList"
                }
            });

        if (shiftAssignemts.length === 0) return res.status(200).json({
            message: "No shift assignments found for this date.",
            generated: 0
        });

        const dayName = date.toLocaleDateString("en-US", {
            weekday: "long",
            timeZone: "Asia/Bahrain",
        });

        let generated = 0;
        let skipped = 0;

        for (const assignment of shiftAssignemts) {
            const existingAttendance = await Attendance.findOne({
                employee: assignment.employee._id,
                date,
            });

            if (existingAttendance) {
                skipped++;
                continue;
            }

            const holidayList = assignment.shiftType.holidayList;
            const isWeeklyOff = holidayList.weeklyOffDays.includes(dayName);

            const approvedLeave = await LeaveRequest.findOne({
                employee: assignment.employee._id,
                status: "Approved",
                fromDate: { $lte: date },
                toDate: { $gte: date },
            });

            const holiday = await Holiday.findOne({
                holidayList: holidayList._id,
                date,
                isConfirmed: true,
            });

            let status = "Absent";
            let leaveRequest = null;

            if (holiday)
                status = "Holiday";
            else if (isWeeklyOff)
                status = "Weekly Off";
            else if (approvedLeave) {
                leaveRequest = approvedLeave._id;

                if (approvedLeave.isHalfDay && approvedLeave.halfDayDate && getBahrainDate(approvedLeave.halfDayDate).getTime() === date.getTime()) {
                    status = "Half Day";
                } else {
                    status = "On Leave";
                }
            }

            await Attendance.create({
                employee: assignment.employee._id,
                date,
                status,
                shiftType: assignment.shiftType._id,
                inTime: null,
                outTime: null,
                workedHours: 0,
                isIncomplete: false,
                leaveRequest,
            });

            generated++;
        }

        res.status(200).json({
            message: "Attendance generation completed.",
            generated,
            skipped,
        });

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const myAttendance = async (req, res) => {
    try {
        const attendances = await Attendance.find({ employee: req.user.employee, })
            .populate("shiftType", "shiftName startTime endTime")
            .populate("leaveRequest")
            .sort({ date: -1 });

        res.status(200).json(attendances);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const teamAttendance = async (req, res) => {
    try {
        const teamMembers = await Employee.find({
            reportsTo: req.user.employee,
        }).select("_id");

        const employeeIds = teamMembers.map(employee => employee._id);

        const attendances = await Attendance.find({
            employee: { $in: employeeIds },
        })
            .populate("employee", "employeeCode nameEn nameAr")
            .populate("shiftType", "shiftName startTime endTime")
            .populate("leaveRequest")
            .sort({ date: -1 });

        res.status(200).json(attendances);

    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const updateOvertime = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.attendanceId);

        if (!attendance) return res.status(404).json({ err: "Attendance not found" });

        if (typeof req.body.approved !== "boolean")
            return res.status(400).json({ err: "approved must be true or false." });

        const employee = await Employee.findById(attendance.employee);

        if (!employee) return res.status(404).json({ err: "Employee not found" });
        if (!employee.reportsTo || !employee.reportsTo.equals(req.user.employee)) return res.status(403).json({ err: "You can only approve overtime for your team." });
        if (attendance.locked) return res.status(400).json({ err: "Locked attendance cannot be changed." });
        if (attendance.overtimeHours <= 0) return res.status(400).json({ err: "Employee has no overtime" });

        const newStatus = req.body.approved ? "Approved" : "Rejected";

        if (attendance.overtimeStatus === newStatus) return res.status(200).json(attendance);

        const oldOvertimeApproved = attendance.overtimeApproved;
        const oldOvertimeStatus = attendance.overtimeStatus;

        attendance.overtimeApproved = req.body.approved;
        attendance.overtimeStatus = newStatus;

        const changes = [];

        if (oldOvertimeApproved !== attendance.overtimeApproved) {
            changes.push({
                fieldName: "overtimeApproved",
                oldValue: oldOvertimeApproved,
                newValue: attendance.overtimeApproved,
            });
        }

        if (oldOvertimeStatus !== attendance.overtimeStatus) {
            changes.push({
                fieldName: "overtimeStatus",
                oldValue: oldOvertimeStatus,
                newValue: attendance.overtimeStatus,
            });
        }

        await attendance.save();

        await createAuditLog({
            tableName: "Attendance",
            recordId: attendance._id,
            action: req.body.approved ? "Approve" : "Reject",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(attendance);
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    generate,
    myAttendance,
    teamAttendance,
    updateOvertime,
}