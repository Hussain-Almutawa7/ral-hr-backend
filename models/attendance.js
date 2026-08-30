const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: [
            "Present",
            "Absent",
            "Half Day",
            "On Leave",
            "Holiday",
            "Weekly Off",
        ],
        required: true,
    },
    shiftType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShiftType",
        default: null,
    },
    inTime: {
        type: Date,
        default: null,
    },
    outTime: {
        type: Date,
        default: null,
    },
    workedHours: {
        type: Number,
        default: 0,
    },
    isLateEntry: {
        type: Boolean,
        default: false,
    },
    isEarlyExit: {
        type: Boolean,
        default: false,
    },
    isIncomplete: {
        type: Boolean,
        default: false,
    },
    overtimeHours: {
        type: Number,
        default: 0,
    },
    overtimeApproved: {
        type: Boolean,
        default: false,
    },
    overtimeStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", null],
        default: null,
    },
    leaveRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeaveRequest",
        default: null,
    },
    isCorrected: {
        type: Boolean,
        default: false,
    },
    correctedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    correctionReason: {
        type: String,
        trim: true,
        default: null,
    },
    locked: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

attendanceSchema.index(
    { employee: 1, date: 1 },
    { unique: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;