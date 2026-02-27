import Timetable from "../Models/Timetable.js";

const DAY_MAP = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };

export const createTimetableEntry = async (req, res) => {
    try {
        const data = { ...req.body };
        // Convert day name ("Monday") to dayOfWeek number (1) if needed
        if (data.day && data.dayOfWeek === undefined) {
            data.dayOfWeek = DAY_MAP[data.day];
            delete data.day;
        }
        const entry = await Timetable.create(data);
        res.status(201).json(entry);
    } catch (error) {
        console.error("Timetable create error:", error.message);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

export const getTimetable = async (req, res) => {
    try {
        const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const entries = await Timetable.find().populate("classroomId", "classroomId name").lean();
        // Add day name for frontend display
        const result = entries.map(e => ({ ...e, day: DAY_NAMES[e.dayOfWeek] || "Unknown" }));
        res.json(result);
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
