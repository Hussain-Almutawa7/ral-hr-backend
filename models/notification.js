const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        required: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    link: {
        type: String,
        trim: true,
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    sourceType: {
        type: String,
        trim: true,
        default: null,
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    alertKey: {
        type: String,
        trim: true,
        default: undefined,
    },
}, { timestamps: true });

notificationSchema.index(
    { alertKey: 1 },
    { unique: true, sparse: true, }
);

notificationSchema.index({
    recipient: 1,
    createdAt: -1,
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;