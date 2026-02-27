/**
 * Seed Script — Creates test data for the simulator
 * Run: node simulator/seed.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

import CampusSettings from "../Models/CampusSettings.js";
import Department from "../Models/Department.js";
import Floor from "../Models/Floor.js";
import Classroom from "../Models/Classroom.js";
import Device from "../Models/Device.js";

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Campus Settings
    let campus = await CampusSettings.findOne();
    if (!campus) {
        campus = await CampusSettings.create({
            campusName: "PICT College",
            electricityTariff: 8.5,
            co2Factor: 0.82,
            workingHours: { start: "09:00", end: "17:00" }
        });
        console.log("🏫 Campus created:", campus.campusName);
    } else {
        console.log("🏫 Campus exists:", campus.campusName);
    }

    // 2. Department
    let dept = await Department.findOne({ name: "Computer Engineering" });
    if (!dept) {
        dept = await Department.create({ name: "Computer Engineering", campusId: campus._id });
        console.log("🏢 Department created:", dept.name);
    } else {
        console.log("🏢 Department exists:", dept.name);
    }

    // 3. Floors
    const floorConfigs = [
        { name: "Ground Floor", floorNumber: 0 },
        { name: "First Floor", floorNumber: 1 },
        { name: "Second Floor", floorNumber: 2 }
    ];

    const floors = [];
    for (const fc of floorConfigs) {
        let floor = await Floor.findOne({ name: fc.name, departmentId: dept._id });
        if (!floor) {
            floor = await Floor.create({ ...fc, departmentId: dept._id });
            console.log(`🏗️  Floor created: ${floor.name}`);
        } else {
            console.log(`🏗️  Floor exists: ${floor.name}`);
        }
        floors.push(floor);
    }

    // 4. Classrooms
    const classroomConfigs = [
        { classroomId: "CR-101", name: "Room 101", floorIdx: 0, capacity: 60, acCount: 2, fanCount: 4, lightCount: 8, hasProjector: true },
        { classroomId: "CR-102", name: "Room 102", floorIdx: 0, capacity: 40, acCount: 1, fanCount: 3, lightCount: 6, hasProjector: false },
        { classroomId: "CR-201", name: "Lab 201", floorIdx: 1, capacity: 30, acCount: 3, fanCount: 2, lightCount: 10, hasProjector: true },
        { classroomId: "CR-301", name: "Seminar Hall", floorIdx: 2, capacity: 120, acCount: 4, fanCount: 6, lightCount: 16, hasProjector: true }
    ];

    const classrooms = [];
    for (const cc of classroomConfigs) {
        let classroom = await Classroom.findOne({ classroomId: cc.classroomId });
        if (!classroom) {
            const { floorIdx, ...data } = cc;
            classroom = await Classroom.create({ ...data, floorId: floors[floorIdx]._id });
            console.log(`🏫 Classroom created: ${classroom.classroomId} — ${classroom.name}`);
        } else {
            console.log(`🏫 Classroom exists: ${classroom.classroomId}`);
        }
        classrooms.push(classroom);
    }

    // 5. Devices (one per classroom)
    const deviceConfigs = [
        { deviceId: "ESP32-AA:BB:CC:DD:EE:01", name: "Sensor Unit 1", classroomIdx: 0, floorIdx: 0 },
        { deviceId: "ESP32-AA:BB:CC:DD:EE:02", name: "Sensor Unit 2", classroomIdx: 1, floorIdx: 0 },
        { deviceId: "ESP32-AA:BB:CC:DD:EE:03", name: "Sensor Unit 3", classroomIdx: 2, floorIdx: 1 },
        { deviceId: "ESP32-AA:BB:CC:DD:EE:04", name: "Sensor Unit 4", classroomIdx: 3, floorIdx: 2 }
    ];

    for (const dc of deviceConfigs) {
        let device = await Device.findOne({ deviceId: dc.deviceId });
        if (!device) {
            device = await Device.create({
                deviceId: dc.deviceId,
                name: dc.name,
                floorId: floors[dc.floorIdx]._id,
                classroomId: classrooms[dc.classroomIdx]._id,
                status: "REGISTERED"
            });
            // Map device back to classroom
            await Classroom.findByIdAndUpdate(classrooms[dc.classroomIdx]._id, { deviceId: device._id });
            console.log(`📡 Device created: ${device.deviceId} → ${classrooms[dc.classroomIdx].classroomId}`);
        } else {
            console.log(`📡 Device exists: ${device.deviceId} (${device.status})`);
        }
    }

    console.log("\n✅ Seed complete! Now run: node simulator/simulator.js");
    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
