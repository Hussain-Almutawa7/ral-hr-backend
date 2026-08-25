const LeaveRequest = require("../models/leaveRequest")
const Employee = require("../models/employee")
const LeaveType = require("../models/leaveType")
const LeaveAllocation = require("../models/leaveAllocation")

const create = async (req, res) => {
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
    create,
}
