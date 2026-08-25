const mongoose = require("mongoose");

const leaveAllocationSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    leaveType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeaveType",
        required: true,
    },
    periodStart: {
        type: Date,
        required: true,
    },
    periodEnd: {
        type: Date,
        required: true,
    },
    daysAllocated: {
        type: Number,
        required: true,
        min: 0,
    },
    daysCarriedForward: {
        type: Number,
        default: 0,
        min: 0,
    },
    daysTaken: {
        type: Number,
        default: 0,
        min: 0,
    },
}, { timestamps: true });

leaveAllocationSchema.index({
    employee: 1,
    leaveType: 1,
    periodStart: 1,
    periodEnd: 1,
}, { unique: true });

const LeaveAllocation = mongoose.model("LeaveAllocation", leaveAllocationSchema);

module.exports = LeaveAllocation;