import express from "express";
import Story from "../models/Story.js";

const router = express.Router();

router.get("/all", async(req,res)=>{

    try{

        const stories = await Story.find();

        res.status(200).json(stories);

    }
    catch(err){

        res.status(500).json(err);

    }

});
router.get("/:id", async(req,res)=>{

    try{

        const story = await Story.findById(
            req.params.id
        );

        if(!story){

            return res.status(404).json({
                message:"Story not found"
            });

        }

        res.status(200).json(story);

    }
    catch(err){

        res.status(500).json({
            message:"Server Error"
        });

    }

});

router.post("/create", async(req,res)=>{

    try{

        const slug =
        req.body.title
        .toLowerCase()
        .replaceAll(" ","-")
        + "-"
        + Date.now();

        const story = new Story({
            ...req.body,
            slug
        });

        await story.save();

        res.status(201).json({
            message:"Story Created"
        });

    }
    catch(err){

        res.status(500).json(err);

    }

});

export default router;