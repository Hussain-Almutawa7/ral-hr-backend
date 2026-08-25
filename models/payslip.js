const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema({
    payrollRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollRun",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    workingDays: {
      type: Number,
      required: true,
      min: 0,
    },
    paidDays: {
      type: Number,
      required: true,
      min: 0,
    },
    absentDays: {
      type: Number,
      required: true,
      min: 0,
    },
    unpaidLeaveDays: {
      type: Number,
      required: true,
      min: 0,
    },
    grossFils: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "Gross salary must be stored in whole fils",
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
    netFils: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "Net salary must be stored in whole fils",
      },
    },
    sioEmployeeFils: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "Employee SIO must be stored in whole fils",
      },
    },
    sioEmployerFils: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "Employer SIO must be stored in whole fils",
      },
    },
    eosAccrualFils: {
      type: Number,
      default: null,
      validate: {
        validator: value => value === null || Number.isInteger(value),
        message: "EOS accrual must be stored in whole fils",
      },
    },
    status: {
      type: String,
      enum: [
        "Draft",
        "Approved",
        "Paid",
        "Cancelled",
      ],
      required: true,
      default: "Draft",
    },
    reissuedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payslip",
      default: null,
    },
  }, { timestamps: true });

const Payslip = mongoose.model("Payslip", payslipSchema);

module.exports = Payslip;