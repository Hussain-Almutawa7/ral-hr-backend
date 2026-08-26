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

module.exports = {
    index,
    create,
}
