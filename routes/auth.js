const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Product = require("../models/Product");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');


const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '475376767328-soku8p9dl739un1ggshsnfijo5bjcc3m.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);


//REGISTER
router.post("/register", async (req, res) => {
    const { email, password, username } = req.body;

    try {
        // check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ msg: "User already exists" });

        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // save user
        const newUser = new User({ email, password: hashedPassword, username });
        await newUser.save();

        res.status(201).json({ msg: "User created" });
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
});


// LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
        const token = jwt.sign({ email: user.email, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res
            .cookie("token", token, {
                httpOnly: false,         // protege contra acesso do JavaScript
                secure: process.env.NODE_ENV === "production", // só HTTPS em produção
                sameSite: "strict",     // evita CSRF
                maxAge: 3600000         // 1 hora
            })
            .json({ email: user.email, username: user.username });
    } catch (err) {
        res.status(500).json({ message: "Error logging in" });
    }
});


//LOGOUT
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "strict",
        secure: true, // use true em produção com HTTPS
    });
    res.json({ message: "Logged out successfully" });
});

router.get("/products", async (req, res) => {
    try {
        const products = await Product.find(); // busca todos os documentos da coleção
        console.log(products.price);
        res.json(products); // retorna como JSON
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//LOGIN GOOGLE OAUTH
router.post('/google', async (req, res) => {
    const { credential } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        const token = jwt.sign({ email, username: name, picture }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // true em produção com HTTPS
            sameSite: "Lax",
        }).json({ email, username: name, picture });

    } catch (err) {
        res.status(401).json({ error: "Token inválido" });
    }
});


//CHECK IF THE USER IS AUTHENTICATE WHEN REFRESH PAGE
router.get("/profile", (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Não autenticado" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        console.log(decoded);
        console.log(req);
        console.log(req.cookies);
        res.json({
            user: {
                email: decoded.email,
                username: decoded.username,
                picture: decoded.picture,
            },
        });
    } catch (err) {
        res.status(401).json({ message: "Token inválido" });
    }
});


module.exports = router;