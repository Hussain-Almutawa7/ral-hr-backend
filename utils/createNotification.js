const Notification = require("../models/notification")

const createNotification = async ({ recipient, type, title, message, link = null, sourceType = null, sourceId = null }) => {
    await Notification.create({
        recipient,
        type,
        title,
        message,
        link,
        sourceType,
        sourceId,
    })
}

module.exports = createNotification