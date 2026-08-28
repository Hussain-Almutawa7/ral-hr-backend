const ShiftAssignment = require("../models/shiftAssignment");
const ShiftType = require("../models/shiftType");
const Employee = require("../models/employee");

const createAuditLog = require("../utils/createAuditLog");

const create = async (req, res) => {
    try {
        const employee = await Employee.findById(req.body.employee);

        if (!employee) return res.status(400).json({ err: "Invalid employee." });

        const shiftType = await ShiftType.findById(req.body.shiftType);

        if (!shiftType) return res.status(400).json({ err: "Invalid shift type." });
        if (!shiftType.isActive) return res.status(400).json({ err: "Shift type is inactive" });

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

module.exports = {
    create,
}