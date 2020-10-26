const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const User = require("../model/User");

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
module.exports = router;
