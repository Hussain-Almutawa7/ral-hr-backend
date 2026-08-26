const Department = require("../models/department");
const Company = require("../models/company");
const createAuditLog = require("../utils/createAuditLog");
const escapeRegex = require("../utils/escapeRegex");
const { findByIdAndUpdate } = require("../models/user");

const index = async (req, res) => {
    try {
        const departments = await Department.find({
            isActive: true,
        });

        res.status(200).json(departments);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const create = async (req, res) => {
    try {
        const foundCompany = await Company.findOne();

        if (!req.body.nameEn || req.body.nameEn.trim() === "") return res.status(400).json({ err: "English name is required" });
        if (!foundCompany) return res.status(404).json({ err: "Company not found" });

        const deptData = {
            nameEn: req.body.nameEn.trim(),
            nameAr: req.body.nameAr ? req.body.nameAr.trim() : null,
            company: foundCompany._id
        }

        const namedConditions = [
            {
                nameEn: {
                    $regex: `^${escapeRegex(deptData.nameEn)}$`,
                    $options: "i"
                }
            }
        ];

        if (deptData.nameAr) namedConditions.push({ nameAr: deptData.nameAr });

        const foundDept = await Department.findOne({
            company: foundCompany._id,
            $or: namedConditions,
        });

        if (foundDept) return res.status(409).json({ err: "Department name already exists" });
        const createdDept = await Department.create(deptData);

        const changes = [
            {
                fieldName: "nameEn",
                oldValue: null,
                newValue: createdDept.nameEn,
            },
            {
                fieldName: "company",
                oldValue: null,
                newValue: createdDept.company,
            },
        ]

        if (createdDept.nameAr) {
            changes.push({
                fieldName: "nameAr",
                oldValue: null,
                newValue: createdDept.nameAr
            })
        }

        await createAuditLog({
            tableName: "Department",
            recordId: createdDept._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdDept);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentDept = await Department.findById(
            req.params.departmentId
        );

        if (!currentDept) return res.status(404).json({ err: "Department not found." });

        const hasNameEn = req.body.nameEn !== undefined;
        const hasNameAr = req.body.nameAr !== undefined;

        if (!hasNameEn && !hasNameAr) return res.status(400).json({ err: "No department fields provided." });
        if (hasNameEn && req.body.nameEn.trim() === "") return res.status(400).json({ err: "English name cannot be empty." });

        const newNameEn = hasNameEn ? req.body.nameEn.trim() : currentDept.nameEn;
        const newNameAr = hasNameAr ? req.body.nameAr.trim() || null : currentDept.nameAr;

        const namedConditions = [
            {
                nameEn: {
                    $regex: `^${escapeRegex(newNameEn)}$`,
                    $options: "i",
                },
            },
        ];

        if (newNameAr) namedConditions.push({ nameAr: newNameAr });

        const duplicateDept = await Department.findOne({
            _id: { $ne: currentDept._id },
            company: currentDept.company,
            $or: namedConditions,
        });

        if (duplicateDept) return res.status(409).json({ err: "Department name already exists." });

        const changes = [];

        if (hasNameEn && currentDept.nameEn !== newNameEn) {
            changes.push({
                fieldName: "nameEn",
                oldValue: currentDept.nameEn,
                newValue: newNameEn,
            });

            currentDept.nameEn = newNameEn;
        }

        if (hasNameAr && currentDept.nameAr !== newNameAr) {
            changes.push({
                fieldName: "nameAr",
                oldValue: currentDept.nameAr,
                newValue: newNameAr,
            });

            currentDept.nameAr = newNameAr;
        }

        await currentDept.save();

        await createAuditLog({
            tableName: "Department",
            recordId: currentDept._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(currentDept);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
};

const deactivate = async (req, res) => {

}

module.exports = {
    index,
    create,
    update,
    deactivate,
}