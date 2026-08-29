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

const create = async (req, res) => {
    try {
        const holidayList = await HolidayList.findById(req.body.holidayList);

        if (!holidayList) return res.status(400).json({ err: "Holiday list not found" });

        if (req.body.date === undefined || req.body.date === null || req.body.date === "")
            return res.status(400).json({ err: "Date is required." });

        const date = new Date(req.body.date);

        if (isNaN(date.getTime())) return res.status(400).json({ err: "Invalid date provided" });

        date.setUTCHours(0, 0, 0, 0);

        if (date.getUTCFullYear() !== holidayList.year)
            return res.status(400).json({ err: "Holiday date must match the holiday list year" });

        const duplicate = await Holiday.findOne({
            holidayList: holidayList._id,
            date,
        });

        if (duplicate) return res.status(409).json({ err: "Holiday already exists on this date." });

        const holidayData = {
            holidayList: holidayList._id,
            date,
            description: req.body.description,
            isConfirmed: req.body.isConfirmed,
        }

        const createdHoliday = await Holiday.create(holidayData);

        const changes = [];

        for (const [fieldName, newValue] of Object.entries(holidayData)) {
            if (newValue !== null && newValue !== undefined) {
                changes.push({
                    fieldName,
                    oldValue: null,
                    newValue,
                });
            }
        }

        await createAuditLog({
            tableName: "Holiday",
            recordId: createdHoliday._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdHoliday);
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    create,
}