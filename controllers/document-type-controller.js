const DocumentType = require("../models/documentType");
const createAuditLog = require("../utils/createAuditLog");
const escapeRegex = require("../utils/escapeRegex");

const index = async (req, res) => {
    try {
        const filter = req.user.role === "HR Manager" ? {} : { isActive: true }
        const docTypes = await DocumentType.find(filter);

        res.status(200).json(docTypes);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const create = async (req, res) => {
    try {
        const requiredFields = [
            "code",
            "nameEn",
            "hasExpiry",
        ];

        for (const field of requiredFields) {
            const value = req.body[field];

            if (value === undefined || value === null || (typeof value === "string" && value.trim() === ""))
                return res.status(400).json({ err: `${field} is required` });
        }

        if (typeof req.body.code !== "string")
            return res.status(400).json({ err: "Code must be text." });

        if (typeof req.body.nameEn !== "string")
            return res.status(400).json({ err: "English name must be text." });

        if (req.body.nameAr !== undefined && req.body.nameAr !== null && typeof req.body.nameAr !== "string")
            return res.status(400).json({ err: "Arabic name must be text or null." });

        if (typeof req.body.hasExpiry !== "boolean")
            return res.status(400).json({ err: "hasExpiry must be a boolean." });

        const code = req.body.code.trim().toLowerCase();
        const nameEn = req.body.nameEn.trim();
        const nameAr = req.body.nameAr ? req.body.nameAr.trim() : null;

        const duplicateCondition = [
            { code },
            {
                nameEn: {
                    $regex: `^${escapeRegex(nameEn)}$`,
                    $options: "i",
                }
            }
        ]

        if (nameAr) duplicateCondition.push({ nameAr });

        const foundDocumentType = await DocumentType.findOne({
            $or: duplicateCondition,
        });

        if (foundDocumentType) return res.status(409).json({ err: "Document type with this code or name already exists." });

        const docTypeData = {
            code,
            nameEn,
            nameAr,
            hasExpiry: req.body.hasExpiry,
            isActive: true,
        }

        const createdDocType = await DocumentType.create(docTypeData);

        const changes = []

        for (const [fieldName, newValue] of Object.entries(docTypeData)) {
            if (newValue !== null && newValue !== undefined) {
                changes.push({
                    fieldName,
                    oldValue: null,
                    newValue,
                })
            }
        }

        await createAuditLog({
            tableName: "DocumentType",
            recordId: createdDocType._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdDocType);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const foundDocumentType = await DocumentType.findById(req.params.docTypeId);

        if (!foundDocumentType) return res.status(404).json({ err: "Document Type not Found" });

        const allowedFields = [
            "code",
            "nameEn",
            "nameAr",
            "hasExpiry",
        ]

        const hasAllowedField = allowedFields.some(field => req.body[field] !== undefined);
        if (!hasAllowedField) return res.status(400).json({ err: "No valid fields provided." });

        const hasCode = req.body.code !== undefined;
        const hasNameEn = req.body.nameEn !== undefined;
        const hasNameAr = req.body.nameAr !== undefined;

        if (hasCode && typeof req.body.code !== "string")
            return res.status(400).json({ err: "Code must be text." });

        if (hasNameEn && typeof req.body.nameEn !== "string")
            return res.status(400).json({ err: "English name must be text." });

        if (hasNameAr && req.body.nameAr !== null && typeof req.body.nameAr !== "string")
            return res.status(400).json({ err: "Arabic name must be text or null." });

        if (req.body.hasExpiry !== undefined && typeof req.body.hasExpiry !== "boolean")
            return res.status(400).json({ err: "hasExpiry must be a boolean." });

        if (hasCode && req.body.code.trim() === "")
            return res.status(400).json({ err: "Code cannot be empty" });

        if (hasNameEn && req.body.nameEn.trim() === "")
            return res.status(400).json({ err: "English name cannot be empty." });

        const newCode = hasCode ? req.body.code.trim().toLowerCase() : foundDocumentType.code;
        const newNameEn = hasNameEn ? req.body.nameEn.trim() : foundDocumentType.nameEn;
        const newNameAr = hasNameAr ? req.body.nameAr ? req.body.nameAr.trim() : null : foundDocumentType.nameAr;

        const duplicateConditions = [
            { code: newCode },
            {
                nameEn: {
                    $regex: `^${escapeRegex(newNameEn)}$`,
                    $options: "i",
                }
            }
        ]

        if (newNameAr) duplicateConditions.push({ nameAr: newNameAr });

        const duplicate = await DocumentType.findOne({
            _id: { $ne: foundDocumentType._id },
            $or: duplicateConditions,
        });

        if (duplicate) return res.status(409).json({ err: "Document type with this code or name already exists" });

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = foundDocumentType[field];
            let newValue = req.body[field];

            if (field === "code") newValue = newCode;
            if (field === "nameEn") newValue = newNameEn;
            if (field === "nameAr") newValue = newNameAr;

            foundDocumentType[field] = newValue;

            if (foundDocumentType.isModified(field)) {
                changes.push({
                    fieldName: field,
                    oldValue,
                    newValue: foundDocumentType[field],
                })
            }
        }

        if (changes.length === 0) return res.status(200).json(foundDocumentType);
        await foundDocumentType.save();

        await createAuditLog({
            tableName: "DocumentType",
            recordId: foundDocumentType._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(foundDocumentType);

    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const updateStatus = async (req, res) => {
    try {
        const currentDocumentType = await DocumentType.findById(req.params.docTypeId);

        if (!currentDocumentType) return res.status(404).json({ err: "Document type not found." });

        const isActive = req.body.isActive;

        if (typeof isActive !== "boolean") return res.status(400).json({ err: "isActive must be a boolean." });

        if (isActive === currentDocumentType.isActive) return res.status(200).json(currentDocumentType);

        const changes = [{
            fieldName: "isActive",
            oldValue: currentDocumentType.isActive,
            newValue: isActive,
        }]

        currentDocumentType.isActive = isActive;
        await currentDocumentType.save();

        await createAuditLog({
            tableName: "DocumentType",
            recordId: currentDocumentType._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentDocumentType);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    create,
    update,
    updateStatus,
}