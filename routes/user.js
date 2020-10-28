const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

const User = require("../model/User");
const Room = require("../model/Room");

const isAuthenticated = require("../middleware/isAuthenticated");

router.post("/user/signup", async (req, res) => {
    try {
        const { email, password, username, name, description } = req.fields;

        const userEmail = await User.findOne({ email });
        const findUsername = await User.findOne({ username });

        if (userEmail) {
            res.status(400).json({
                error: "This email already has an account.",
            });
        }
        if (findUsername) {
            res.status(400).json({
                error: "This username already has an account.",
            });
        } else if (email && password && username && name && description) {
            const token = uid2(64);
            const salt = uid2(64);
            const hash = SHA256(password + salt).toString(encBase64);

            const newUser = new User({
                email,
                token,
                hash,
                salt,
                account: {
                    username,
                    name,
                    description,
                },
            });

            await newUser.save();
            res.json({
                _id: newUser._id,
                token: newUser.token,
                email: newUser.email,
                username: newUser.account.username,
                description: newUser.account.description,
                name: newUser.account.name,
            });

            res.status(200).send("user saved successfully");
        } else {
            res.status(400).json({
                error: "Missing parameters.",
            });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post("/user/login", async (req, res) => {
    try {
        const { email, password } = req.fields;
        if (email && password) {
            const user = await User.findOne({ email });
            if (!user) {
                res.status(400).json({ error: "Unauthorized" });
            } else if (
                SHA256(password + user.salt).toString(encBase64) === user.hash
            ) {
                res.json({
                    _id: user._id,
                    token: user.token,
                    email: user.email,
                    username: user.account.username,
                    description: user.account.description,
                    name: user.account.name,
                });
            }
            res.status(400).json({ error: "Unauthorized2" });
        } else {
            res.status(400).json({ error: "Missing parameters" });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put("/user/upload_picture/:id", isAuthenticated, async (req, res) => {
    if (req.params.id) {
        try {
            const user = await User.findById(req.params.id);
            if (user) {
                const result = await cloudinary.uploader.upload(
                    req.files.picture.path,
                    {
                        folder: `airbnb/profiles/${user._id}`,
                    }
                );
                user.account.photo = result;
                await user.save();
                res.status(200).json(user);
            } else {
                res.status(403).json({ message: "this user does not exist" });
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ error: "please select a user id" });
    }
});

router.delete("/user/delete_picture/:id", isAuthenticated, async (req, res) => {
    if (req.headers.authorization) {
        try {
            if (req.params.id) {
                const user = await User.findById(req.params.id);
                if (user) {
                    await cloudinary.api.delete_resources(
                        user.account.photo.public_id,
                        async (error, result) => {
                            console.log(result, error);
                        }
                    );
                    await cloudinary.api.delete_folder(
                        `airbnb/profiles/${user._id}`
                    );
                    user.account.photo = null;
                    user.save();
                    res.status(200).json("picture deleted");
                } else {
                    res.status(403).json({ error: error.message });
                }
            } else {
                res.status(403).json({ error: error.message });
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ error: "please select a user id" });
    }
});

router.get("/users/:id", async (req, res) => {
    if (req.params.id) {
        try {
            const user = await User.findById(req.params.id).select(
                "_id account rooms"
            );
            res.status(200).json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ message: "user does not exist" });
    }
});

router.get("/user/rooms/:id", async (req, res) => {
    if (req.params.id) {
        try {
            const user = await User.findById(req.params.id);
            if (user) {
                const userRooms = user.rooms;
                if (userRooms.length > 0) {
                    let tab = [];
                    for (let i = 0; i < userRooms.length; i++) {
                        const room = await Room.findById(userRooms[i]);
                        tab.push(room);
                    }
                    res.json(tab);
                } else {
                    res.status(200).json({ message: "This user has no room" });
                }
            } else {
                res.json({ message: "User not found" });
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ message: "user does not exist" });
    }
});
module.exports = router;
