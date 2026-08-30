const mongoose = require("mongoose");

const attendanceCorrectionSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reason: {
        type: String,
        required: true,
        trim: true,
    },
    requestedInTime: {
        type: Date,
        default: null,
    },
    requestedOutTime: {
        type: Date,
        default: null,
    },
    requestedStatus: {
        type: String,
        enum: [
            "Present",
            "Absent",
            "Half Day",
            "On Leave",
            "Holiday",
            "Weekly Off",
        ],
        default: null,
    },
    status: {
        type: String,
        enum: [
            "Requested",
            "Corrected by HR",
            "Approved",
            "Rejected",
        ],
        required: true,
        default: "Requested",
    },
    correctedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    requestedAt: {
        type: Date,
        default: Date.now,
    },
    correctedAt: {
        type: Date,
        default: null,
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    rejectedAt: {
        type: Date,
        default: null,
    },
});

const AttendanceCorrection = mongoose.model("AttendanceCorrection", attendanceCorrectionSchema);

module.exports = AttendanceCorrection;