const express = require("express");
const mongoose = require("mongoose");
const formidableMiddleware = require("express-formidable");
const cors = require("cors");
const helmet = require("helmet");
const cloudinary = require("cloudinary").v2;
require("dotenv").config;

const app = express();
app.use(helmet());
app.use(formidableMiddleware());
app.use(cors());

mongoose.connect("mongodb://localhost/airbnb-api", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
});
cloudinary.config({
    cloud_name: "malolebrin",
    api_key: "212971842325324", //ce sont bien mes données.
    api_secret: "79KqyVOwveSqV7PGkTcez9btus4",
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

app.listen(3000, () => {
    console.log("Server has started");
});
