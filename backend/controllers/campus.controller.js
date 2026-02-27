import CampusSettings from "../Models/CampusSettings.js";

// POST /api/campus — Create campus settings
export const createCampus = async (req, res) => {
    try {
        const existing = await CampusSettings.findOne();
        if (existing) {
            return res.status(400).json({ message: "Campus settings already exist. Use PUT to update." });
        }
        const campus = await CampusSettings.create({
            ...req.body,
            createdBy: req.user.id
        });
        res.status(201).json(campus);
    } catch (error) {
        console.error("Create campus error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/campus — Get campus settings
export const getCampus = async (req, res) => {
    try {
        const campus = await CampusSettings.findOne();
        if (!campus) {
            return res.status(404).json({ message: "Campus not configured yet" });
        }
        res.json(campus);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// PUT /api/campus — Update campus settings
export const updateCampus = async (req, res) => {
    try {
        const campus = await CampusSettings.findOneAndUpdate(
            {},
            req.body,
            { new: true, runValidators: true }
        );
        if (!campus) {
            return res.status(404).json({ message: "Campus not found" });
        }
        res.json(campus);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
