const mongoose = require("mongoose");
const { Readable } = require("stream");

const getBucket = () => {
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "employeeDocuments" });
}

const uploadFile = file => {
    return new Promise((resolve, reject) => {
        const bucket = getBucket();

        const uploadStream = bucket.openUploadStream(file.originalname, {
            metadata: {
                contentType: file.mimetype,
            }
        });

        Readable.from(file.buffer)
            .pipe(uploadStream)
            .on("error", reject)
            .on("finish", () => {
                resolve(uploadStream.id);
            });
    });
}

module.exports = {
    getBucket,
    uploadFile,
};