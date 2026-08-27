const StatutorySettings = require("../models/statutorySettings");

const show = async (req, res) => {
    try {
        const foundSettings = await StatutorySettings.findOne();

        if (!foundSettings) return res.status(404).json({ err: "Settings not found" });

        res.status(200).json(foundSettings);
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }
}

const update = async (req, res) => {
    try {
        const currentSettings = await StatutorySettings.findOne();

        if (!currentSettings) return res.status(404).json({ err: "Settings not found" });

        const attendanceData = req.body.attendance;
    } catch (e) {
        return res.status(500).json({ err: e.message });
    }

}

module.exports = {
    show,
    update,
}