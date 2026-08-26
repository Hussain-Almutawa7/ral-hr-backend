const mongoose = require("mongoose");

const documentTypeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    nameEn: {
        type: String,
        required: true,
        trim: true,
    },
    nameAr: {
        type: String,
        required: true,
        trim: true,
    },
    hasExpiry: {
        type: Boolean,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const DocumentType = mongoose.model("DocumentType", documentTypeSchema
);

module.exports = DocumentType;