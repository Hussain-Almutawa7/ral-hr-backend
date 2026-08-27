const multer = require("multer");

const storage = multer.memoryStorage();
const uploadDocument = multer({ storage });

module.exports = uploadDocument;
