const AttendanceCorrection = require("../models/attendanceCorrection");
const Attendance = require("../models/attendance");
const Employee = require("../models/employee");

const getBahrainDateTime = require("../utils/getBahrainDateTime");
const createAuditLog = require("../utils/createAuditLog");

const create = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.body.attendance);
        const employee = await Employee.findById(attendance.employee);

        if (!attendance) return res.status(404).json({ err: "Attendance not found." });
        if (attendance.locked) return res.status(400).json({ err: "Locked attendance cannot be changed." });

        if (!employee) return res.status(404).json({ err: "Employee not found." });
        if (!employee.reportsTo || !employee.reportsTo.equals(req.user.employee))
            return res.status(403).json({ err: "Employee is not your direct report." });

        if (req.body.reason === undefined) return res.status(400).json({ err: "Reason must be applied" });

        const correctionFields = [
            "requestedInTime",
            "requestedOutTime",
            "requestedStatus"
        ];

        const hasRequestedChange = correctionFields.some(field => req.body[field] !== undefined);
        if (!hasRequestedChange) return res.status(400).json({ err: "At least one correction value must be provided." });

        const existingAttendanceCorrection = await AttendanceCorrection.findOne({
            employee: attendance.employee,
            date: attendance.date,
            status: "Requested",
        });

        if (existingAttendanceCorrection) return res.status(409).json({ err: "A correction request already exists for this attendace" });

        const correctionData = {
            employee: attendance.employee,
            date: attendance.date,
            requestedBy: req.user._id,
            reason: req.body.reason,
            requestedInTime: req.body.requestedInTime,
            requestedOutTime: req.body.requestedOutTime,
            requestedStatus: req.body.requestedStatus,
        };

        const createdCorrection = await AttendanceCorrection.create(correctionData);

        res.status(201).json(createdCorrection);

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const correct = async (req, res) => {
    try {
        const correction = await AttendanceCorrection.findById(req.params.correctionId);
        if (!correction) return res.status(404).json({ err: "Correction request not found" });

        if (correct.status !== "Requested") return res.status(400).json({ err: "Only requested corrections is allowed" });

        const attendance = await Attendance.findOne({
            employee: correction.employee,
            date: correction.date,
        }).populate("shiftType");

        if (attendance.locked) return res.status(400).json({ err: "Locked attendace cannot be changed" });

        const originalValues = {
            inTime: attendance.inTime,
            outTime: attendance.outTime,
            status: attendance.status,
            workedHours: attendance.workedHours,
            isIncomplete: attendance.isIncomplete,
            isLateEntry: attendance.isLateEntry,
            isEarlyExit: attendance.isEarlyExit,
            overtimeHours: attendance.overtimeHours,
            overtimeApproved: attendance.overtimeApproved,
            overtimeStatus: attendance.overtimeStatus,
            isCorrected: attendance.isCorrected,
            correctedBy: attendance.correctedBy,
            correctionReason: attendance.correctionReason,
        };

        if (correction.requestedInTime !== null) attendance.inTime = correction.requestedInTime;
        if (correction.requestedOutTime !== null) attendance.outTime = correction.requestedOutTime;
        if (correction.requestedStatus !== null) attendance.status = correction.requestedStatus;

        if (attendance.inTime && attendance.outTime) {
            if (attendance.outTime <= attendance.inTime) return res.status(400).json({ err: "Clock out time must be after clock in." });

            const elapsedHours = (attendance.outTime - attendance.inTime) / (1000 * 60 * 60);
            const breakHours = attendance.shiftType.breakMinutes / 60;
            attendance.workedHours = Math.max(0, elapsedHours - breakHours);
            attendance.isIncomplete = false;

            const shiftStart = getBahrainDateTime(attendance.date, attendance.shiftType.startTime);
            const shiftEnd = getBahrainDateTime(attendance.date, attendance.shiftType.endTime);

            if (shiftEnd <= shiftStart) shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);

            const isHoliday = attendance.status === "Holiday" || attendance.status === "Weekly Off";

            if (isHoliday) {
                attendance.isLateEntry = false;
                attendance.isEarlyExit = false;

                if (attendance.shiftType.allowOvertime) {
                    attendance.overtimeHours = attendance.workedHours;
                } else {
                    attendance.overtimeHours = 0;
                }

            } else {
                const lateLimit = new Date(shiftStart.getTime() + attendance.shiftType.lateGraceMinutes * 60 * 1000);
                attendance.isLateEntry = attendance.shiftType.markLateEntry && attendance.inTime > lateLimit;

                const earlyExitLimit = new Date(shiftEnd.getTime() - attendance.shiftType.earlyExitGraceMinutes * 60 * 1000);

                attendance.isEarlyExit = attendance.shiftType.markEarlyExit && attendance.outTime < earlyExitLimit;

                if (attendance.shiftType.allowOvertime && attendance.outTime > shiftEnd)
                    attendance.overtimeHours = (attendance.outTime - shiftEnd) / (1000 * 60 * 60);
                else
                    attendance.overtimeHours = 0;


                if (correction.requestedStatus === null) {
                    if (attendance.workedHours < attendance.shiftType.absentHoursThreshold)
                        attendance.status = "Absent";
                    else if (attendance.workedHours < attendance.shiftType.halfDayHoursThreshold)
                        attendance.status = "Half Day";
                    else
                        attendance.status = "Present";
                }
            }

        } else {
            attendance.isIncomplete = true;
            attendance.workedHours = 0;
            attendance.isLateEntry = false;
            attendance.isEarlyExit = false;
            attendance.overtimeHours = 0;
        }

        if (originalValues.overtimeHours !== attendance.overtimeHours) {
            attendance.overtimeApproved = false;

            if (attendance.overtimeHours > 0)
                attendance.overtimeStatus = "Pending";
            else
                attendance.overtimeStatus = null;
        }

        attendance.isCorrected = true;
        attendance.correctedBy = req.user._id;
        attendance.correctionReason = correction.reason;

        const changes = [];

        for (const [fieldName, oldValue] of Object.entries(originalValues)) {
            if (attendance.isModified(fieldName)) {
                changes.push({
                    fieldName,
                    oldValue,
                    newValue: attendance[fieldName],
                });
            }
        }

        await attendance.save();

        correction.status = "Corrected by HR";
        correction.correctedBy = req.user._id;
        correction.correctedAt = new Date();

        await correction.save();

        await createAuditLog({
            tableName: "Attendance",
            recordId: attendance._id,
            action: "Correct",
            changedBy: req.user._id,
            changes,
            reason: correction.reason,
            ipAddress: req.ip,
        });

        return res.status(200).json({ attendance, correction, });
    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}

