import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async(req,res)=>{
    try{
        const {username,email,password}=req.body;

        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        res.status(201).json({
            message:"User Registered"
        });

    } catch(err){
        res.status(500).json(err);
    }
});

router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.password !== password) {
            return res.status(400).json({
                message: "Invalid Password"
            });
        }

        res.status(200).json({
            message: "Login Successful",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: err.message
        });

    }
});

export default router;