const EmployeeDocument = require("../models/employeeDocument");
const Employee = require("../models/employee");
const DocumentType = require("../models/documentType");
const StatutorySettings = require("../models/statutorySettings");

const createAuditLog = require("../utils/createAuditLog");
const { uploadFile, getBucket } = require("../utils/gridfs");

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

const show = async (req, res) => {
    try {
        const isHR = req.user.role === "HR Manager" || req.user.role === "HR Officer";
        const filter = {
            _id: req.params.documentId,
            isArchived: false,
        };

        if (!isHR) filter.employee = req.user.employee;

        const foundDocument = await EmployeeDocument.findOne(filter)
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
            });

        if (!foundDocument) return res.status(404).json({ err: "Employee document not found." });

        res.status(200).json(foundDocument);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const download = async (req, res) => {
    try {
        const isHR = req.user.role === "HR Manager" || req.user.role === "HR Officer";
        const filter = {
            _id: req.params.documentId,
            isArchived: false,
        };

        if (!isHR) filter.employee = req.user.employee;

        const foundDocument = await EmployeeDocument.findOne(filter);
        if (!foundDocument) return res.status(404).json({ err: "Employee document not found." });

        const fileId = foundDocument.fileId;
        const bucket = getBucket();

        const files = await bucket.find({ _id: fileId }).toArray();
        if (files.length === 0) return res.status(404).json({ err: "File not found" });

        const file = files[0];

        res.set("Content-Type", file.metadata.contentType);
        res.set("Content-Disposition", `attachment; filename="${file.filename}"`);

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.on("error", e => {
            if (!res.headerSent) return res.status(500).json({ err: "Error downloading file." });

            res.destroy(e);
        });

        downloadStream.pipe(res);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const verify = async (req, res) => {
    try {
        const empDocument = await EmployeeDocument.findById(req.params.documentId);

        if (!empDocument || empDocument.isArchived) return res.status(404).json({ err: "Employee document not found" });

        if (empDocument.status !== "Pending") return res.status(400).json({ err: "Only pending documents can be verified." });

        const oldStatus = empDocument.status;
        const oldVerifiedBy = empDocument.verifiedBy;
        const oldVerifiedOn = empDocument.verifiedOn;

        empDocument.status = "Verified";
        empDocument.verifiedBy = req.user._id;
        empDocument.verifiedOn = new Date();
        empDocument.rejectionReason = null;

        const changes = [
            {
                fieldName: "status",
                oldValue: oldStatus,
                newValue: empDocument.status,
            },
            {
                fieldName: "verifiedBy",
                oldValue: oldVerifiedBy,
                newValue: empDocument.verifiedBy,
            },
            {
                fieldName: "verifiedOn",
                oldValue: oldVerifiedOn,
                newValue: empDocument.verifiedOn,
            },
        ];

        await empDocument.save();

        await createAuditLog({
            tableName: "EmployeeDocument",
            recordId: empDocument._id,
            action: "Approve",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(empDocument);

    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const reject = async (req, res) => {
    try {
        const empDocument = await EmployeeDocument.findById(req.params.documentId);

        if (!empDocument || empDocument.isArchived) return res.status(404).json({ err: "Employee document not found" });

        if (empDocument.status !== "Pending") return res.status(400).json({ err: "Only pending documents can be rejected." });

        if (typeof req.body.rejectionReason !== "string" || req.body.rejectionReason.trim() === "")
            return res.status(400).json({ err: "Rejection reason must be text." });

        const oldStatus = empDocument.status;
        const oldRejectionReason = empDocument.rejectionReason;

        empDocument.status = "Rejected";
        empDocument.rejectionReason = req.body.rejectionReason.trim();

        const changes = [
            {
                fieldName: "status",
                oldValue: oldStatus,
                newValue: empDocument.status,
            },
            {
                fieldName: "rejectionReason",
                oldValue: oldRejectionReason,
                newValue: empDocument.rejectionReason,
            }
        ];

        await empDocument.save();

        await createAuditLog({
            tableName: "EmployeeDocument",
            recordId: empDocument._id,
            action: "Reject",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(empDocument);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const archive = async (req, res) => {
    try {
        const empDocument = await EmployeeDocument.findById(req.params.documentId);

        if (!empDocument) return res.status(404).json({ err: "Employee document not found" });
        if (empDocument.isArchived) return res.status(200).json(empDocument);

        const oldArchive = empDocument.isArchived;
        const oldArchivedAt = empDocument.archivedAt;

        empDocument.isArchived = true;
        empDocument.archivedAt = new Date();

        const changes = [
            {
                fieldName: "isArchived",
                oldValue: oldArchive,
                newValue: empDocument.isArchived
            },
            {
                fieldName: "archivedAt",
                oldValue: oldArchivedAt,
                newValue: empDocument.archivedAt
            }
        ]

        await empDocument.save()

        await createAuditLog({
            tableName: "EmployeeDocument",
            recordId: empDocument._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        });

        res.status(200).json(empDocument);
    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

const archived = async (req, res) => {
    try {
        const documents = await EmployeeDocument.find({ isArchived: true })
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
    show,
    download,
    verify,
    reject,
    archive,
    archived,
}