const Employee = require("../models/employee");
const LeaveType = require("../models/leaveType");
const LeaveAllocation = require("../models/leaveAllocation");
const LeaveRequest = require("../models/leaveRequest");

const HolidayList = require("../models/holidayList");
const Holiday = require("../models/holiday");

const StatutorySettings = require("../models/statutorySettings");

const Attendance = require("../models/attendance");

const createAuditLog = require("../utils/createAuditLog");

const { calculateRemainingBalance } = require("../utils/leaveCalculations")


const updatableFields = [
    "leaveTypeName", "leaveTypeNameAr", "maxDaysPerYear", "payFraction",
    "requiresServiceMonths", "requiresDocument", "carryForward", "maxCarryForward",
    "encashable", "countsTowardService", "oncePerLifetime", "includesHolidays",
    "genderRestriction", "nextLeaveType", "lawArticle"
]

const HR_ROLES = ["HR Officer", "HR Manager"]

const indexType = async (req, res) => {
    try {
        const leaveTypes = await LeaveType.find().populate("nextLeaveType")

        res.status(200).json(leaveTypes)

    } catch (error) {
        return res.status(500).json({ err: error.message })
    }
}

const createType = async (req, res) => {
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

const updateType = async (req, res) => {
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




const indexAllocations = async (req, res) => {
    try {
        const { role, employee } = req.user

        let allocations

        if (HR_ROLES.includes(role)) {
            allocations = await LeaveAllocation.find()

        } else if (role === "Manager") {
            const teamMembers = await Employee.find({ reportsTo: employee })
            const teamMemberIds = teamMembers.map((teamMember) => teamMember._id)
            teamMemberIds.push(employee) // manager's record

            allocations = await LeaveAllocation.find({ employee: { $in: teamMemberIds } })

        } else if (role === "Employee") {
            allocations = await LeaveAllocation.find({ employee: employee })

        } else {
            return res.status(403).json({ err: "Not authorized to view leave allocations" })
        }

        const allocationsWithRemaining = allocations.map((allocation) => {
            const remainingDays = calculateRemainingBalance(allocation)

            return {
                ...allocation._doc,
                remainingDays: remainingDays,
            }
        })

        res.status(200).json(allocationsWithRemaining)

    } catch (error) {
        return res.status(500).json({ err: error.message })
    }
}

const createAllocation = async (req, res) => {
    try {
        const { employee, leaveType, periodStart, periodEnd } = req.body

        const foundEmployee = await Employee.findById(employee)
        if (!foundEmployee) {
            return res.status(404).json({ err: "Employee not found" })
        }

        const foundLeaveType = await LeaveType.findById(leaveType)
        if (!foundLeaveType) {
            return res.status(404).json({ err: "Leave type not found" })
        }

        const existingAllocation = await LeaveAllocation.findOne({
            employee: employee,
            leaveType: leaveType,
            periodStart: periodStart,
            periodEnd: periodEnd,
        })

        if (existingAllocation) {
            return res.status(409).json({ err: "This allocation already exists" })
        }

        const joinDate = new Date(foundEmployee.dateOfJoining)
        const periodStartDate = new Date(periodStart)
        const periodEndDate = new Date(periodEnd)
        const today = new Date()

        const totalMonthsOfService =
            (today.getFullYear() - joinDate.getFullYear()) * 12 +
            (today.getMonth() - joinDate.getMonth())

        let daysAllocated

        if (foundLeaveType.encashable) {

            if (totalMonthsOfService >= 12) {
                daysAllocated = foundLeaveType.maxDaysPerYear

            } else {
                const effectiveStartDate = joinDate > periodStartDate ? joinDate : periodStartDate
                const countUpTo = today < periodEndDate ? today : periodEndDate

                const monthsAccrued =
                    (countUpTo.getFullYear() - effectiveStartDate.getFullYear()) * 12 +
                    (countUpTo.getMonth() - effectiveStartDate.getMonth())

                const totalMonthsInPeriod =
                    (periodEndDate.getFullYear() - periodStartDate.getFullYear()) * 12 +
                    (periodEndDate.getMonth() - periodStartDate.getMonth()) + 1

                daysAllocated = (monthsAccrued / totalMonthsInPeriod) * foundLeaveType.maxDaysPerYear
            }

        } else {
            daysAllocated = foundLeaveType.maxDaysPerYear
        }

        const newAllocation = await LeaveAllocation.create({
            employee: employee,
            leaveType: leaveType,
            periodStart: periodStart,
            periodEnd: periodEnd,
            daysAllocated: daysAllocated,
            daysCarriedForward: 0,
            daysTaken: 0,
        })

        const allocationFields = [
            "employee", "leaveType", "periodStart", "periodEnd",
            "daysAllocated", "daysCarriedForward", "daysTaken"
        ]

        const changes = []

        for (let i = 0; i < allocationFields.length; i++) {
            const field = allocationFields[i]

            if (newAllocation[field] !== null && newAllocation[field] !== undefined) {
                changes.push({
                    fieldName: field,
                    oldValue: null,
                    newValue: newAllocation[field],
                })
            }
        }

        await createAuditLog({
            tableName: "LeaveAllocation",
            recordId: newAllocation._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        })

        res.status(201).json(newAllocation)

    } catch (error) {
        return res.status(400).json({ err: error.message })
    }
}

const updatableAllocationFields = [
    "daysAllocated", "daysCarriedForward", "periodStart", "periodEnd"
]

const updateAllocation = async (req, res) => {
    try {
        const currentAllocation = await LeaveAllocation.findById(req.params.allocationId)
        if (!currentAllocation) {
            return res.status(404).json({ err: "Leave allocation not found" })
        }

        const changes = []

        const dateFields = ["periodStart", "periodEnd"]

        for (let i = 0; i < updatableAllocationFields.length; i++) {
            const field = updatableAllocationFields[i]

            const wasProvided = req.body[field] !== undefined
            if (!wasProvided) continue

            let currentValue = currentAllocation[field]
            let newValue = req.body[field]

            if (dateFields.includes(field)) {
                currentValue = new Date(currentValue).getTime()
                newValue = new Date(newValue).getTime()
            }

            if (currentValue !== newValue) {
                changes.push({
                    fieldName: field,
                    oldValue: currentAllocation[field],
                    newValue: req.body[field],
                })

                currentAllocation[field] = req.body[field]
            }
        }

        if (changes.length === 0) {
            return res.status(400).json({ err: "No changes provided" })
        }

        const periodChanged = changes.some((change) => change.fieldName === "periodStart" || change.fieldName === "periodEnd")

        if (periodChanged) {
            const duplicateAllocation = await LeaveAllocation.findOne({
                _id: { $ne: currentAllocation._id },
                employee: currentAllocation.employee,
                leaveType: currentAllocation.leaveType,
                periodStart: currentAllocation.periodStart,
                periodEnd: currentAllocation.periodEnd,
            })

            if (duplicateAllocation) {
                return res.status(409).json({ err: "An allocation already exists for this employee, leave type, and period" })
            }
        }

        await currentAllocation.save()

        await createAuditLog({
            tableName: "LeaveAllocation",
            recordId: currentAllocation._id,
            action: "Update",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        })

        res.status(200).json(currentAllocation)

    } catch (error) {
        return res.status(400).json({ err: error.message })
    }
}



const indexRequest = async (req, res) => {
    try {
        const { role, employee } = req.user

        let leaveRequests

        if (HR_ROLES.includes(role)) {
            leaveRequests = await LeaveRequest.find()

        } else if (role === "Manager") {
            leaveRequests = await LeaveRequest.find({ approver: employee })

        } else if (role === "Employee") {
            leaveRequests = await LeaveRequest.find({ employee: employee })

        } else {
            return res.status(403).json({ err: "Not authorized to view leave requests" })
        }

        res.status(200).json(leaveRequests)

    } catch (e) {
        res.status(500).json({ err: e.message })
    }
}

const createRequest = async (req, res) => {
    try {
        const { employee: requesterId } = req.user

        const requester = await Employee.findById(requesterId)
        if (!requester) {
            return res.status(404).json({ err: "Employee not found" })
        }

        if (!requester.reportsTo) {
            return res.status(400).json({ err: "Employee has no manager assigned to approve leave" })
        }

        const { leaveType, fromDate, toDate, isHalfDay, halfDayDate, totalDays, reason } = req.body

        if (!totalDays || totalDays <= 0) {
            return res.status(400).json({ err: "totalDays must be a positive number" });
        }

        let currentLeaveType = await LeaveType.findById(leaveType)
        if (!currentLeaveType) {
            return res.status(404).json({ err: "Leave type not found" })
        }

        if (currentLeaveType.genderRestriction) {
            if (requester.gender !== currentLeaveType.genderRestriction) {
                return res.status(400).json({
                    err: "This leave type is restricted to " + currentLeaveType.genderRestriction + " employees.",
                });
            }
        }

        if (currentLeaveType.oncePerLifetime) {
            const previousRequest = await LeaveRequest.findOne({
                employee: requesterId,
                leaveType: currentLeaveType._id,
                status: "Approved",
            });

            if (previousRequest) {
                return res.status(400).json({
                    err: "This leave type can only be taken once in a lifetime, and has already been used.",
                });
            }
        }

        if (currentLeaveType.maxLifeTimeUses) {
            const requests = await LeaveRequest.find({
                employee: requesterId,
                leaveType: currentLeaveType._id,
                status: "Approved",
            })

            if (requests.length >= currentLeaveType.maxLifeTimeUses) {
                return res.status(400).json({
                    err: "This leave type can only be used " + currentLeaveType.maxLifeTimeUses + " times in a lifetime, and that limit has been reached.",
                });
            }
        }

        if (currentLeaveType.requiresServiceMonths) {
            const joinDate = new Date(requester.dateOfJoining);
            const leaveStartDate = new Date(fromDate);

            const monthsOfService =
                (leaveStartDate.getFullYear() - joinDate.getFullYear()) * 12 +
                (leaveStartDate.getMonth() - joinDate.getMonth());

            if (monthsOfService < currentLeaveType.requiresServiceMonths) {
                return res.status(400).json({
                    err: "This leave type requires " + currentLeaveType.requiresServiceMonths + " months of service. Employee has " + monthsOfService + " months.",
                });
            }
        }

        let daysStillNeeded = totalDays
        const breakdown = []

        while (currentLeaveType && daysStillNeeded > 0) {
            const allocation = await LeaveAllocation.findOne({
                employee: requesterId,
                leaveType: currentLeaveType._id,
                periodStart: { $lte: fromDate },
                periodEnd: { $gte: fromDate },
            })

            if (allocation) {
                const remaining = allocation.daysAllocated + allocation.daysCarriedForward - allocation.daysTaken
                const daysToTake = Math.min(daysStillNeeded, remaining)

                if (daysToTake > 0) {
                    breakdown.push({
                        leaveType: currentLeaveType._id,
                        days: daysToTake,
                    })
                    daysStillNeeded = daysStillNeeded - daysToTake
                }
            }

            if (currentLeaveType.nextLeaveType) {
                currentLeaveType = await LeaveType.findById(currentLeaveType.nextLeaveType)
            } else {
                currentLeaveType = null
            }
        }

        if (daysStillNeeded > 0) {
            const maxAvailable = totalDays - daysStillNeeded
            return res.status(400).json({
                err: "Insufficient balance. You requested " + totalDays + " days but only " + maxAvailable + " days are available.",
            })
        }

        const createdRequests = []

        for (let i = 0; i < breakdown.length; i++) {
            const breakdownEntry = breakdown[i]

            const newRequest = await LeaveRequest.create({
                employee: requesterId,
                leaveType: breakdownEntry.leaveType,
                fromDate: fromDate,
                toDate: toDate,
                isHalfDay: isHalfDay,
                halfDayDate: halfDayDate,
                totalDays: breakdownEntry.days,
                reason: reason,
                approver: requester.reportsTo,
                status: "Pending",
                balanceAtRequest: breakdownEntry.days,
            })

            createdRequests.push(newRequest)
        }

        res.status(201).json(createdRequests)

    } catch (e) {
        res.status(400).json({ err: e.message })
    }
}

module.exports = {
    indexType,
    createType,
    updateType,
    indexAllocations,
    createAllocation,
    updateAllocation,
    indexRequest,
    createRequest,
}
