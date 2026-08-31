const Notification = require('../models/notification')

const index = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })

        res.status(200).json(notifications)

    } catch (error) {
        return res.status(500).json({ err: error.message })
    }
}

const read = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.notificationId)
        if (!notification) {
            return res.status(404).json({ err: "Notification not found" })
        }

        if (!notification.recipient.equals(req.user._id)) {
            return res.status(403).json({ err: "Not authorized to update this notification" })
        }

        notification.isRead = true
        await notification.save()

        res.status(200).json(notification)

    } catch (error) {
        return res.status(500).json({ err: error.message })
    }
}

const readAll = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })

        for (let i = 0; i < notifications.length; i++) {
            const notification = notifications[i]
            notification.isRead = true
            await notification.save()
        }

        res.status(200).json(notifications)

    } catch (error) {
        return res.status(500).json({ err: error.message })
    }
}

module.exports = {
    index,
    read,
    readAll,
}