const approve = async (req, res) => {
    try {
        const correction = await AttendanceCorrection.findById(req.params.correctionId);

        if (!correction) return res.status(404).json({ err: "Correction request not found." });

        if (correction.status !== "Corrected by HR") return res.status(400).json({ err: "Only corrections completed by HR can be approved." });

        const employee = await Employee.findById(correction.employee);

        if (!employee) return res.status(404).json({ err: "Employee not found." });

        if (!employee.reportsTo || !employee.reportsTo.equals(req.user.employee))
            return res.status(403).json({ err: "Employee is not your direct report." });

        const oldStatus = correction.status;
        const oldApprovedBy = correction.approvedBy;
        const oldApprovedAt = correction.approvedAt;

        correction.status = "Approved";
        correction.approvedBy = req.user._id;
        correction.approvedAt = new Date();

        await correction.save();

        await createAuditLog({
            tableName: "AttendanceCorrection",
            recordId: correction._id,
            action: "Approve",
            changedBy: req.user._id,
            changes: [
                {
                    fieldName: "status",
                    oldValue: oldStatus,
                    newValue: correction.status,
                },
                {
                    fieldName: "approvedBy",
                    oldValue: oldApprovedBy,
                    newValue: correction.approvedBy,
                },
                {
                    fieldName: "approvedAt",
                    oldValue: oldApprovedAt,
                    newValue: correction.approvedAt,
                }
            ],
            ipAddress: req.ip,
        });

        res.status(200).json(correction);

    } catch (e) {
        if (e.name === "ValidationError" || e.name === "CastError")
            return res.status(400).json({ err: e.message });

        return res.status(500).json({ err: e.message });
    }
}
module.exports = {
    create,
    correct,
    approve,
}

