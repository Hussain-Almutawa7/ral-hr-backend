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

module.exports = {
    index,
    show,
    me,
    create,
}