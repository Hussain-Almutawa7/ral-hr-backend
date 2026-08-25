const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
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
    crNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const Company = mongoose.model("Company", companySchema);

module.exports = Company;