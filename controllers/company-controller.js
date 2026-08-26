const Company = require("../models/company");
const createAuditLog = require("../utils/createAuditLog");

const show = async (req, res) => {
    try {
        const foundCompany = await Company.findOne();

        if (!foundCompany) return res.status(404).json({ err: "Company not found" });

        res.status(200).json(foundCompany);

    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentCompany = await Company.findOne();

        if (!currentCompany) return res.status(404).json({ err: "Company not found." });

        const hasNameEn = req.body.nameEn !== undefined;
        const hasNameAr = req.body.nameAr !== undefined;
        const hasCrNumber = req.body.crNumber !== undefined;

        if (!hasNameEn && !hasNameAr && !hasCrNumber) return res.status(400).json({ err: "No company fields provided" });

        if (hasNameEn && req.body.nameEn.trim() === "") return res.status(400).json({ err: "English name cannot be empty" });

        if (hasCrNumber && req.body.crNumber.trim() === "") return res.status(400).json({ err: "CR Number cannot be empty" });

        const newNameEn = hasNameEn ? req.body.nameEn.trim() : currentCompany.nameEn;
        const newNameAr = hasNameAr ? req.body.nameAr ? req.body.nameAr.trim() : null : currentCompany.nameAr;
        const newCrNumber = hasCrNumber ? req.body.crNumber.trim() : currentCompany.crNumber;

        const changes = [];

        if (hasNameEn && currentCompany.nameEn !== newNameEn) {
            changes.push({
                fieldName: "nameEn",
                oldValue: currentCompany.nameEn,
                newValue: newNameEn,
            });

            currentCompany.nameEn = newNameEn;
        }

        if (hasNameAr && currentCompany.nameAr !== newNameAr) {
            changes.push({
                fieldName: "nameAr",
                oldValue: currentCompany.nameAr,
                newValue: newNameAr
            });

            currentCompany.nameAr = newNameAr;
        }

        if (hasCrNumber && currentCompany.crNumber !== newCrNumber) {
            changes.push({
                fieldName: "crNumber",
                oldValue: currentCompany.crNumber,
                newValue: newCrNumber,
            });

            currentCompany.crNumber = newCrNumber;
        }

        await currentCompany.save();

        await createAuditLog({
            tableName: "Company",
            recordId: currentCompany._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentCompany);
    } catch (e) {
        return res.status(500).json({ err: e.message })
    }
}

module.exports = {
    show,
    update,
}