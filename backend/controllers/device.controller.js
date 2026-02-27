import Device from "../Models/Device.js";
import Classroom from "../Models/Classroom.js";

// POST /api/devices/register — Admin registers a new device
export const registerDevice = async (req, res) => {
    try {
        const { deviceId, name, floorId, classroomId } = req.body;

        const existing = await Device.findOne({ deviceId });
        if (existing) {
            return res.status(400).json({ message: "Device already registered" });
        }

        const device = await Device.create({
            deviceId,
            name,
            floorId: floorId || null,
            classroomId: classroomId || null,
            status: "REGISTERED"
        });

        // If a classroom was specified, map the device to it
        if (classroomId) {
            await Classroom.findByIdAndUpdate(classroomId, { deviceId: device._id });
        }

        res.status(201).json(device);
    } catch (error) {
        console.error("Register device error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/devices — List all devices
export const getDevices = async (req, res) => {
    try {
        const devices = await Device.find()
            .populate("floorId", "name floorNumber")
            .populate("classroomId", "classroomId name");
        res.json(devices);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// PUT /api/devices/:id — Update device details
export const updateDevice = async (req, res) => {
    try {
        const device = await Device.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        );
        if (!device) return res.status(404).json({ message: "Device not found" });
        res.json(device);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/devices/activate — Simulator calls this on startup
export const activateDevice = async (req, res) => {
    try {
        const { deviceId, firmwareVersion } = req.body;

        const device = await Device.findOne({ deviceId });
        if (!device) {
            return res.status(404).json({ message: "Device not registered. Register it first." });
        }

        if (device.status === "DECOMMISSIONED") {
            return res.status(403).json({ message: "Device is decommissioned" });
        }

        device.status = "ACTIVE";
        device.firmwareVersion = firmwareVersion || device.firmwareVersion;
        device.lastSeen = new Date();
        device.activatedAt = device.activatedAt || new Date();
        await device.save();

        console.log(`✅ Device activated: ${deviceId}`);

        res.json({
            message: "Device activated",
            device: {
                _id: device._id,
                deviceId: device.deviceId,
                classroomId: device.classroomId,
                status: device.status
            }
        });
    } catch (error) {
        console.error("Activate device error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/devices/heartbeat — Update lastSeen timestamp
export const heartbeat = async (req, res) => {
    try {
        const { deviceId } = req.body;

        const device = await Device.findOneAndUpdate(
            { deviceId },
            { lastSeen: new Date() },
            { new: true }
        );

        if (!device) {
            return res.status(404).json({ message: "Device not found" });
        }

        res.json({ message: "Heartbeat received", lastSeen: device.lastSeen });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
