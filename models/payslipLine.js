const mongoose = require("mongoose");

const payslipLineSchema = new mongoose.Schema({
    payslip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payslip",
        required: true,
    },
    component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SalaryComponent",
        required: true,
    },
    amountFils: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "Amount must be stored in whole fils",
        },
    },
    quantity: {
        type: Number,
        default: null,
    },
    rate: {
        type: Number,
        default: null,
    },
    note: {
        type: String,
        trim: true,
        default: null,
    },
}, { timestamps: true });

payslipLineSchema.index({ payslip: 1 });

const PayslipLine = mongoose.model("PayslipLine", payslipLineSchema);

module.exports = PayslipLine;