const Employee = require("../models/employee")
const LeaveType = require("../models/leaveType")
const LeaveRequest = require("../models/leaveRequest")
const createAuditLog = require("../utils/createAuditLog")


const updatableFields = [
    "leaveTypeName", "leaveTypeNameAr", "maxDaysPerYear", "payFraction",
    "requiresServiceMonths", "requiresDocument", "carryForward", "maxCarryForward",
    "encashable", "countsTowardService", "oncePerLifetime", "includesHolidays",
    "genderRestriction", "nextLeaveType", "lawArticle"
]

const index = async (req, res) => {
    try {
        const { employee: requesterId } = req.user

        const requester = await Employee.findById(requesterId)
        if (!requester) {
            return res.status(404).json({ err: "Employee not found" })
        }

        const leaveTypes = await LeaveType.find()
        const eligibleLeaveTypes = []

        for (let i = 0; i < leaveTypes.length; i++) {
            const leaveType = leaveTypes[i]

            if ((leaveType.genderRestriction) && (requester.gender !== leaveType.genderRestriction)) {
                continue
            }

            if (leaveType.requiresServiceMonths) {
                const joinDate = new Date(requester.dateOfJoining)
                const today = new Date()
                const monthsOfService =
                    (today.getFullYear() - joinDate.getFullYear()) * 12 +
                    (today.getMonth() - joinDate.getMonth())

                if (monthsOfService < leaveType.requiresServiceMonths) {
                    continue
                }
            }

            if (leaveType.oncePerLifetime) {
                const previousRequest = await LeaveRequest.findOne({
                    employee: requesterId,
                    leaveType: leaveType._id,
                    status: "Approved",
                })

                if (previousRequest) {
                    continue
                }
            }

            eligibleLeaveTypes.push(leaveType)
        }

        res.status(200).json(eligibleLeaveTypes)

    } catch (error) {
        return res.status(500).json({ err: error.message })
    }
}

const create = async (req, res) => {
    try {
        const leaveType = await LeaveType.create(req.body)

        const changes = []

        for (let i = 0; i < updatableFields.length; i++) {
            const field = updatableFields[i]

            if (leaveType[field] !== null && leaveType[field] !== undefined) {
                changes.push({
                    fieldName: field,
                    oldValue: null,
                    newValue: leaveType[field],
                })
            }
        }

        await createAuditLog({
            tableName: "LeaveType",
            recordId: leaveType._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        })

        res.status(201).json(leaveType)
    } catch (error) {
        return res.status(400).json({ err: error.message })
    }
}

const update = async (req, res) => {
    try {
        const currentLeaveType = await LeaveType.findById(req.params.leaveTypeId)
        if (!currentLeaveType) {
            return res.status(404).json({ err: "Leave type not found" })
        }

        const changes = []

        for (let i = 0; i < updatableFields.length; i++) {
            const field = updatableFields[i]

            const wasProvided = req.body[field] !== undefined

            if (wasProvided && currentLeaveType[field] !== req.body[field]) {
                changes.push({
                    fieldName: field,
                    oldValue: currentLeaveType[field],
                    newValue: req.body[field],
                })

                currentLeaveType[field] = req.body[field]
            }
        }

        if (changes.length === 0) {
            return res.status(400).json({ err: "No changes provided" })
        }

        await currentLeaveType.save()

        await createAuditLog({
            tableName: "LeaveType",
            recordId: currentLeaveType._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        })

        res.status(200).json(currentLeaveType)

    } catch (error) {
        return res.status(400).json({ err: error.message })
    }
}

module.exports = {
    index,
    create,
    update,
}
