const mongoose = require("mongoose");
const isValidIban = require("../utils/validateIban");

const employeeSchema = new mongoose.Schema({
    employeeCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    nameEn: {
        type: String,
        required: true,
        trim: true,
    },
    nameAr: {
        type: String,
        required: true,
        trim: true,
    },
    cprNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^\d{9}$/, "CPR number must contain exactly 9 digits"],
    },
    dateOfBirth: {
        type: Date,
        required: true,
    },
    gender: {
        type: String,
        required: true,
        enum: ["Male", "Female"],
    },
    nationality: {
        type: String,
        required: true,
        trim: true,
    },
    isBahraini: {
        type: Boolean,
        required: true,
    },
    workerCategory: {
        type: String,
        required: true,
        enum: ["Bahraini", "GCC National", "Expatriate"],
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null,
    },
    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Designation",
        default: null,
    },
    reportsTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
    },
    dateOfJoining: {
        type: Date,
        required: true,
    },
    probationEndDate: {
        type: Date,
        default: null,
    },
    employmentType: {
        type: String,
        required: true,
        enum: ["Full Time", "Part Time", "Fixed Term"],
    },
    status: {
        type: String,
        required: true,
        enum: ["Active", "On Leave", "Suspended", "Left"],
    },
    dateOfLeaving: {
        type: Date,
        default: null,
        required: function () {
            return this.status === "Left"
        },
    },
    iban: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        validate: {
            validator: isValidIban,
            message: "Invalid IBAN",
        }
    },
    bankName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bank",
        required: true,
    },
    mobile: {
        type: String,
        required: true,
        trim: true,
        match: [/^3\d{7}$/, "Mobile number must be 8 digits and start with 3"],
    },
    emailPersonal: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
    },
    emailWork: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
    },
    holidayList: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HolidayList",
        required: true,
    },
    shiftType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShiftType",
        default: null,
    },
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;