const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: [
            "Employee",
            "Manager",
            "HR Officer",
            "HR Manager",
            "Owner/Finance",
        ],
        default: "Employee",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        unique: true,
    }

}, { timestamps: true });

userSchema.set("toJSON", {
    transform: (document, returnedObject) => {
        delete returnedObject.password
    }
});

const User = mongoose.model("User", userSchema);

module.exports = User;