const mongoose = require("mongoose");

const shiftAssignmentSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    shiftType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShiftType",
        required: true,
    },
    fromDate: {
        type: Date,
        required: true,
    },
    toDate: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

const ShiftAssignment = mongoose.model("ShiftAssignment", shiftAssignmentSchema);

module.exports = ShiftAssignment;