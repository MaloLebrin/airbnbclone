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
            const user = await User.findById(req.user._id);
            let tab = user.rooms;
            tab.push(newRoom._id);
            await User.findByIdAndUpdate(req.user._id, {
                rooms: tab,
            });
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

router.put("/room/update/:id", isAuthenticated, async (req, res) => {
    if (req.params.id) {
        try {
            const token = await req.headers.authorization.replace(
                "Bearer ",
                ""
            );

            const room = await Room.findById(req.params.id).populate("user");

            if (room.user.token === token) {
                const { price, title, description } = req.fields;
                const location = [
                    req.fields.location.lat,
                    req.fields.location.lng,
                ];

                if (price || title || description || location) {
                    room.price = price ? price : room.price;
                    room.title = title ? title : room.title;
                    room.description = description
                        ? description
                        : room.description;
                    room.location = location ? location : room.location;
                    await room.save();
                    const roomUpdated = await Room.findById(
                        req.params.id
                    ).select(
                        "photos location _id user title description price"
                    );

                    res.status(200).json(roomUpdated);
                } else {
                    res.status(400).json("missing parametters");
                }
            } else {
                res.status(400).json("token falsy");
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ error: "please select a room id" });
    }
});

router.delete("/room/delete/:id", isAuthenticated, async (req, res) => {
    if (req.params.id) {
        try {
            const token = await req.headers.authorization.replace(
                "Bearer ",
                ""
            );
            const room = await Room.findById(req.params.id).populate("user");
            if (room.user.token === token) {
                room.deleteOne();
                res.status(200).json("sucessfuly deleted");
            } else {
                res.status(400).json("token falsy");
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ error: "please select a room id" });
    }
});

// router.
module.exports = router;
