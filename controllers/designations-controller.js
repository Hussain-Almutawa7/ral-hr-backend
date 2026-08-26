const Designation = require("../models/designation");
const createAuditLog = require("../utils/createAuditLog");
const escapeRegex = require("../utils/escapeRegex");

const index = async (req, res) => {
    try {
        const designations = await Designation.find()

        res.status(200).json(designations);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const create = async (req, res) => {
    try {
        if (!req.body.nameEn || req.body.nameEn.trim() === "") return res.status(400).json({ err: "English name is required" });

        const designationData = {
            nameEn: req.body.nameEn.trim(),
            nameAr: req.body.nameAr ? req.body.nameAr.trim() : null,
        }

        const namedConditions = [
            {
                nameEn: {
                    $regex: `^${escapeRegex(designationData.nameEn)}$`,
                    $options: "i",
                }
            }
        ]

        if (designationData.nameAr) namedConditions.push({ nameAr: designationData.nameAr });

        const foundDesignation = await Designation.findOne({
            $or: namedConditions,
        });

        if (foundDesignation) return res.status(409).json({ err: "Designation name already exist" });

        const createdDesignation = await Designation.create(designationData);

        const changes = [
            {
                fieldName: "nameEn",
                oldValue: null,
                newValue: createdDesignation.nameEn
            }
        ]

        if (createdDesignation.nameAr) {
            changes.push({
                fieldName: "nameAr",
                oldValue: null,
                newValue: createdDesignation.nameAr,
            });
        }

        await createAuditLog({
            tableName: "Designation",
            recordId: createdDesignation._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdDesignation);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentDesignation = await Designation.findById(req.params.designationId);
        
    } catch (e) {
        res.status(500).json({ err: e.message })
    }
}

module.exports = {
    index,
    create,
    update,
}