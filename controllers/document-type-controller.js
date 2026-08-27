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
            code: req.body.code.trim()
        });

        if (foundDocumentType) return res.status(409).json({ err: "Code already exists" });

        const docTypeData = {
            code: req.body.code,
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

module.exports = {
    index,
    create,
}