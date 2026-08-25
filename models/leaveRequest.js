const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
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
    fromDate: {
        type: Date,
        required: true,
    },
    toDate: {
        type: Date,
        required: true,
    },
    isHalfDay: {
        type: Boolean,
        default: false,
    },
    halfDayDate: {
        type: Date,
        default: null,
    },
    totalDays: {
        type: Number,
        required: true,
        min: 0,
    },
    reason: {
        type: String,
        trim: true,
        default: null,
    },
    documentFileId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    status: {
        type: String,
        enum: [
            "Draft",
            "Pending",
            "Approved",
            "Rejected",
            "Cancelled",
        ],
        required: true,
        default: "Draft",
    },
    balanceAtRequest: {
        type: Number,
        default: null,
    },
}, { timestamps: true });

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

module.exports = LeaveRequest;