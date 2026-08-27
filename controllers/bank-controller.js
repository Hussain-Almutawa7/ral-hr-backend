const Bank = require("../models/bank");
const createAuditLog = require("../utils/createAuditLog");
const escapeRegex = require("../utils/escapeRegex");

const index = async (req, res) => {
    try {
        const banks = await Bank.find();

        res.status(200).json(banks);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const create = async (req, res) => {
    try {
        if (!req.body.nameEn || req.body.nameEn.trim() === "") return res.status(400).json({ err: "English name is required" });

        const bankData = {
            nameEn: req.body.nameEn.trim(),
            nameAr: req.body.nameAr ? req.body.nameAr.trim() : null,
        }

        const namedConditions = [
            {
                nameEn: {
                    $regex: `^${escapeRegex(bankData.nameEn)}$`,
                    $options: "i",
                }
            }
        ]

        if (bankData.nameAr) namedConditions.push({ nameAr: bankData.nameAr });

        const foundBank = await Bank.findOne({
            $or: namedConditions,
        });

        if (foundBank) return res.status(409).json({ err: "Bank name already exists" });

        const createdBank = await Bank.create(bankData);

        const changes = [
            {
                fieldName: "nameEn",
                oldValue: null,
                newValue: createdBank.nameEn,
            }
        ]

        if (createdBank.nameAr) {
            changes.push({
                fieldName: "nameAr",
                oldValue: null,
                newValue: createdBank.nameAr,
            });
        }

        await createAuditLog({
            tableName: "Bank",
            recordId: createdBank._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdBank);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentBank = await Bank.findById(req.params.bankId);

        if (!currentBank) return res.status(404).json({ err: "Bank not found." });

        const hasNameEn = req.body.nameEn !== undefined;
        const hasNameAr = req.body.nameAr !== undefined;

        if (!hasNameEn && !hasNameAr) return res.status(400).json({ err: "No bank fields provided" });

        if (hasNameEn && req.body.nameEn.trim() === "") return res.status(400).json({ err: "English name cannot be empty" });

        const newNameEn = hasNameEn ? req.body.nameEn.trim() : currentBank.nameEn;
        const newNameAr = hasNameAr ? req.body.nameAr ? req.body.nameAr.trim() : null : currentBank.nameAr;

        const namedConditions = [
            {
                nameEn: {
                    $regex: `^${escapeRegex(newNameEn)}$`,
                    $options: "i",
                }
            }
        ]

        if (newNameAr) namedConditions.push({ nameAr: newNameAr });

        const duplicateBank = await Bank.findOne({
            _id: { $ne: currentBank._id },
            $or: namedConditions,
        });

        if (duplicateBank) return res.status(409).json({ err: "Bank name already exists" });

        const changes = []

        if (hasNameEn && currentBank.nameEn !== newNameEn) {
            changes.push({
                fieldName: "nameEn",
                oldValue: currentBank.nameEn,
                newValue: newNameEn,
            });

            currentBank.nameEn = newNameEn;
        }

        if (hasNameAr && currentBank.nameAr !== newNameAr) {
            changes.push({
                fieldName: "nameAr",
                oldValue: currentBank.nameAr,
                newValue: newNameAr,
            });

            currentBank.nameAr = newNameAr;
        }

        await currentBank.save();

        await createAuditLog({
            tableName: "Bank",
            recordId: currentBank._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentBank);
    } catch (e) {
        res.status(500).json({ err: e.message })
    }
}

const updateStatus = async (req, res) => {
    try {
        const currentBank = await Bank.findById(req.params.bankId);

        if (!currentBank) return res.status(404).json({ err: "Bank not found " });

        const isActive = req.body.isActive;

        if (typeof isActive !== "boolean") return res.status(400).json({ err: "isActive must be a boolean" });

        if (isActive === currentBank.isActive) return res.status(200).json(currentBank);

        const changes = [{
            fieldName: "isActive",
            oldValue: currentBank.isActive,
            newValue: isActive,
        }];

        currentBank.isActive = isActive;
        await currentBank.save();

        await createAuditLog({
            tableName: "Bank",
            recordId: currentBank._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        })

        res.status(200).json(currentBank);

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
