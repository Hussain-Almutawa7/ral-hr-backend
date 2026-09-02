const AuditLog = require("../models/auditLog");

const index = async (req, res) => {
    try {
        const filter = {};

        if (req.query.tableName) filter.tableName = req.query.tableName;
        if (req.query.action) filter.action = req.query.action;

        const auditLogs = await AuditLog.find(filter)
            .populate("changedBy", "email role")
            .sort({ changedAt: -1 });

        res.status(200).json(auditLogs);

    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
};

module.exports = {
    index,
}