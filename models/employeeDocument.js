const mongoose = require("mongoose");

const employeeDocumentSchema = new mongoose.Schema({
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    documentType: {
      type: String,
      required: true,
      trim: true,
    },
    documentNumber: {
      type: String,
      trim: true,
      default: null,
    },
    issueDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      required: true,
      default: "Pending",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedOn: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
      required: function () {
        return this.status === "Rejected";
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  }, { timestamps: true });

employeeDocumentSchema.index({ employee: 1, documentType: 1 });

const EmployeeDocument = mongoose.model("EmployeeDocument", employeeDocumentSchema);

module.exports = EmployeeDocument;