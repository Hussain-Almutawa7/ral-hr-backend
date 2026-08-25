const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const PORT = process.env.PORT || 3000;

const authCtrl = require("./controllers/auth-controller");
const userCtrl = require("./controllers/users-controller");

const verifyToken = require("./middleware/verify-token");

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ROUTES GO HERE
app.post("/auth/sign-in", authCtrl.signIn);
app.get("/users", verifyToken, userCtrl.index);

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connected to MongoDB ${mongoose.connection.name}. 🥭`);
        app.listen(PORT, () => {
            console.log(`The express app is ready on port ${PORT}! 😀`);
        });
    } catch (e) {
        console.log("Error Message:", e.message)
    }
}

startServer();
