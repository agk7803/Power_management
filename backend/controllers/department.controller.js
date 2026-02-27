import Department from "../Models/Department.js";
import CampusSettings from "../Models/CampusSettings.js";

export const createDepartment = async (req, res) => {
    try {
        const campus = await CampusSettings.findOne();
        if (!campus) {
            return res.status(400).json({ message: "Configure campus settings first" });
        }
        const dept = await Department.create({
            ...req.body,
            campusId: campus._id
        });
        res.status(201).json(dept);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find().populate("campusId", "campusName");
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const dept = await Department.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        );
        if (!dept) return res.status(404).json({ message: "Department not found" });
        res.json(dept);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const dept = await Department.findByIdAndDelete(req.params.id);
        if (!dept) return res.status(404).json({ message: "Department not found" });
        res.json({ message: "Department deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
