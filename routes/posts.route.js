const router = require("express").Router();
const { Post, Tag } = require("../models/index.model");
const { FailSchema, StringField, BooleanField } = require("@fraserelliott/fail");
const inputValidation = require("../middleware/inputvalidation.middleware");
const auth = require("../middleware/auth.middleware");

// Define validation rules for posts
const postSchema = new FailSchema();
postSchema.add("title", new StringField().required().nonNull().maxLength(255));
postSchema.add("content", new StringField().required().nonNull());
postSchema.add("featured", new BooleanField().required().nonNull());
postSchema.add("repoLink", new StringField().required().nonNull());
// TODO: add ArrayField to FAIL, add .URL to StringField

// Route to create a new post
router.post("/", auth.validateToken, inputValidation.validate(postSchema), async (req, res) => {
    try {
        const { title, content, repoLink, featured, tags } = req.body;

        // Check tag validity
        const existingTags = await verifyTags(tags);
        if (!existingTags)
            return res.status(400).json({ error: "One or more tag IDs are invalid." });

        const post = await Post.create({ title, content, repoLink, featured });
        await post.addTags(existingTags);
        // update tags in return data
        await post.reload({
            include: [
                { model: Tag, as: "tags", attributes: ["id", "name"], through: { attributes: [] } }
            ]
        });
        res.status(201).json(post);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Error creating post." });
    }
});

// Route to get all posts
router.get("/", async (req, res) => {
    try {
        let where = {};
        if (req.query.featured)
            where.featured = (req.query.featured === "true");
        const include = {
            model: Tag,
            as: 'tags',
            attributes: ['name'],
            through: { attributes: [] }, // hide join table IDs
        }
        const tags = req.query.tags;
        if (tags) {
            // allow either &tags=1&tags=2 or &tags=1,2 to build the tag filter list
            const tagIds = Array.isArray(req.query.tags)
                ? req.query.tags.map(Number)
                : req.query.tags.split(',').map(Number);

            include.where = { id: { [Op.in]: tagIds } };
        }
        const posts = await Post.findAll({
            include,
            where
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Error retrieving posts." });
    }
});

// Route to get a single post
router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id, {
            include: {
                model: Tag,
                as: 'tags',
                attributes: ['name'],
                through: { attributes: [] }, // hide join table IDs
            }
        });
        if (!post)
            res.status(404).json({ error: "Post not found." });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "Error retrieving post." });
    }
});

// Route to update a post
router.put("/:id", auth.validateToken, inputValidation.validate(postSchema), async (req, res) => {
    try {
        const { title, content, repoLink, featured, tags } = req.body;
        const id = req.params.id;

        // Check tag validity
        const existingTags = await verifyTags(tags);
        if (!existingTags)
            return res.status(400).json({ error: "One or more tag IDs are invalid." });

        // Check post exists
        const post = await Post.findByPk(id);
        if (!post)
            return res.status(404).json({ error: "Post not found." });

        await post.update({ title, content, repoLink, featured });
        await post.setTags(existingTags);
        // update tags in return data
        await post.reload({
            include: [
                { model: Tag, as: "tags", attributes: ["id", "name"], through: { attributes: [] } }
            ]
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "Error updating post." });
    }
});

// Route to delete a post
router.delete("/:id", auth.validateToken, async (req, res) => {
    try {
        const id = req.params.id;

        // Check post exists
        const post = await Post.findByPk(id);
        if (!post)
            return res.status(404).json({ error: "Post not found." });

        post.destroy();
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ error: "Error updating post." });
    }
});

// Helper function used for checking tag IDs provided exist in the table for tags
async function verifyTags(tagIds) {
    const existingTags = await Tag.findAll({
        where: { id: tagIds }
    });

    return existingTags.length === tagIds.length ? existingTags : null;
}

module.exports = router;