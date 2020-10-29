const express = require("express");
const router = express.Router();
const User = require("../model/User");
const Room = require("../model/Room");
const isAuthenticated = require("../middleware/isAuthenticated");
const cloudinary = require("cloudinary").v2;

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

router.get("/rooms/around", async (req, res) => {
    const { latitude, longitude, distance } = req.query;
    if (latitude && longitude) {
        const maxDistance = distance ? distance : 2;
        try {
            const rooms = await Room.find({
                location: {
                    $near: [latitude, longitude],
                    $maxDistance: maxDistance,
                },
            });
            res.status(200).json(rooms);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ message: "missing latitude or longitude" });
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

router.get("/rooms", async (req, res) => {
    try {
        const { title, priceMin, priceMax, page, sort, limit } = req.query;
        if (title || priceMin || priceMax || page || sort || limit) {
            let pages = Number(page);
            if (page > 1) {
                pages = 1;
            } else {
                pages = Number(req.query.page);
            }
            const Limit = limit ? limit : 5;
            const searchByName = new RegExp(title, "i");

            const rooms = await Room.find({
                price: { $lte: priceMax ? priceMax : 100000000 },
                price: { $gte: priceMin ? priceMin : 0 },
                title: searchByName ? searchByName : null,
            })
                .sort({ price: sort ? 1 : null })
                .limit(Limit)
                .skip((pages - 1) * Limit);
            const count = await Room.countDocuments(rooms);

            res.status(200).json({ count: count, rooms: rooms });
        } else {
            const rooms = await Room.find();
            if (rooms && rooms.length > 20) {
                const maxRoom = 20;
                let randomRooms = [];

                for (let i = 0; i < maxRooms; i++) {
                    const randomNumber = Math.floor(
                        Math.random() * rooms.length
                    );

                    if (randomRooms.indexOf(rooms[randomNumber]) === -1) {
                        randomRooms.push(rooms[randomNumber]);
                    }
                }
                res.json(randomRooms);
            } else {
                res.json(rooms);
            }
        }
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
