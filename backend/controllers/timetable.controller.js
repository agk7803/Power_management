import Timetable from "../Models/Timetable.js";

export const createTimetableEntry = async (req, res) => {
    try {
        const entry = await Timetable.create(req.body);
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getTimetable = async (req, res) => {
    try {
        const entries = await Timetable.find().populate("classroomId", "classroomId name");
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getTimetableByClassroom = async (req, res) => {
    try {
        const entries = await Timetable.find({ classroomId: req.params.classroomId });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const updateTimetableEntry = async (req, res) => {
    try {
        const entry = await Timetable.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        );
        if (!entry) return res.status(404).json({ message: "Entry not found" });
        res.json(entry);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteTimetableEntry = async (req, res) => {
    try {
        const entry = await Timetable.findByIdAndDelete(req.params.id);
        if (!entry) return res.status(404).json({ message: "Entry not found" });
        res.json({ message: "Timetable entry deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
