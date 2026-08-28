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
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentShiftType = await ShiftType.findById(req.params.shiftTypeId);

        if (!currentShiftType) return res.status(404).json({ err: "Shift Type not found" });

        const allowedFields = [
            "shiftName",
            "startTime",
            "endTime",
            "breakMinutes",
            "workingDays",
            "checkinAllowedMinutesBefore",
            "lateGraceMinutes",
            "earlyExitGraceMinutes",
            "checkoutAllowedMinutesAfter",
            "halfDayHoursThreshold",
            "absentHoursThreshold",
            "markLateEntry",
            "markEarlyExit",
            "allowOvertime",
            "holidayList",
        ];

        const hasAllowedField = allowedFields.some(field => req.body[field] !== undefined);
        if (!hasAllowedField) return res.status(400).json({ err: "No valid fields provided." });

        const hasShiftName = req.body.shiftName !== undefined;

        if (hasShiftName && typeof req.body.shiftName !== "string")
            return res.status(400).json({ err: "Shift name must be text." });

        if (hasShiftName && req.body.shiftName.trim() === "")
            return res.status(400).json({ err: "Shift name cannot be empty." });

        const newShiftName = hasShiftName ? req.body.shiftName.trim() : currentShiftType.shiftName;

        const duplicate = await ShiftType.findOne({
            _id: { $ne: currentShiftType._id },
            shiftName: {
                $regex: `^${escapeRegex(newShiftName)}$`,
                $options: "i",
            }
        });

        if (duplicate) return res.status(409).json({ err: "Shift Type with this name already exists." });

        if (req.body.workingDays !== undefined && (!Array.isArray(req.body.workingDays) || req.body.workingDays.length === 0))
            return res.status(400).json({ err: "workingDays must contain at least one day." });

        let holidayList;
        if (req.body.holidayList !== undefined) {
            holidayList = await HolidayList.findById(req.body.holidayList);

            if (!holidayList) return res.status(400).json({ err: "Invalid holiday list." });
        }

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = currentShiftType[field];
            let newValue = req.body[field];

            if (field === "holidayList") newValue = holidayList._id;
            if (typeof newValue === "string") newValue = newValue.trim();

            currentShiftType[field] = newValue;

            if (currentShiftType.isModified(field)) {
                changes.push({
                    fieldName: field,
                    oldValue,
                    newValue: currentShiftType[field],
                });
            }
        }

        if (changes.length === 0) return res.status(200).json(currentShiftType);
        await currentShiftType.save();


        await createAuditLog({
            tableName: "ShiftType",
            recordId: currentShiftType._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentShiftType);
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const updateStatus = async (req, res) => {
    try {
        const currentShiftType = await ShiftType.findById(req.params.shiftTypeId);

        if (!currentShiftType) return res.status(404).json({ err: "Shift Type not found" });

        const isActive = req.body.isActive;

        if (typeof isActive !== "boolean") return res.status(400).json({ err: "isActive must be a boolean" });

        if (isActive === currentShiftType.isActive) return res.status(200).json(currentShiftType);

        const changes = [{
            fieldName: "isActive",
            oldValue: currentShiftType.isActive,
            newValue: isActive,
        }]

        currentShiftType.isActive = isActive;
        await currentShiftType.save();

        await createAuditLog({
            tableName: "ShiftType",
            recordId: currentShiftType._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentShiftType);
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    create,
    update,
    updateStatus,
}