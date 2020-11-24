const express = require("express");
const mongoose = require("mongoose");
const formidableMiddleware = require("express-formidable");
const cors = require("cors");
const helmet = require("helmet");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(formidableMiddleware());

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
});
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const userRoutes = require("./routes/user");
const roomRoutes = require("./routes/room");
app.use(userRoutes);
app.use(roomRoutes);

app.get("/", (req, res) => {
    res.send("Welcome to the Airbnb API.");
});

app.all("*", (req, res) => {
    res.status(404).json({ error: "Page not found" });
});

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server has started on port ${process.env.PORT}`);
});
