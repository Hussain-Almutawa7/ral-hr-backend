const AuditLog = require("../models/auditLog")

const formatValue = value => {
    if (value === null || value === undefined) return "null";

    if (typeof value === "object") return JSON.stringify(value);

    return String(value);
}

const createAuditLog = async ({
    tableName,
    recordId,
    action,
    changedBy,
    changes,
    reason = null,
    ipAddress = null,
}) => {
    if (!changes || changes.length === 0) return;

    const auditLogs = changes.map((change) => ({
        tableName,
        recordId: recordId.toString(),
        action,
        changedBy,
        fieldName: change.fieldName,
        oldValue: formatValue(change.oldValue),
        newValue: formatValue(change.newValue),
        reason,
        ipAddress,
    }));

    await AuditLog.insertMany(auditLogs);
}

module.exports = createAuditLog;