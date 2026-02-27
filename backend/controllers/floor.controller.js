import Floor from "../Models/Floor.js";

export const createFloor = async (req, res) => {
    try {
        const floor = await Floor.create(req.body);
        res.status(201).json(floor);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getFloors = async (req, res) => {
    try {
        const floors = await Floor.find().populate("departmentId", "name");
        res.json(floors);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getFloorsByDepartment = async (req, res) => {
    try {
        const floors = await Floor.find({ departmentId: req.params.departmentId });
        res.json(floors);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteFloor = async (req, res) => {
    try {
        const floor = await Floor.findByIdAndDelete(req.params.id);
        if (!floor) return res.status(404).json({ message: "Floor not found" });
        res.json({ message: "Floor deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
