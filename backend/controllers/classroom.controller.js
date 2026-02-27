import Classroom from "../Models/Classroom.js";

export const createClassroom = async (req, res) => {
    try {
        const classroom = await Classroom.create(req.body);
        res.status(201).json(classroom);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Classroom ID already exists" });
        }
        res.status(500).json({ message: "Server error" });
    }
};

export const getClassrooms = async (req, res) => {
    try {
        const classrooms = await Classroom.find()
            .populate("floorId", "name floorNumber")
            .populate("deviceId", "deviceId status lastSeen");
        res.json(classrooms);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const updateClassroom = async (req, res) => {
    try {
        const classroom = await Classroom.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        );
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });
        res.json(classroom);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteClassroom = async (req, res) => {
    try {
        const classroom = await Classroom.findByIdAndDelete(req.params.id);
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });
        res.json({ message: "Classroom deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
