const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    tableName: {
        type: String,
        required: true,
        trim: true,
    },
    recordId: {
        type: String,
        required: true,
        trim: true,
    },
    action: {
        type: String,
        enum: [
            "Create",
            "Update",
            "Approve",
            "Cancel",
            "Correct",
            "Reject",
        ],
        required: true,
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    changedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    fieldName: {
        type: String,
        required: true,
        trim: true,
    },
    oldValue: {
        type: String,
        required: true,
    },
    newValue: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        trim: true,
        default: null,
    },
    ipAddress: {
        type: String,
        trim: true,
        default: null,
    },
});

auditLogSchema.index({ tableName: 1, recordId: 1 });
auditLogSchema.index({ changedBy: 1, changedAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;