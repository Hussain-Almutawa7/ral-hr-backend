const Employee = require("../models/employee");
const Company = require("../models/company");
const Department = require("../models/department");
const Designation = require("../models/designation");
const Bank = require("../models/bank");
const HolidayList = require("../models/holidayList");
const ShiftType = require("../models/shiftType");

const createAuditLog = require("../utils/createAuditLog");

const index = async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate("department", "nameEn nameAr isActive")
            .populate("designation", "nameEn nameAr isActive")
            .populate("bankName", "nameEn nameAr isActive")
            .populate("reportsTo", "employeeCode nameEn nameAr");

        res.status(200).json(employees);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const show = async (req, res) => {
    try {
        const foundEmployee = await Employee.findById(req.params.employeeId)
            .populate("department", "nameEn nameAr isActive")
            .populate("designation", "nameEn nameAr isActive")
            .populate("bankName", "nameEn nameAr isActive")
            .populate("reportsTo", "employeeCode nameEn nameAr");

        if (!foundEmployee) return res.status(404).json({ err: "Employee not found" });

        res.status(200).json(foundEmployee);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const me = async (req, res) => {
    try {
        const foundEmployee = await Employee.findById(req.user.employee)
            .populate("department", "nameEn nameAr isActive")
            .populate("designation", "nameEn nameAr isActive")
            .populate("bankName", "nameEn nameAr isActive")
            .populate("reportsTo", "employeeCode nameEn nameAr");;

        if (!foundEmployee) return res.status(404).json({ err: "Employee not found" });

        res.status(200).json(foundEmployee);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}


const create = async (req, res) => {
    try {
        const foundCompany = await Company.findOne();

        if (!foundCompany) return res.status(404).json({ err: "Company not found." });

        const requiredFields = [
            "employeeCode",
            "nameEn",
            "nameAr",
            "cprNumber",
            "dateOfBirth",
            "gender",
            "nationality",
            "isBahraini",
            "workerCategory",
            "dateOfJoining",
            "employmentType",
            "status",
            "iban",
            "bankName",
            "mobile",
            "holidayList",
        ];

        for (const field of requiredFields) {
            const value = req.body[field];

            if (value === undefined || value === null || (typeof value === "string" && value.trim() === ""))
                return res.status(400).json({ err: `${field} is required` });
        }

        const foundEmployee = await Employee.findOne({
            $or: [
                { employeeCode: req.body.employeeCode.trim() },
                { cprNumber: req.body.cprNumber.trim() },
            ]
        });

        if (foundEmployee) return res.status(409).json({ err: "Employee with this employee code or CPR already exists." });

        let department = null;
        if (req.body.department) {
            department = await Department.findById(req.body.department);
            if (!department || !department.isActive) return res.status(400).json({ err: "Invalid or inactive department." });
        }

        let designation = null;
        if (req.body.designation) {
            designation = await Designation.findById(req.body.designation);
            if (!designation || !designation.isActive) return res.status(400).json({ err: "Invalid or inactive designation." });
        }

        const bank = await Bank.findById(req.body.bankName);
        if (!bank || !bank.isActive) return res.status(400).json({ err: "Invalid or inactive bank." });

        const holidayList = await HolidayList.findById(req.body.holidayList);
        if (!holidayList) return res.status(400).json({ err: "Invalid holiday list." });

        let shiftType = null;
        if (req.body.shiftType) {
            shiftType = await ShiftType.findById(req.body.shiftType);
            if (!shiftType) return res.status(400).json({ err: "Invalid shift type." })
        }

        let reportsTo = null;
        if (req.body.reportsTo) {
            reportsTo = await Employee.findById(req.body.reportsTo);
            if (!reportsTo) return res.status(400).json({ err: "Invalid reporting manager." });
        }

        const employeeData = {
            employeeCode: req.body.employeeCode.trim(),
            nameEn: req.body.nameEn.trim(),
            nameAr: req.body.nameAr.trim(),
            cprNumber: req.body.cprNumber.trim(),
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            nationality: req.body.nationality.trim(),
            isBahraini: req.body.isBahraini,
            workerCategory: req.body.workerCategory,
            company: foundCompany._id,
            department: department ? department._id : null,
            designation: designation ? designation._id : null,
            reportsTo: reportsTo ? reportsTo._id : null,
            dateOfJoining: req.body.dateOfJoining,
            probationEndDate: req.body.probationEndDate || null,
            employmentType: req.body.employmentType,
            status: req.body.status,
            dateOfLeaving: req.body.dateOfLeaving || null,
            iban: req.body.iban.trim(),
            bankName: bank._id,
            mobile: req.body.mobile.trim(),
            emailPersonal: req.body.emailPersonal ? req.body.emailPersonal.trim() : null,
            emailWork: req.body.emailWork ? req.body.emailWork.trim() : null,
            holidayList: holidayList._id,
            shiftType: shiftType ? shiftType._id : null,
        };

        const createdEmployee = await Employee.create(employeeData);

        const changes = [];

        for (const [fieldName, newValue] of Object.entries(employeeData)) {
            if (newValue !== null && newValue !== undefined) {
                changes.push({
                    fieldName,
                    oldValue: null,
                    newValue,
                });
            }
        }

        await createAuditLog({
            tableName: "Employee",
            recordId: createdEmployee._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdEmployee);

    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const foundEmployee = await Employee.findById(req.params.employeeId);

        if (!foundEmployee) return res.status(404).json({ err: "Employee not found." });

        const allowedFields = [
            "employeeCode",
            "nameEn",
            "nameAr",
            "cprNumber",
            "dateOfBirth",
            "gender",
            "nationality",
            "isBahraini",
            "workerCategory",
            "department",
            "designation",
            "reportsTo",
            "dateOfJoining",
            "probationEndDate",
            "employmentType",
            "iban",
            "bankName",
            "mobile",
            "emailPersonal",
            "emailWork",
            "holidayList",
            "shiftType",
        ];

        const hasAllowedField = allowedFields.some(field => req.body[field] !== undefined);
        if (!hasAllowedField) return res.status(400).json({ err: "No valid fields provided." });

        if (req.body.employeeCode !== undefined) {
            const employeeCode = req.body.employeeCode.trim();

            if (employeeCode === "") return res.status(400).json({ err: "Employee code cannot be empty." });

            const duplicate = await Employee.findOne({
                employeeCode,
                _id: { $ne: foundEmployee._id },
            });

            if (duplicate) return res.status(409).json({ err: "Employee code already exists." });
        }

        if (req.body.cprNumber !== undefined) {
            const cprNumber = req.body.cprNumber.trim();

            if (cprNumber === "") return res.status(400).json({ err: "CPR number cannot be empty." });

            const duplicate = await Employee.findOne({
                cprNumber,
                _id: { $ne: foundEmployee._id }
            });

            if (duplicate) return res.status(409).json({ err: "CPR number already exists." });
        }

        let department;

        if (req.body.department !== undefined) {
            if (req.body.department === null) {
                department = null;
            } else {
                department = await Department.findById(req.body.department);

                if (!department || !department.isActive) return res.status(400).json({ err: "Invalid or inactive department." });
            }
        }

        let designation;

        if (req.body.designation !== undefined) {
            if (req.body.designation === null) {
                designation = null;
            } else {
                designation = await Designation.findById(req.body.designation);

                if (!designation || !designation.isActive) return res.status(400).json({ err: "Invalid or inactive designation." });
            }
        }

        let bank;

        if (req.body.bankName !== undefined) {
            bank = await Bank.findById(req.body.bankName);

            if (!bank || !bank.isActive) return res.status(400).json({ err: "Invalid or inactive bank." });
        }

        let holidayList;

        if (req.body.holidayList !== undefined) {
            holidayList = await HolidayList.findById(req.body.holidayList);

            if (!holidayList) return res.status(400).json({ err: "Invalid holiday list." });
        }

        let shiftType;

        if (req.body.shiftType !== undefined) {
            if (req.body.shiftType === null) {
                shiftType = null;
            } else {
                shiftType = await ShiftType.findById(req.body.shiftType);

                if (!shiftType || !shiftType.isActive) return res.status(400).json({ err: "Invalid shift type." });
            }
        }

        let reportsTo;

        if (req.body.reportsTo !== undefined) {
            if (req.body.reportsTo === null) {
                reportsTo = null;
            } else {
                reportsTo = await Employee.findById(req.body.reportsTo);

                if (!reportsTo) return res.status(400).json({ err: "Invalid reporting manager." });

                if (reportsTo._id.equals(foundEmployee._id)) return res.status(400).json({ err: "Employee cannot report to themselves." });

                let currentManager = reportsTo;
                const visited = new Set();

                while (currentManager) {
                    if (currentManager._id.equals(foundEmployee._id)) return res.status(400).json({ err: "Invalid reporting hierarchy." });
                    if (visited.has(currentManager._id.toString())) return res.status(400).json({ err: "Reporting hierarchy inaccurate it has a loop" });

                    visited.add(currentManager._id.toString());

                    if (!currentManager.reportsTo) break;

                    currentManager = await Employee.findById(currentManager.reportsTo);
                }
            }
        }

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = foundEmployee[field];
            let newValue = req.body[field];

            if (field === "department") newValue = department ? department._id : null;
            if (field === "designation") newValue = designation ? designation._id : null;
            if (field === "bankName") newValue = bank._id;
            if (field === "holidayList") newValue = holidayList._id;
            if (field === "shiftType") newValue = shiftType ? shiftType._id : null;
            if (field === "reportsTo") newValue = reportsTo ? reportsTo._id : null;

            if (typeof newValue === "string") newValue = newValue.trim();

            foundEmployee[field] = newValue;

            if (foundEmployee.isModified(field)) {
                changes.push({
                    fieldName: field,
                    oldValue,
                    newValue: foundEmployee[field],
                })
            }
        }

        if (changes.length === 0) return res.status(200).json(foundEmployee);
        await foundEmployee.save();


        await createAuditLog({
            tableName: "Employee",
            recordId: foundEmployee._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(foundEmployee);

    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const updateMyContact = async (req, res) => {
    try {
        const foundEmployee = await Employee.findById(req.user.employee);
        if (!foundEmployee) return res.status(404).json({ err: "Employee not found." });

        const allowedFields = [
            "mobile",
            "emailPersonal",
        ]

        const hasAllowedField = allowedFields.some(field => req.body[field] !== undefined);
        if (!hasAllowedField) return res.status(400).json({ err: "No valid fields provided." });

        const changes = [];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            const oldValue = foundEmployee[field];
            let newValue = req.body[field];

            if (typeof newValue === "string") newValue = newValue.trim();

            foundEmployee[field] = newValue;

            if (foundEmployee.isModified(field)) {
                changes.push({
                    fieldName: field,
                    oldValue,
                    newValue: foundEmployee[field],
                })
            }

            if (changes.length === 0) return res.status(200).json(foundEmployee);
            await foundEmployee.save();


            await createAuditLog({
                tableName: "Employee",
                recordId: foundEmployee._id,
                action: "Update",
                changedBy: req.user._id,
                changes,
                ipAddress: req.ip,
            });

            res.status(200).json(foundEmployee)
        }
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    show,
    me,
    create,
    update,
    updateMyContact,
}
