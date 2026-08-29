const Holiday = require("../models/holiday");
const HolidayList = require("../models/holidayList");

const index = async (req, res) => {
    try {
        const filter = {};

        if (req.query.holidayList !== undefined) {
            const holidayList = await HolidayList.findById(req.query.holidayList);

            if (!holidayList) return res.status(400).json({ err: "Invalid holiday list" });

            filter.holidayList = holidayList._id;
        }

        const holidays = await Holiday.find(filter)
            .populate("holidayList")
            .sort({ date: 1 });

        res.status(200).json(holidays);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
}