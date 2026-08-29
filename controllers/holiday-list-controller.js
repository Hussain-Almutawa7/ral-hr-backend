const HolidayList = require("../models/holidayList");

const index = async (req, res) => {
    try {
        const holidayLists = await HolidayList.find()
            .populate("company", "nameEn nameAr")
            .sort({ year: -1 });

        res.status(200).json(holidayLists);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
}