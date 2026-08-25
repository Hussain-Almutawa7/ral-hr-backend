const mongoose = require("mongoose");

const salaryStructureLineSchema = new mongoose.Schema({
    salaryComponent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SalaryComponent",
        required: true,
    },
    amountFils: {
        type: Number,
        min: 0,
        default: null,
    },
    percent: {
        type: Number,
        min: 0,
        default: null,
    },
}, { _id: false });

salaryStructureLineSchema.pre("validate", function (next) {
    const hasAmount = this.amountFils !== null;
    const hasPercent = this.percent !== null;

    if (hasAmount === hasPercent) return next(new Error("A salary structure line must have either an amount or a percent."));

    next();
});

const salaryStructureSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
    },
    currency: {
        type: String,
        required: true,
        enum: ["BHD"],
    },
    lines: {
        type: [salaryStructureLineSchema],
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);

module.exports = SalaryStructure;