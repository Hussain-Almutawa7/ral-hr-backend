const ShiftAssignment = require("../models/shiftAssignment");
const ShiftType = require("../models/shiftType");
const Employee = require("../models/employee");

const createAuditLog = require("../utils/createAuditLog");

const index = async (req, res) => {
    try {
        const filter = {};

        if (req.query.employee !== undefined) {
            const employee = await Employee.findById(req.query.employee);

            if (!employee) return res.status(400).json({ err: "Invalid employee." });

            filter.employee = employee._id;
        }

        const shiftAssignments = await ShiftAssignment.find(filter)
            .populate("employee", "employeeCode nameEn nameAr")
            .populate("shiftType", "shiftName startTime endTime isActive")
            .sort({ fromDate: -1 });

        res.status(200).json(shiftAssignments);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const create = async (req, res) => {
    try {
        const employee = await Employee.findById(req.body.employee);

        if (!employee) return res.status(400).json({ err: "Invalid employee." });

        const shiftType = await ShiftType.findById(req.body.shiftType);

        if (!shiftType) return res.status(400).json({ err: "Invalid shift type." });
        if (!shiftType.isActive) return res.status(400).json({ err: "Shift type is inactive" });

        if (req.body.fromDate === null || req.body.fromDate === "") return res.status(400).json({ err: "From date cannot be empty." });

        const fromDate = new Date(req.body.fromDate);
        const toDate = req.body.toDate ? new Date(req.body.toDate) : null;

        if (isNaN(fromDate.getTime())) return res.status(400).json({ err: "Invalid from date." });
        if (toDate && isNaN(toDate.getTime())) return res.status(400).json({ err: "Invalid to date." });

        if (toDate && toDate < fromDate) return res.status(400).json({ err: "To date must be after from date" });

        let overlapFilter = {
            employee: employee._id,
            fromDate: { $lte: toDate || new Date("9999-12-31") },
            $or: [
                { toDate: null },
                { toDate: { $gte: fromDate } }
            ]
        };

        const overlappingAssignemnts = await ShiftAssignment.findOne(overlapFilter);

        if (overlappingAssignemnts) return res.status(409).json({ err: "Employee already has a shift assignemts during this period" });

        const shiftAssignmentData = {
            employee: req.body.employee,
            shiftType: req.body.shiftType,
            fromDate,
            toDate,
        }

        const createdShiftAssignment = await ShiftAssignment.create(shiftAssignmentData);

        const changes = [];

        for (const [fieldName, newValue] of Object.entries(shiftAssignmentData)) {
            if (newValue !== null && newValue !== undefined) {
                changes.push({
                    fieldName,
                    oldValue: null,
                    newValue,
                })
            }
        }

        await createAuditLog({
            tableName: "ShiftAssignment",
            recordId: createdShiftAssignment._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdShiftAssignment);
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const show = async (req, res) => {
    try {
        const shiftAssignment = await ShiftAssignment.findById(req.params.shiftAssignmentId)
            .populate("employee", "employeeCode nameEn nameAr")
            .populate("shiftType", "shiftName startTime endTime isActive");

        if (!shiftAssignment) return res.status(404).json({ err: "Shift assignment not found" });

        res.status(200).json(shiftAssignment)
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentShiftAssignment = await ShiftAssignment.findById(req.params.shiftAssignmentId);

        if (!currentShiftAssignment) return res.status(404).json({ err: "Shift assignments not found" });

        const allowedFields = [
            "shiftType",
            "fromDate",
            "toDate",
        ]

        const hasAllowedField = allowedFields.some(field => req.body[field] !== undefined);
        if (!hasAllowedField) return res.status(400).json({ err: "No valid fields provided." });

        let shiftType;

        if (req.body.shiftType !== undefined) {
            shiftType = await ShiftType.findById(req.body.shiftType);

            if (!shiftType) return res.status(400).json({ err: "Invalid shift type." });
            if (!shiftType.isActive) return res.status(400).json({ err: "Shift type is inactive." });
        }

        if (req.body.fromDate === null || req.body.fromDate === "") return res.status(400).json({ err: "From date cannot be empty." });

        const fromDate = req.body.fromDate !== undefined ? new Date(req.body.fromDate) : currentShiftAssignment.fromDate;
        const toDate = req.body.toDate !== undefined ? (req.body.toDate ? new Date(req.body.toDate) : null) : currentShiftAssignment.toDate;

        if (isNaN(fromDate.getTime())) return res.status(400).json({ err: "Invalid from date." });
        if (toDate && isNaN(toDate.getTime())) return res.status(400).json({ err: "Invalid to date." });

        if (toDate && toDate < fromDate) return res.status(400).json({ err: "To date must be after from date" });

        let overlapFilter = {
            _id: { $ne: currentShiftAssignment._id },
            employee: currentShiftAssignment.employee,
            fromDate: { $lte: toDate || new Date("9999-12-31") },
            $or: [
                { toDate: null },
                { toDate: { $gte: fromDate } }
            ]
        };

        const overlappingAssignemnts = await ShiftAssignment.findOne(overlapFilter);

        if (overlappingAssignemnts) return res.status(409).json({ err: "Employee already has a shift assignemts during this period" });

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = currentShiftAssignment[field];
            let newValue = req.body[field];

            if (field === "shiftType") newValue = shiftType._id;

            currentShiftAssignment[field] = newValue;

            if (currentShiftAssignment.isModified(field)) {
                changes.push({
                    fieldName: field,
                    oldValue,
                    newValue: currentShiftAssignment[field],
                })
            }
        }

        if (changes.length === 0) return res.status(200).json(currentShiftAssignment);
        await currentShiftAssignment.save();

        await createAuditLog({
            tableName: "ShiftAssignment",
            recordId: currentShiftAssignment._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentShiftAssignment);

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    create,
    show,
    update,
}