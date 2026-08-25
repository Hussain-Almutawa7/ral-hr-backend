const mongoose = require("mongoose");

const salaryAssignmentSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    salaryStructure: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SalaryStructure",
        required: true,
    },
    fromDate: {
        type: Date,
        required: true,
    },
    baseAmountFils: {
        type: Number,
        required: true,
        min: 0,
    },
}, { timestamps: true });

salaryAssignmentSchema.index(
  { employee: 1, fromDate: 1 },
  { unique: true }
);

const SalaryAssignment = mongoose.model("SalaryAssignment", salaryAssignmentSchema);

module.exports = SalaryAssignment;