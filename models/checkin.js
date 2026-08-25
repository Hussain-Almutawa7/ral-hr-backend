const mongoose = require("mongoose");

const checkinSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
    timestamp: {
        type: Date,
        required: true,
    },
    logType: {
        type: String,
        enum: ["IN", "OUT"],
        required: true,
    },
    source: {
        type: String,
        enum: [
            "Mobile App",
            "Web",
            "Biometric Device",
            "HR Entry",
        ],
        required: true,
    },
    deviceId: {
        type: String,
        trim: true,
        default: null,
    },
    latitude: {
        type: Number,
        default: null,
    },
    longitude: {
        type: Number,
        default: null,
    },
    attendance: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Attendance",
        default: null,
    },
}, {
    timestamps: {
        createdAt: true,
        updatedAt: false,
    }
});

checkinSchema.index({ employee: 1, timestamp: 1 });

const Checkin = mongoose.model("Checkin", checkinSchema);

module.exports = Checkin;