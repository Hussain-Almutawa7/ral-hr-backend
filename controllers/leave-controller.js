const Employee = require("../models/employee");
const LeaveType = require("../models/leaveType");
const LeaveAllocation = require("../models/leaveAllocation");
const LeaveRequest = require("../models/leaveRequest");

const HolidayList = require("../models/holidayList");
const Holiday = require("../models/holiday");

const StatutorySettings = require("../models/statutorySettings");

const Attendance = require("../models/attendance");

const createAuditLog = require("../utils/createAuditLog");

const { calculateRemainingBalance, calculateLeaveDays, getLeaveConsumption, isLeavePeriodLocked } = require("../utils/leaveCalculations")


const updatableFields = [
    "leaveTypeName", "leaveTypeNameAr", "maxDaysPerYear", "payFraction",
    "requiresServiceMonths", "requiresDocument", "carryForward", "maxCarryForward",
    "encashable", "countsTowardService", "oncePerLifetime", "includesHolidays",
    "genderRestriction", "nextLeaveType", "lawArticle", "usesProration"
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

        if (foundLeaveType.usesProration) {

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
            const teamMembers = await Employee.find({ reportsTo: employee })
            const teamMemberIds = teamMembers.map((teamMember) => teamMember._id)
            teamMemberIds.push(employee)

            leaveRequests = await LeaveRequest.find({ employee: { $in: teamMemberIds } })

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

const showRequest = async (req, res) => {
    try {
        const request = await LeaveRequest.findById(req.params.requestId)
            .populate("employee", "employeeCode nameEn nameAr reportsTo")
            .populate("leaveType")
            .populate("approver", "employeeCode nameEn nameAr")

        if (!request) {
            return res.status(404).json({ err: "Leave request not found" })
        }

        const { role, employee } = req.user

        if (HR_ROLES.includes(role)) {

        } else if (role === "Employee") {
            if (!request.employee.equals(employee)) {
                return res.status(403).json({ err: "Not authorized to view this request" })
            }
        } else if (role === "Manager") {
            const isOwnRequest = request.employee.equals(employee)
            const isTeamMember = request.employee.reportsTo && request.employee.reportsTo.equals(employee)

            if (!isOwnRequest && !isTeamMember) {
                return res.status(403).json({ err: "Not authorized to view this request" })
            }
        } else {
            return res.status(403).json({ err: "Not authorized to view this request" })
        }

        res.status(200).json(request)

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

        const { leaveType, fromDate, toDate, isHalfDay, halfDayDate, reason, documentFileId } = req.body

        const currentLeaveType = await LeaveType.findById(leaveType)
        if (!currentLeaveType) {
            return res.status(404).json({ err: "Leave type not found" })
        }

        if (!fromDate || !toDate) {
            return res.status(400).json({ err: "fromDate and toDate are required" })
        }

        if (new Date(fromDate) > new Date(toDate)) {
            return res.status(400).json({ err: "fromDate must be before or equal to toDate" })
        }

        const totalDays = await calculateLeaveDays(fromDate, toDate, requester.holidayList, isHalfDay, halfDayDate)

        const newRequest = await LeaveRequest.create({
            employee: requesterId,
            leaveType,
            fromDate,
            toDate,
            isHalfDay,
            halfDayDate,
            totalDays,
            reason,
            documentFileId,
            approver: requester.reportsTo,
            status: "Draft",
        })

        const requestFields = [
            "employee", "leaveType", "fromDate", "toDate", "isHalfDay", "halfDayDate", "totalDays", "reason"
        ]

        const changes = []

        for (let i = 0; i < requestFields.length; i++) {
            const field = requestFields[i]

            if (newRequest[field] !== null && newRequest[field] !== undefined) {
                changes.push({
                    fieldName: field,
                    oldValue: null,
                    newValue: newRequest[field],
                })
            }
        }

        await createAuditLog({
            tableName: "LeaveRequest",
            recordId: newRequest._id,
            action: "Create",
            changedBy: req.user._id,
            changes,
            ipAddress: req.ip,
        })

        res.status(201).json(newRequest)

    } catch (e) {
        res.status(400).json({ err: e.message })
    }
}

const submitRequest = async (req, res) => {
    try {
        const leaveRequest = await LeaveRequest.findById(req.params.requestId)
        if (!leaveRequest) {
            return res.status(404).json({ err: "Leave request not found" })
        }

        if (!leaveRequest.employee.equals(req.user.employee)) {
            return res.status(403).json({ err: "You are not allowed to submit this request" })
        }

        if (leaveRequest.status !== "Draft") {
            return res.status(400).json({ err: "Only a Draft request can be submitted" })
        }

        if (new Date(leaveRequest.fromDate) > new Date(leaveRequest.toDate)) {
            return res.status(400).json({ err: "fromDate must be before or equal to toDate" })
        }

        const overlappingRequest = await LeaveRequest.findOne({
            employee: leaveRequest.employee,
            _id: { $ne: leaveRequest._id },
            status: { $in: ["Approved", "Pending"] },
            fromDate: { $lte: leaveRequest.toDate },
            toDate: { $gte: leaveRequest.fromDate },
        })

        if (overlappingRequest) {
            return res.status(409).json({ err: "This request overlaps with an existing approved or pending leave request" })
        }

        const requester = await Employee.findById(leaveRequest.employee)
        if (!requester) {
            return res.status(404).json({ err: "Employee not found" })
        }

        let currentLeaveType = await LeaveType.findById(leaveRequest.leaveType)
        if (!currentLeaveType) {
            return res.status(404).json({ err: "Leave type not found" })
        }

        if (currentLeaveType.genderRestriction) {
            if (requester.gender !== currentLeaveType.genderRestriction) {
                return res.status(400).json({
                    err: "This leave type is restricted to " + currentLeaveType.genderRestriction + " employees.",
                })
            }
        }

        if (currentLeaveType.oncePerLifetime) {
            const previousRequest = await LeaveRequest.findOne({
                employee: leaveRequest.employee,
                leaveType: currentLeaveType._id,
                status: "Approved",
            })

            if (previousRequest) {
                return res.status(400).json({
                    err: "This leave type can only be taken once in a lifetime, and has already been used.",
                })
            }
        }

        if (currentLeaveType.maxLifeTimeUses) {
            const requests = await LeaveRequest.find({
                employee: leaveRequest.employee,
                leaveType: currentLeaveType._id,
                status: "Approved",
            })

            if (requests.length >= currentLeaveType.maxLifeTimeUses) {
                return res.status(400).json({
                    err: "This leave type can only be used " + currentLeaveType.maxLifeTimeUses + " times in a lifetime, and that limit has been reached.",
                })
            }
        }

        if (currentLeaveType.requiresServiceMonths) {
            const joinDate = new Date(requester.dateOfJoining)
            const leaveStartDate = new Date(leaveRequest.fromDate)

            const monthsOfService =
                (leaveStartDate.getFullYear() - joinDate.getFullYear()) * 12 +
                (leaveStartDate.getMonth() - joinDate.getMonth())

            if (monthsOfService < currentLeaveType.requiresServiceMonths) {
                return res.status(400).json({
                    err: "This leave type requires " + currentLeaveType.requiresServiceMonths + " months of service. Employee has " + monthsOfService + " months.",
                })
            }
        }

        if (currentLeaveType.requiresDocument && !leaveRequest.documentFileId) {
            return res.status(400).json({
                err: "This leave type requires a supporting document to be attached before submission.",
            })
        }

        const totalDays = await calculateLeaveDays(
            leaveRequest.fromDate,
            leaveRequest.toDate,
            requester.holidayList,
            leaveRequest.isHalfDay,
            leaveRequest.halfDayDate
        )

        const { breakdown, daysStillNeeded } = await getLeaveConsumption(
            leaveRequest.employee,
            currentLeaveType,
            totalDays,
            leaveRequest.fromDate
        )

        if (daysStillNeeded > 0) {
            const maxAvailable = totalDays - daysStillNeeded
            return res.status(400).json({
                err: "Insufficient balance. This request needs " + totalDays + " days but only " + maxAvailable + " are available.",
            })
        }

        const startingAllocation = await LeaveAllocation.findOne({
            employee: leaveRequest.employee,
            leaveType: leaveRequest.leaveType,
            periodStart: { $lte: leaveRequest.fromDate },
            periodEnd: { $gte: leaveRequest.fromDate },
        })

        leaveRequest.totalDays = totalDays
        leaveRequest.balanceAtRequest = startingAllocation ? calculateRemainingBalance(startingAllocation) : 0
        leaveRequest.status = "Pending"
        await leaveRequest.save()

        await createAuditLog({
            tableName: "LeaveRequest",
            recordId: leaveRequest._id,
            action: "Update",
            changedBy: req.user._id,
            changes: [{
                fieldName: "status",
                oldValue: "Draft",
                newValue: "Pending"
            }],
            ipAddress: req.ip,
        })

        res.status(200).json(leaveRequest)

    } catch (e) {
        res.status(400).json({ err: e.message })
    }
}

const reviewRequest = async (req, res) => {
    try {
        const leaveRequest = await LeaveRequest.findById(req.params.requestId)
        if (!leaveRequest) {
            return res.status(404).json({ err: "Leave request not found" })
        }

        const { role, employee } = req.user

        if (HR_ROLES.includes(role)) {

        } else if (role === "Manager") {
            if (!leaveRequest.approver.equals(employee)) {
                return res.status(403).json({ err: "Not authorized to review this request" })
            }

        } else {
            return res.status(403).json({ err: "Not authorized to review this request" })
        }

        const { decision, reason } = req.body

        if (!["Approved", "Rejected"].includes(decision)) {
            return res.status(400).json({ err: "decision must be either Approved or Rejected" })
        }

        if (leaveRequest.status !== "Pending") {
            return res.status(409).json({ err: "Only a Pending request can be reviewed" })
        }

        if (decision === "Rejected") {
            leaveRequest.status = "Rejected"
            leaveRequest.rejectionReason = reason
            await leaveRequest.save()

            await createAuditLog({
                tableName: "LeaveRequest",
                recordId: leaveRequest._id,
                action: "Update",
                changedBy: req.user._id,
                changes: [{
                    fieldName: "status",
                    oldValue: "Pending",
                    newValue: "Rejected"
                }],
                reason: reason,
                ipAddress: req.ip,
            })

            return res.status(200).json(leaveRequest)
        }

        if (decision === "Approved") {
            const requester = await Employee.findById(leaveRequest.employee)
            if (!requester) {
                return res.status(404).json({ err: "Employee not found" })
            }

            const startingLeaveType = await LeaveType.findById(leaveRequest.leaveType)
            if (!startingLeaveType) {
                return res.status(404).json({ err: "Leave type not found" })
            }

            const totalDays = await calculateLeaveDays(
                leaveRequest.fromDate,
                leaveRequest.toDate,
                requester.holidayList,
                leaveRequest.isHalfDay,
                leaveRequest.halfDayDate
            )

            const { breakdown, daysStillNeeded } = await getLeaveConsumption(
                leaveRequest.employee,
                startingLeaveType,
                totalDays,
                leaveRequest.fromDate
            )

            if (daysStillNeeded > 0) {
                const maxAvailable = totalDays - daysStillNeeded
                return res.status(400).json({
                    err: "Insufficient balance. This request needs " + totalDays + " days but only " + maxAvailable + " are available.",
                })
            }

            const settings = await StatutorySettings.findOne({ company: requester.company })
            const isLocked = isLeavePeriodLocked(leaveRequest.fromDate, settings)

            if (isLocked) {
                return res.status(409).json({ err: "Payroll period is locked" })
            }

            for (let i = 0; i < breakdown.length; i++) {
                const breakdownEntry = breakdown[i]

                const allocation = await LeaveAllocation.findById(breakdownEntry.allocation)
                if (!allocation) {
                    return res.status(404).json({ err: "Allocation not found during approval" })
                }

                const oldDaysTaken = allocation.daysTaken
                allocation.daysTaken = allocation.daysTaken + breakdownEntry.days
                await allocation.save()

                await createAuditLog({
                    tableName: "LeaveAllocation",
                    recordId: allocation._id,
                    action: "Update",
                    changedBy: req.user._id,
                    changes: [{
                        fieldName: "daysTaken",
                        oldValue: oldDaysTaken,
                        newValue: allocation.daysTaken,
                    }],
                    ipAddress: req.ip,
                })
            }

            leaveRequest.status = "Approved"
            leaveRequest.totalDays = totalDays
            await leaveRequest.save()

            await createAuditLog({
                tableName: "LeaveRequest",
                recordId: leaveRequest._id,
                action: "Update",
                changedBy: req.user._id,
                changes: [{
                    fieldName: "status",
                    oldValue: "Pending",
                    newValue: "Approved"
                }],
                ipAddress: req.ip,
            })

            return res.status(200).json(leaveRequest)
        }

        const currentDate = new Date(leaveRequest.fromDate)
        const endDate = new Date(leaveRequest.toDate)

        while (currentDate <= endDate) {
            const attendanceRecord = await Attendance.findOne({
                employee: leaveRequest.employee,
                date: currentDate,
            })

            if (attendanceRecord && !attendanceRecord.locked) {
                const isTheHalfDay = leaveRequest.isHalfDay && leaveRequest.halfDayDate &&
                    currentDate.toDateString() === new Date(leaveRequest.halfDayDate).toDateString()

                attendanceRecord.status = isTheHalfDay ? "Half Day" : "On Leave"
                attendanceRecord.leaveRequest = leaveRequest._id
                await attendanceRecord.save()
            }

            currentDate.setDate(currentDate.getDate() + 1)
        }

    } catch (e) {
        res.status(400).json({ err: e.message })
    }
}

const cancelRequest = async (req, res) => {
    try {
        const leaveRequest = await LeaveRequest.findById(req.params.requestId)
        if (!leaveRequest) {
            return res.status(404).json({ err: "Leave request not found" })
        }

        if (!leaveRequest.employee.equals(req.user.employee)) {
            return res.status(403).json({ err: "Not authorized to cancel this request" })
        }

        if (leaveRequest.status === "Draft" || leaveRequest.status === "Pending") {
            const oldStatus = leaveRequest.status
            leaveRequest.status = "Cancelled"
            await leaveRequest.save()

            await createAuditLog({
                tableName: "LeaveRequest",
                recordId: leaveRequest._id,
                action: "Update",
                changedBy: req.user._id,
                changes: [{
                    fieldName: "status",
                    oldValue: oldStatus,
                    newValue: "Cancelled"
                }],
                ipAddress: req.ip,
            })

            return res.status(200).json(leaveRequest)
        }

        if (leaveRequest.status === "Approved") {
            const { reason } = req.body

            if (!reason) {
                return res.status(400).json({ err: "A reason is required to cancel an approved leave request" })
            }

            const requester = await Employee.findById(leaveRequest.employee)
            if (!requester) {
                return res.status(404).json({ err: "Employee not found" })
            }

            const settings = await StatutorySettings.findOne({ company: requester.company })
            const isLocked = isLeavePeriodLocked(leaveRequest.fromDate, settings)

            if (isLocked) {
                return res.status(409).json({ err: "Payroll period is locked" })
            }

            const startingLeaveType = await LeaveType.findById(leaveRequest.leaveType)
            if (!startingLeaveType) {
                return res.status(404).json({ err: "Leave type not found" })
            }

            const { breakdown } = await getLeaveConsumption(
                leaveRequest.employee,
                startingLeaveType,
                leaveRequest.totalDays,
                leaveRequest.fromDate
            )

            for (let i = 0; i < breakdown.length; i++) {
                const breakdownEntry = breakdown[i]

                const allocation = await LeaveAllocation.findById(breakdownEntry.allocation)
                if (!allocation) {
                    return res.status(404).json({ err: "Allocation not found during cancellation" })
                }

                const oldDaysTaken = allocation.daysTaken
                const newDaysTaken = Math.max(0, allocation.daysTaken - breakdownEntry.days)

                allocation.daysTaken = newDaysTaken
                await allocation.save()

                await createAuditLog({
                    tableName: "LeaveAllocation",
                    recordId: allocation._id,
                    action: "Update",
                    changedBy: req.user._id,
                    changes: [{
                        fieldName: "daysTaken",
                        oldValue: oldDaysTaken,
                        newValue: newDaysTaken
                    }],
                    ipAddress: req.ip,
                })
            }

            const linkedAttendance = await Attendance.find({
                leaveRequest: leaveRequest._id,
                locked: false,
            })

            for (let i = 0; i < linkedAttendance.length; i++) {
                const attendanceRecord = linkedAttendance[i]

                attendanceRecord.leaveRequest = null
                await attendanceRecord.save()
            }

            leaveRequest.cancellationReason = cancellationReason
            leaveRequest.status = "Cancelled"
            await leaveRequest.save()

            await createAuditLog({
                tableName: "LeaveRequest",
                recordId: leaveRequest._id,
                action: "Update",
                changedBy: req.user._id,
                changes: [{
                    fieldName: "status",
                    oldValue: "Approved",
                    newValue: "Cancelled"
                }],
                ipAddress: req.ip,
            })

            return res.status(200).json(leaveRequest)
        }

        return res.status(409).json({ err: "This request cannot be cancelled from its current status" })

    } catch (e) {
        res.status(400).json({ err: e.message })
    }
}

const calendar = async (req, res) => {
    try {
        const { role, employee } = req.user

        let leaveRequests

        if (HR_ROLES.includes(role)) {
            leaveRequests = await LeaveRequest.find({ status: "Approved" })
                .populate("employee", "employeeCode nameEn nameAr")
                .populate("leaveType", "leaveTypeName leaveTypeNameAr")

        } else if (role === "Manager") {
            const teamMembers = await Employee.find({ reportsTo: employee })
            const teamMemberIds = teamMembers.map((teamMember) => teamMember._id)
            teamMemberIds.push(employee)

            leaveRequests = await LeaveRequest.find({
                status: "Approved",
                employee: { $in: teamMemberIds },
            })
                .populate("employee", "employeeCode nameEn nameAr")
                .populate("leaveType", "leaveTypeName leaveTypeNameAr")

        } else if (role === "Employee") {
            leaveRequests = await LeaveRequest.find({
                status: "Approved",
                employee: employee,
            })
                .populate("employee", "employeeCode nameEn nameAr")
                .populate("leaveType", "leaveTypeName leaveTypeNameAr")

        } else {
            return res.status(403).json({ err: "Not authorized to view the leave calendar" })
        }

        res.status(200).json(leaveRequests)

    } catch (e) {
        res.status(500).json({ err: e.message })
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
    showRequest,
    createRequest,
    submitRequest,
    reviewRequest,
    cancelRequest,
    calendar,
}
