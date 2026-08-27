const DocumentType = require("../models/documentType");
const createAuditLog = require("../utils/createAuditLog");

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

        const foundDocumentType = await DocumentType.findOne({
            code: req.body.code.trim().toLowerCase()
        });

        if (foundDocumentType) return res.status(409).json({ err: "Code already exists" });

        const docTypeData = {
            code: req.body.code.tirm().toLowerCase(),
            nameEn: req.body.nameEn.trim(),
            nameAr: req.body.nameAr ? req.body.nameAr.trim() : null,
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
            "isActive"
        ]

        const hasAllowedField = allowedFields.some(field => req.body[field] !== undefined);
        if (!hasAllowedField) return res.status(400).json({ err: "No valid fields provided." });

        if (req.body.code !== undefined) {
            const code = req.body.code.trim();

            if (code === "") return res.status(400).json({ err: "Code cannot be empty" });

            const duplicate = await DocumentType.findOne({
                code,
                _id: { $ne: foundDocumentType._id }
            });

            if (duplicate) return res.status(409).json({ err: "Code already exists" });
        }

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = foundDocumentType[field];
            let newValue = req.body[field];

            if (typeof newValue === "string") newValue = newValue.trim();

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

module.exports = {
    index,
    create,
    update,
}