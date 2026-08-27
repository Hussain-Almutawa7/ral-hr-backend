const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema({
    leaveTypeName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    leaveTypeNameAr: {
        type: String,
        trim: true,
        default: null,
    },
    maxDaysPerYear: {
        type: Number,
        required: true,
        min: 0,
    },
    payFraction: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
    },
    requiresServiceMonths: {
        type: Number,
        min: 0,
        default: null,
    },
    requiresDocument: {
        type: Boolean,
        default: null,
    },
    carryForward: {
        type: Boolean,
        default: null,
    },
    maxCarryForward: {
        type: Number,
        min: 0,
        default: null,
    },
    encashable: {
        type: Boolean,
        default: null,
    },
    countsTowardService: {
        type: Boolean,
        default: null,
    },
    oncePerLifetime: {
        type: Boolean,
        default: null,
    },
    maxLifeTimeUses: {
        type: Number,
        default: null,
    },
    includesHolidays: {
        type: Boolean,
        default: null,
    },
    genderRestriction: {
        type: String,
        enum: ["Male", "Female", null],
        default: null,
    },
    nextLeaveType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeaveType",
        default: null,
    },
    lawArticle: {
        type: String,
        trim: true,
        default: null,
    },
}, { timestamps: true });

const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);

module.exports = LeaveType;