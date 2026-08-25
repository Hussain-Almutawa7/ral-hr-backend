const mongoose = require("mongoose");

const holidayListSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        default: null,
    },
    year: {
        type: Number,
        required: true,
    },
    weeklyOffDays: {
        type: [String],
        enum: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ],
        required: true,
        default: ["Friday", "Saturday"],
    },
}, { timestamps: true });

const HolidayList = mongoose.model("HolidayList", holidayListSchema);

module.exports = HolidayList;