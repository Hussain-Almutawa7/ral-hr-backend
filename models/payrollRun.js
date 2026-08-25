const mongoose = require("mongoose");

const payrollRunSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
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
    status: {
        type: String,
        enum: [
            "Draft",
            "Calculated",
            "Approved",
            "Paid",
            "Cancelled",
        ],
        required: true,
        default: "Draft",
    },
    cutoffAt: {
        type: Date,
        required: true,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    payslipsVisibleFrom: {
        type: Date,
        required: true,
    },
    totalGrossFils: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "Total gross must be stored in whole fils",
        },
    },
    totalDeductionsFils: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "Total deductions must be stored in whole fils",
        },
    },
    totalNetFils: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "Total net must be stored in whole fils",
        },
    },
}, { timestamps: true });

payrollRunSchema.index(
    { company: 1, periodStart: 1, periodEnd: 1, },
    { unique: true }
);

const PayrollRun = mongoose.model("PayrollRun", payrollRunSchema);

module.exports = PayrollRun;