const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
    holidayList: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HolidayList",
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    isConfirmed: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

holidaySchema.index(
    { holidayList: 1, date: 1 },
    { unique: true }
);

const Holiday = mongoose.model("Holiday", holidaySchema);

module.exports = Holiday;