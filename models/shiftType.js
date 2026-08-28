const mongoose = require("mongoose");

const shiftTypeSchema = new mongoose.Schema({
    shiftName: {
        type: String,
        required: true,
        trim: true,
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        required: true,
    },
    breakMinutes: {
        type: Number,
        required: true,
    },
    workingDays: {
        type: [String],
        enum: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ],
        required: true,
    },
    checkinAllowedMinutesBefore: {
        type: Number,
        required: true,
    },
    lateGraceMinutes: {
        type: Number,
        required: true,
    },
    earlyExitGraceMinutes: {
        type: Number,
        required: true,
    },
    checkoutAllowedMinutesAfter: {
        type: Number,
        required: true,
    },
    halfDayHoursThreshold: {
        type: Number,
        required: true,
    },
    absentHoursThreshold: {
        type: Number,
        required: true,
    },
    markLateEntry: {
        type: Boolean,
        required: true,
    },
    markEarlyExit: {
        type: Boolean,
        required: true,
    },
    allowOvertime: {
        type: Boolean,
        required: true,
    },
    holidayList: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HolidayList",
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const ShiftType = mongoose.model("ShiftType", shiftTypeSchema);

module.exports = ShiftType;