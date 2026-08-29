const HolidayList = require("../models/holidayList")
const Holiday = require("../models/holiday")
const LeaveType = require("../models/leaveType")
const LeaveAllocation = require("../models/leaveAllocation")

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const calculateRemainingBalance = (allocation) => {
    return (
        allocation.daysAllocated +
        allocation.daysCarriedForward -
        allocation.daysTaken
    )
}

const calculateLeaveDays = async (fromDate, toDate, holidayListId, isHalfDay, halfDayDate) => {
    const holidayList = await HolidayList.findById(holidayListId)

    const confirmedHolidays = await Holiday.find({
        holidayList: holidayListId,
        isConfirmed: true,
        date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    })

    const holidayDates = confirmedHolidays.map((holiday) => holiday.date.toDateString())

    let totalDays = 0
    const currentDate = new Date(fromDate)
    const endDate = new Date(toDate)

    while (currentDate <= endDate) {
        const dayName = dayNames[currentDate.getDay()]
        const isWeeklyOff = holidayList.weeklyOffDays.includes(dayName)
        const isHoliday = holidayDates.includes(currentDate.toDateString())

        if (!isWeeklyOff && !isHoliday) {
            if (isHalfDay && halfDayDate && currentDate.toDateString() === new Date(halfDayDate).toDateString()) {
                totalDays += 0.5
            } else {
                totalDays += 1
            }
        }

        currentDate.setDate(currentDate.getDate() + 1)
    }

    return totalDays
}

const getLeaveConsumption = async (employeeId, startingLeaveType, totalDays, fromDate) => {
    let currentLeaveType = startingLeaveType
    let daysStillNeeded = totalDays
    const breakdown = []

    while (currentLeaveType && daysStillNeeded > 0) {
        const allocation = await LeaveAllocation.findOne({
            employee: employeeId,
            leaveType: currentLeaveType._id,
            periodStart: { $lte: fromDate },
            periodEnd: { $gte: fromDate },
        })

        if (allocation) {
            const remaining = calculateRemainingBalance(allocation)
            const daysToTake = Math.min(daysStillNeeded, remaining)

            if (daysToTake > 0) {
                breakdown.push({
                    leaveType: currentLeaveType._id,
                    allocation: allocation._id,
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

    return { breakdown, daysStillNeeded }
}

module.exports = {
    calculateRemainingBalance,
    calculateLeaveDays,
    getLeaveConsumption,
}
