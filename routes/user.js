const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const mailgun = require("mailgun-js");
const API_KEY = process.env.MAILGUN_API_KEY;

const DOMAIN = process.env.MAILGUN_DOMAIN;

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

router.put("/user/update/:id", isAuthenticated, async (req, res) => {
    if (req.params.id) {
        try {
            const user = await User.findById(req.params.id);
            if (user) {
                const { username, email, description, name } = req.fields;
                const findByEmail = await User.findOne({
                    email: email,
                });
                const findByUsername = await User.findOne({
                    "account.username": username,
                });

                if (findByEmail || findByUsername) {
                    res.status(403).json({
                        message: "Username or Email already exist",
                    });
                } else {
                    user.account.username = username
                        ? username
                        : user.account.username;
                    user.account.name = name ? name : user.account.name;
                    user.account.description = description
                        ? description
                        : user.account.description;
                    user.email = email ? email : user.email;

                    user.save();
                    res.status(200).json({
                        _id: user._id,
                        email: user.email,
                        account: user.account,
                    });
                }
            } else {
                res.status(400).json("user does not exist");
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ message: "user does not exist" });
    }
});

router.put("/user/update_password", isAuthenticated, async (req, res) => {
    const { previousPassword, newPassword } = req.fields;
    if (previousPassword && newPassword) {
        try {
            const user = await User.findById(req.user._id);
            if (user) {
                if (
                    SHA256(previousPassword + user.salt).toString(encBase64) ===
                    user.hash
                ) {
                    const newHash = SHA256(newPassword + user.salt).toString(
                        encBase64
                    );
                    user.hash = newHash;
                    user.save();
                    const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });
                    const data = {
                        from: "Malo from Airbnb <me@" + DOMAIN + ">",
                        to: user.email, //"malolebrin@icloud.com"
                        subject: "Password successfully modified",
                        text: "Password successfully modified!", //attention voir avec le reacteur car api en phase de test
                    };
                    mg.messages().send(data, function (error, body) {
                        console.log(body);
                        console.log(error);
                    });

                    res.status(200).json({
                        message: "Password successfully modified",
                    });
                } else {
                    res.status(403).json({
                        message: "Invalid previous password",
                    });
                }
            } else {
                res.status(400).json({ error: "User not found" });
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ message: "previous and new password missing" });
    }
});

router.get("/user/recover_password/", async (req, res) => {
    if (req.fields.email) {
        try {
            const user = await User.findOne({ email: req.fields.email });
            if (user) {
                const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });
                const data = {
                    from: "Malo from Airbnb <me@" + DOMAIN + ">",
                    to: user.email, //"malolebrin@icloud.com"
                    subject: "Password successfully modified",
                    text: `Please, click on the following link to change your password : https://airbnb/change_password?token=${user.token}`, //attention voir avec le reacteur car api en phase de test
                };
                mg.messages().send(data, function (error, body) {
                    console.log(body);
                    console.log(error);
                });

                res.status(200).json({
                    message: "A link has been sent to the user",
                });
            } else {
                res.status(400).json({
                    message: "User not found with given email",
                });
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ message: "Email is required" });
    }
});

router.delete("/user/delete/:id", isAuthenticated, async (req, res) => {
    if (req.params.id) {
        try {
            const user = await User.findById(req.params.id);
            if (user && String(req.user._id) === String(req.params.id)) {
                const rooms = await Room.find({ user: req.params.id });

                for (let i = 0; i < rooms.length; i++) {
                    await Room.findByIdAndRemove(rooms[i]._id);
                }

                await User.findByIdAndRemove(req.params.id);

                res.status(200).json({ message: "User deleted" });
            } else {
                res.status(400).json({ error: "User not found" });
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    } else {
        res.status(400).json({ error: "Missing user id" });
    }
});
module.exports = router;
