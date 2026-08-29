const Attendance = require("../models/attendance");
const ShiftAssignment = require("../models/shiftAssignment");
const Holiday = require("../models/holiday");

const getBahrainDate = require("../utils/getBahrainDate");

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

            const holiday = await Holiday.findOne({
                holidayList: holidayList._id,
                date,
                isConfirmed: true,
            });

            let status = "Absent";

            if (holiday)
                status = "Holiday";
            else if (isWeeklyOff)
                status = "Weekly Off";

            await Attendance.create({
                employee: assignment.employee._id,
                date,
                status,
                shiftType: assignment.shiftType._id,
                inTime: null,
                outTime: null,
                workedHours: 0,
                isIncomplete: false,
            });

            generated++;
        }

        await res.status(200).json({
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

module.exports = {
    generate,
}