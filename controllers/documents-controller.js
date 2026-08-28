const EmployeeDocument = require("../models/employeeDocument");
const Employee = require("../models/employee");
const DocumentType = require("../models/documentType");
const StatutorySettings = require("../models/statutorySettings");

const createAuditLog = require("../utils/createAuditLog");
const { uploadFile } = require("../utils/gridfs");

const create = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ err: "Document file is required." });
        if (!req.body.documentType) return res.status(400).json({ err: "Document type is required." });

        let employeeId;

        if (req.user.role === "HR Officer" || req.user.role === "HR Manager") {
            if (!req.body.employee) return res.status(400).json({ err: "Employee is required." });

            employeeId = req.body.employee;
        } else {
            employeeId = req.user.employee;
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ err: "Employee not found" });

        const documentType = await DocumentType.findById(req.body.documentType);
        if (!documentType || !documentType.isActive) return res.status(400).json({ err: "Invalid or inactive document type." });

        const settings = await StatutorySettings.findOne();
        if (!settings) return res.status(500).json({ err: "Statutory settings not found." });

        const isHR = req.user.role === "HR Officer" || req.user.role === "HR Manager";

        if (!isHR && !settings.documents.employeeMayUpload)
            return res.status(403).json({ err: "Employee document upload is disabled" });

        if (documentType.hasExpiry && !req.body.expiryDate)
            return res.status(400).json({ err: "Expiry date is required for this document" });

        if (req.body.documentNumber !== undefined && typeof req.body.documentNumber !== "string")
            return res.status(400).json({ err: "Document number must be text" });

        const fieldId = await uploadFile(req.file);

        const documentData = {
            employee: employee._id,
            documentType: documentType._id,
            documentNumber: req.body.documentNumber ? req.body.documentNumber.trim() : null,
            issueDate: req.body.issueDate || null,
            expiryDate: documentType.hasExpiry ? req.body.expiryDate : null,
            fieldId,
            status: "Pending",
            uploadedBy: req.user._id,
        }

        const createdDocument = await EmployeeDocument.create(documentData);

        const changes = [];

        for (const [fieldName, newValue] of Object.entries(documentData)) {
            if (newValue !== null && newValue !== undefined) {
                changes.push({
                    fieldName,
                    oldValue: null,
                    newValue,
                });
            }
        }

        await createAuditLog({
            tableName: "EmployeeDocument",
            recordId: createdDocument._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(201).json(createdDocument);

    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const index = async (req, res) => {
    try {
        const isHR = req.user.role === "HR Manager" || req.user.role === "HR Officer";
        const filter = { isArchived: false };

        let documents;

        if (!isHR) filter.employee = req.user.employee;

        documents = await EmployeeDocument.find(filter)
            .populate("employee", "employeeCode nameEn nameAr")
            .populate("documentType", "code nameEn nameAr hasExpiry")
            .populate({
                path: "uploadedBy",
                select: "email role employee",
                populate: {
                    path: "employee",
                    select: "employeeCode nameEn nameAr"
                }
            })
            .populate({
                path: "verifiedBy",
                select: "email role employee",
                populate: {
                    path: "employee",
                    select: "employeeCode nameEn nameAr"
                }
            })

        res.status(200).json(documents);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    create,
    index,
}