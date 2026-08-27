const calculateRemainingBalance = (allocation) => {
    return (
        allocation.daysAllocated +
        allocation.daysCarriedForward -
        allocation.daysTaken
    )
}

module.exports = {
    calculateRemainingBalance,
}