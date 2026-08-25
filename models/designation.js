const mongoose = require("mongoose");

const designationSchema = new mongoose.Schema({
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
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const Designation = mongoose.model("Designation", designationSchema);

module.exports = Designation;