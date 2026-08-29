const HolidayList = require("../models/holidayList");
const Company = require("../models/company");

const createAuditLog = require("../utils/createAuditLog");
const escapeRegex = require("../utils/escapeRegex");

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

const create = async (req, res) => {
    try {
        const company = await Company.findOne();

        if (!company) return res.status(400).json({ err: "Invalid Company" });

        if (typeof req.body.name !== "string" || req.body.name.trim() === "")
            return res.status(400).json({ err: "Holiday list name is required." });

        if (!Array.isArray(req.body.weeklyOffDays) || req.body.weeklyOffDays.length === 0)
            return res.status(400).json({ err: "weeklyOffDays must contain at least one day." });

        const duplicate = await HolidayList.findOne({
            company: company._id,
            year: req.body.year,
        });

        if (duplicate) return res.status(409).json({ err: "Holiday list for this company and year already exists" });

        const name = req.body.name.trim();

        const foundHolidayList = await HolidayList.findOne({
            name: {
                $regex: `^${escapeRegex(name)}$`,
                $options: "i",
            }
        });

        if (foundHolidayList) return res.status(409).json({ err: "Holiday list with this name already exists." });

        const holidayListData = {
            name,
            company: company._id,
            year: req.body.year,
            weeklyOffDays: req.body.weeklyOffDays,
        }

        const createdHolidayList = await HolidayList.create(holidayListData);

        const changes = [];

        for (const [fieldName, newValue] of Object.entries(holidayListData)) {
            if (newValue !== null && newValue !== undefined) {
                changes.push({
                    fieldName,
                    oldValue: null,
                    newValue,
                });
            }
        }

        await createAuditLog({
            tableName: "HolidayList",
            recordId: createdHolidayList._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdHolidayList);

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentHolidayList = await HolidayList.findById(req.params.holidayListId);

        if (!currentHolidayList) return res.status(404).json({ err: "Holiday list not found" });

        const allowedFields = [
            "name",
            "year",
            "weeklyOffDays",
        ];

        const hasAllowedField = allowedFields.some(field => req.body[field] !== undefined);
        if (!hasAllowedField) return res.status(400).json({ err: "No valid fields provided." });

        const hasHolidayListName = req.body.name !== undefined;

        if (hasHolidayListName && typeof req.body.name !== "string")
            return res.status(400).json({ err: "Holiday list name must be text." });

        if (hasHolidayListName && req.body.name.trim() === "")
            return res.status(400).json({ err: "Holiday list name cannot be empty." });

        if (req.body.weeklyOffDays !== undefined && (!Array.isArray(req.body.weeklyOffDays) || req.body.weeklyOffDays.length === 0))
            return res.status(400).json({ err: "weeklyOffDays must contain at least one day." });

        if (req.body.year !== undefined) {
            const duplicateCompany = await HolidayList.findOne({
                _id: { $ne: currentHolidayList._id },
                company: currentHolidayList.company,
                year: req.body.year,
            });

            if (duplicateCompany) return res.status(409).json({ err: "Holiday list for this company and year already exists" });
        }

        if (hasHolidayListName) {
            const newHolidayListName = req.body.name.trim();

            const duplicate = await HolidayList.findOne({
                _id: { $ne: currentHolidayList._id },
                name: {
                    $regex: `^${escapeRegex(newHolidayListName)}$`,
                    $options: "i",
                }
            });

            if (duplicate) return res.status(409).json({ err: "Holiday list with this name already exists." });
        }

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = currentHolidayList[field];
            let newValue = req.body[field];

            if (typeof newValue === "string") newValue = newValue.trim();

            currentHolidayList[field] = newValue

            if (currentHolidayList.isModified(field)) {
                changes.push({
                    fieldName: field,
                    oldValue,
                    newValue: currentHolidayList[field],
                });
            }
        }

        if (changes.length === 0) return res.status(200).json(currentHolidayList);
        await currentHolidayList.save();

        await createAuditLog({
            tableName: "HolidayList",
            recordId: currentHolidayList._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentHolidayList);

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    create,
    update,
}