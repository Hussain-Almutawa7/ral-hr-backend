const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
    nameEn: {
        type: String,
        required: true,
        trim: true,
    },
    nameAr: {
        type: String,
        trim: true,
        default: null,
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const Department = mongoose.model("Department", departmentSchema);

module.exports = Department;