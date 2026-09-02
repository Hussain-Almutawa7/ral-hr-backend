const Employee = require("../models/employee");
const LeaveRequest = require("../models/leaveRequest");
const EmployeeDocument = require("../models/employeeDocument");
const User = require("../models/user");

const index = async (req, res) => {
    try {
        const role = req.user.role;
        const employeeId = req.user.employee;

        let counts = {};

        if (role === "Employee") {
            const [pendingLeave, pendingDocuments, rejectedDocuments] = await Promise.all([
                LeaveRequest.countDocuments({
                    employee: employeeId,
                    status: "Pending"
                }),

                EmployeeDocument.countDocuments({
                    employee: employeeId,
                    status: "Pending",
                    isArchived: false
                }),

                EmployeeDocument.countDocuments({
                    employee: employeeId,
                    status: "Rejected",
                    isArchived: false
                })
            ]);

            counts = {
                pendingLeave,
                pendingDocuments,
                rejectedDocuments
            };
        }

        else if (role === "Manager") {
            const [teamMembers, pendingTeamLeave, pendingDocuments] = await Promise.all([
                Employee.countDocuments({
                    reportsTo: employeeId,
                    status: { $ne: "Left" }
                }),

                LeaveRequest.countDocuments({
                    approver: employeeId,
                    status: "Pending"
                }),

                EmployeeDocument.countDocuments({
                    employee: employeeId,
                    status: "Pending",
                    isArchived: false
                })
            ]);

            counts = {
                teamMembers,
                pendingTeamLeave,
                pendingDocuments
            };
        }

        else if (role === "HR Officer") {
            const [totalEmployees, activeEmployees, pendingLeave, pendingDocuments] = await Promise.all([
                Employee.countDocuments(),

                Employee.countDocuments({
                    status: "Active"
                }),

                LeaveRequest.countDocuments({
                    status: "Pending"
                }),

                EmployeeDocument.countDocuments({
                    status: "Pending",
                    isArchived: false
                })
            ]);

            counts = {
                totalEmployees,
                activeEmployees,
                pendingLeave,
                pendingDocuments
            };
        }

        else if (role === "HR Manager") {
            const [totalEmployees, activeEmployees, pendingLeave, pendingDocuments, totalUsers, inactiveUsers] = await Promise.all([
                Employee.countDocuments(),

                Employee.countDocuments({
                    status: "Active"
                }),

                LeaveRequest.countDocuments({
                    status: "Pending"
                }),

                EmployeeDocument.countDocuments({
                    status: "Pending",
                    isArchived: false
                }),

                User.countDocuments(),

                User.countDocuments({
                    isActive: false
                })
            ]);

            counts = {
                totalEmployees,
                activeEmployees,
                pendingLeave,
                pendingDocuments,
                totalUsers,
                inactiveUsers
            };
        }

        else if (role === "Owner/Finance") {
            const [totalEmployees, activeEmployees, employeesOnLeave] = await Promise.all([
                Employee.countDocuments(),

                Employee.countDocuments({
                    status: "Active"
                }),

                Employee.countDocuments({
                    status: "On Leave"
                })
            ]);

            counts = {
                totalEmployees,
                activeEmployees,
                employeesOnLeave
            };
        }

        res.status(200).json({ role, counts });

    } catch (e) {
        res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
}