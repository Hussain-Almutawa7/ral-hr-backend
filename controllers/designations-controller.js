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

        if (foundDesignation) return res.status(409).json({ err: "Designation name already exists" });

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

        if (!currentDesignation) return res.status(404).json({ err: "Designation not found." });

        const hasNameEn = req.body.nameEn !== undefined;
        const hasNameAr = req.body.nameAr !== undefined;

        if (!hasNameEn && !hasNameAr) return res.status(400).json({ err: "No designation fields provided" });

        if (hasNameEn && req.body.nameEn.trim() === "") return res.status(400).json({ err: "English name cannot be empty" });

        const newNameEn = hasNameEn ? req.body.nameEn.trim() : currentDesignation.nameEn;
        const newNameAr = hasNameAr ? req.body.nameAr ? req.body.nameAr.trim() : null : currentDesignation.nameAr;

        const namedConditions = [
            {
                nameEn: {
                    $regex: `^${escapeRegex(newNameEn)}$`,
                    $options: "i",
                }
            }
        ]

        if (newNameAr) namedConditions.push({ nameAr: newNameAr });

        const duplicateDesignation = await Designation.findOne({
            _id: { $ne: currentDesignation._id },
            $or: namedConditions,
        });

        if (duplicateDesignation) return res.status(409).json({ err: "Designation name already exists" });

        const changes = []

        if (hasNameEn && currentDesignation.nameEn !== newNameEn) {
            changes.push({
                fieldName: "nameEn",
                oldValue: currentDesignation.nameEn,
                newValue: newNameEn,
            });

            currentDesignation.nameEn = newNameEn;
        }

        if (hasNameAr && currentDesignation.nameAr !== newNameAr) {
            changes.push({
                fieldName: "nameAr",
                oldValue: currentDesignation.nameAr,
                newValue: newNameAr,
            });

            currentDesignation.nameAr = newNameAr;
        }

        await currentDesignation.save();

        await createAuditLog({
            tableName: "Designation",
            recordId: currentDesignation._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentDesignation);
    } catch (e) {
        res.status(500).json({ err: e.message })
    }
}

const updateStatus = async (req, res) => {
    try {
        const currentDesignation = await Designation.findById(req.params.designationId);

        if (!currentDesignation) return res.status(404).json({ err: "Designation not found " });

        const isActive = req.body.isActive;

        if (typeof isActive !== "boolean") return res.status(400).json({ err: "isActive must be a boolean" });

        if (isActive === currentDesignation.isActive) return res.status(200).json(currentDesignation);

        const changes = [{
            fieldName: "isActive",
            oldValue: currentDesignation.isActive,
            newValue: isActive,
        }];

        currentDesignation.isActive = isActive;
        await currentDesignation.save();

        await createAuditLog({
            tableName: "Designation",
            recordId: currentDesignation._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        })

        res.status(200).json(currentDesignation);

    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    create,
    update,
    updateStatus,
}