const mongoose = require("mongoose");

const salaryComponentSchema = new mongoose.Schema({
    componentName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    componentType: {
      type: String,
      enum: ["Earning", "Deduction"],
      required: true,
    },
    isBasic: {
      type: Boolean,
      required: true,
    },
    isCash: {
      type: Boolean,
      required: true,
    },
    isSocialAllowance: {
      type: Boolean,
      required: true,
    },
    countsForSio: {
      type: Boolean,
      required: true,
    },
    countsForEos: {
      type: Boolean,
      required: true,
    },
    formula: {
      type: String,
      trim: true,
      default: null,
    },
  }, { timestamps: true });

const SalaryComponent = mongoose.model("SalaryComponent", salaryComponentSchema);

module.exports = SalaryComponent;