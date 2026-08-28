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
        trim: true,
        match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
        type: String,
        required: true,
        trim: true,
        match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    breakMinutes: {
        type: Number,
        required: true,
        min: 0,
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
        min: 0,
    },
    lateGraceMinutes: {
        type: Number,
        required: true,
        min: 0,
    },
    earlyExitGraceMinutes: {
        type: Number,
        required: true,
        min: 0,
    },
    checkoutAllowedMinutesAfter: {
        type: Number,
        required: true,
        min: 0,
    },
    halfDayHoursThreshold: {
        type: Number,
        required: true,
        min: 0,
    },
    absentHoursThreshold: {
        type: Number,
        required: true,
        min: 0,
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