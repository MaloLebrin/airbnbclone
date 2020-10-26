const express = require("express");
const router = express.Router();
const User = require("../model/User");
const Room = require("../model/Room");
const isAuthenticated = require("../middleware/isAuthenticated");

router.post("/room/publish", isAuthenticated, async (req, res) => {
    const { title, description, price } = req.fields;
    const location = [req.fields.location.lat, req.fields.location.lng];
    if ((title && description && price, location)) {
        try {
            const newRoom = await new Room({
                title,
                description,
                price,
                location,
                user: req.user._id,
            });
            await newRoom.save();
            res.json(newRoom);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json("missing parametters");
    }
});
router.get("/rooms", async (req, res) => {
    try {
        const rooms = await Room.find().select(
            "_id photos location title price user"
        );
        res.status(200).json(rooms);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get("/rooms/:id", async (req, res) => {
    const id = req.params.id;
    if (id) {
        try {
            const room = await Room.findById(id).populate({
                path: "user",
                select: "account _id",
            });
            res.status(200).json(room);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ error: "please select a room id" });
    }
});
module.exports = router;
