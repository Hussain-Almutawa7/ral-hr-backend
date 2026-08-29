const Checkin = require("../models/checkin");
const Employee = require("../models/employee");
const ShiftAssignemt = require("../models/shiftAssignment");
const Attendance = require("../models/attendance");
const Holiday = require("../models/holiday");

const create = async (req, res) => {
    try {
        const employee = await Employee.findById(req.user.employee);

        if (!employee) return res.status(404).json({ err: "Employee not found" });

        const logType = req.body.logType;

        if (logType !== "IN" && logType !== "OUT") return res.status(400).json({ err: "logType must be IN or OUT." });

        const timestamp = new Date();

        const latestCheckin = await Checkin.findOne({
            employee: employee._id
        }).sort({ timestamp: -1 });

        if (!latestCheckin && logType === "OUT") return res.status(400).json({ err: "You must clock in before clocking out." });

        if (latestCheckin && latestCheckin.logType === logType) {
            if (logType === "IN") return res.status(400).json({ err: "You are already clocked in" });

            return res.status(400).json({ err: "You are already clocked out" });
        }

        if (logType === "IN") {
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
            }).populate({
                path: "shiftType",
                populate: {
                    path: "holidayList"
                }
            });

            if (!shiftAssignemt) return res.status(400).json({ err: "No shift assignment found for today." });

            const holidayList = shiftAssignemt.shiftType.holidayList;

            const dayName = timestamp.toLocaleDateString("en-US", {
                weekday: "long",
                timeZone: "Asia/Bahrain"
            });

            const isWeeklyOff = holidayList.weeklyOffDays.includes(dayName);

            const holiday = await Holiday.findOne({
                holidayList: holidayList._id,
                date: todayStart,
                isConfirmed: true,
            });

            const isHoliday = holiday ? true : false;

            let status = "Present";

            if (isHoliday) 
                status = "Holiday";
            else if (isWeeklyOff) status = "Weekly Off";


            const attendanceData = {
                employee: employee._id,
                date: todayStart,
                status,
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

        if (logType === "OUT") {
            const attendance = await Attendance.findById(latestCheckin.attendance)
                .populate("shiftType");

            if (!attendance) return res.status(400).json({ err: "Attendance record not found" });

            const elapsedHours = (timestamp - attendance.inTime) / (1000 * 60 * 60);
            const breakHours = attendance.shiftType.breakMinutes / 60;
            const workedHours = Math.max(0, elapsedHours - breakHours);

            const [startHour, startMinute] = attendance.shiftType.startTime.split(":").map(Number);
            const [endHour, endMinute] = attendance.shiftType.endTime.split(":").map(Number);

            const shiftStart = new Date(attendance.date);
            shiftStart.setHours(startHour, startMinute, 0, 0);

            const shiftEnd = new Date(attendance.date);
            shiftEnd.setHours(endHour, endMinute, 0, 0);

            if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

            const lateLimit = new Date(shiftStart.getTime() + attendance.shiftType.lateGraceMinutes * 60 * 1000);
            attendance.isLateEntry = attendance.shiftType.markLateEntry && attendance.inTime > lateLimit

            const earlyExitLimit = new Date(shiftEnd.getTime() - attendance.shiftType.earlyExitGraceMinutes * 60 * 1000);
            attendance.isEarlyExit = attendance.shiftType.markEarlyExit && timestamp < earlyExitLimit;

            if (attendance.shiftType.allowOvertime && timestamp > shiftEnd) {
                attendance.overtimeHours = (timestamp - shiftEnd) / (1000 * 60 * 60);
            } else {
                attendance.overtimeHours = 0;
            }

            if (workedHours < attendance.shiftType.absentHoursThreshold) {
                attendance.status = "Absent";
            } else if (workedHours < attendance.shiftType.halfDayHoursThreshold) {
                attendance.status = "Half Day";
            } else {
                attendance.status = "Present";
            }

            attendance.outTime = timestamp;
            attendance.workedHours = workedHours;
            attendance.isIncomplete = false;

            await attendance.save();

            const checkinData = {
                employee: employee._id,
                timestamp,
                logType,
                source: "Web",
                attendance: attendance._id,
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

        res.status(200).json(checkin);
    } catch (e) {
        return res.status(500).json({ err: e.message })
    }
}

module.exports = {
    create,
    index,
}