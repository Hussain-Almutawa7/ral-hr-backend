const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema({
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

const Bank = mongoose.model("Bank", bankSchema);

module.exports = Bank;