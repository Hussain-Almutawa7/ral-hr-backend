const Employee = require("../models/employee");

const index = async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate("department", "nameEn nameAr isActive")
            .populate("designation", "nameEn nameAr isActive")
            .populate("bankName", "nameEn nameAr isActive")
            .populate("reportsTo", "employeeCode nameEn nameAr");

        res.status(200).json(employees);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const show = async (req, res) => {
    try {
        const foundEmployee = await Employee.findById(req.params.employeeId)
            .populate("department", "nameEn nameAr isActive")
            .populate("designation", "nameEn nameAr isActive")
            .populate("bankName", "nameEn nameAr isActive")
            .populate("reportsTo", "employeeCode nameEn nameAr");

        if (!foundEmployee) return res.status(404).json({ err: "Employee not found" });

        res.status(200).json(foundEmployee);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

module.exports = {
    index,
    show,
}