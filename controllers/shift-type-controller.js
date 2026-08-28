const ShiftType = require("../models/shiftType");
const HolidayList = require("../models/holidayList");

const createAuditLog = require("../utils/createAuditLog");
const escapeRegex = require("../utils/escapeRegex");

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

const create = async (req, res) => {
    try {
        if (typeof req.body.shiftName !== "string" || req.body.shiftName.trim() === "")
            return res.status(400).json({ err: "Shift name is required." });

        const shiftName = req.body.shiftName.trim();

        const foundShiftType = await ShiftType.findOne({
            shiftName: {
                $regex: `^${escapeRegex(shiftName)}$`,
                $options: "i",
            }
        });

        if (foundShiftType) return res.status(409).json({ err: "Shift Type with this name already exists." });

        if (!Array.isArray(req.body.workingDays) || req.body.workingDays.length === 0)
            return res.status(400).json({ err: "workingDays must contain at least one day." });

        const holidayList = await HolidayList.findById(req.body.holidayList);
        if (!holidayList) return res.status(400).json({ err: "Invalid holiday list." });

        const shiftTypeData = {
            shiftName,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            breakMinutes: req.body.breakMinutes,
            workingDays: req.body.workingDays,
            checkinAllowedMinutesBefore: req.body.checkinAllowedMinutesBefore,
            lateGraceMinutes: req.body.lateGraceMinutes,
            earlyExitGraceMinutes: req.body.earlyExitGraceMinutes,
            checkoutAllowedMinutesAfter: req.body.checkoutAllowedMinutesAfter,
            halfDayHoursThreshold: req.body.halfDayHoursThreshold,
            absentHoursThreshold: req.body.absentHoursThreshold,
            markLateEntry: req.body.markLateEntry,
            markEarlyExit: req.body.markEarlyExit,
            allowOvertime: req.body.allowOvertime,
            holidayList: holidayList._id,
            isActive: true,
        };

        const createdShiftType = await ShiftType.create(shiftTypeData);

        const changes = [];

        for (const [fieldName, newValue] of Object.entries(shiftTypeData)) {
            if (newValue !== null && newValue !== undefined) {
                changes.push({
                    fieldName,
                    oldValue: null,
                    newValue,
                });
            }
        }

        await createAuditLog({
            tableName: "ShiftType",
            recordId: createdShiftType._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdShiftType);

    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    create,
}