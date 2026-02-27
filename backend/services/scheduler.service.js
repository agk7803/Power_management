/**
 * Timetable-Based Smart Automation Scheduler
 *
 * Runs every 60 seconds and checks each classroom:
 * - If no class is scheduled AND power > 50W → creates SCHEDULE_MISMATCH alert + AUTO_OFF log
 * - Avoids duplicate alerts within a 10-minute window
 */

import Classroom from "../Models/Classroom.js";
import Timetable from "../Models/Timetable.js";
import EnergyData from "../Models/EnergyData.js";
import Alert from "../Models/Alert.js";
import AutomationLog from "../Models/AutomationLog.js";

const IDLE_THRESHOLD = 50;          // watts
const CHECK_INTERVAL = 60_000;      // 60 seconds
const ALERT_COOLDOWN = 10 * 60_000; // 10 minutes — avoid duplicate alerts

/**
 * Check if a classroom has a class scheduled right now
 */
function isClassScheduledNow(timetableEntries) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    const currentTime = now.getHours().toString().padStart(2, "0") + ":" +
        now.getMinutes().toString().padStart(2, "0");

    return timetableEntries.some(entry => {
        if (entry.dayOfWeek !== dayOfWeek) return false;
        return currentTime >= entry.startTime && currentTime < entry.endTime;
    });
}

/**
 * Find the next scheduled class for a classroom today (or null)
 */
function getNextClass(timetableEntries) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours().toString().padStart(2, "0") + ":" +
        now.getMinutes().toString().padStart(2, "0");

    const todayEntries = timetableEntries
        .filter(e => e.dayOfWeek === dayOfWeek && e.startTime > currentTime)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return todayEntries.length > 0 ? todayEntries[0] : null;
}

/**
 * Get the currently active class for a classroom (or null)
 */
function getActiveClass(timetableEntries) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours().toString().padStart(2, "0") + ":" +
        now.getMinutes().toString().padStart(2, "0");

    return timetableEntries.find(entry => {
        if (entry.dayOfWeek !== dayOfWeek) return false;
        return currentTime >= entry.startTime && currentTime < entry.endTime;
    }) || null;
}

/**
 * Core scheduler tick — runs once per interval
 */
async function schedulerTick() {
    try {
        const classrooms = await Classroom.find().lean();
        if (classrooms.length === 0) return;

        let alertsCreated = 0;
        let autoOffs = 0;

        for (const classroom of classrooms) {
            // 1. Get timetable entries for this classroom
            const timetableEntries = await Timetable.find({ classroomId: classroom._id }).lean();

            // 2. Check if a class is scheduled now
            const hasClassNow = isClassScheduledNow(timetableEntries);

            // 3. Get latest power reading
            const latestReading = await EnergyData.findOne({ classroomId: classroom._id })
                .sort({ timestamp: -1 })
                .select("power timestamp")
                .lean();

            const currentPower = latestReading?.power || 0;
            const readingAge = latestReading
                ? (Date.now() - new Date(latestReading.timestamp).getTime()) / 1000
                : Infinity;

            // Skip if reading is stale (> 2 minutes old)
            if (readingAge > 120) continue;

            // 4. If NO class scheduled AND power is above idle threshold → waste detected
            if (!hasClassNow && currentPower > IDLE_THRESHOLD) {
                // Check cooldown — don't spam alerts
                const recentAlert = await Alert.findOne({
                    classroomId: classroom._id,
                    type: "SCHEDULE_MISMATCH",
                    createdAt: { $gte: new Date(Date.now() - ALERT_COOLDOWN) }
                });

                if (!recentAlert) {
                    // Create alert
                    const message = `No class scheduled for ${classroom.classroomId}, but power is ${currentPower}W — recommend turning off`;
                    await Alert.create({
                        classroomId: classroom._id,
                        type: "SCHEDULE_MISMATCH",
                        severity: currentPower > 2000 ? "HIGH" : "MEDIUM",
                        message
                    });

                    // Create automation log
                    await AutomationLog.create({
                        classroomId: classroom._id,
                        action: "AUTO_OFF",
                        reason: `No class scheduled — power was ${currentPower}W`,
                        powerAtTime: currentPower,
                        triggeredBy: "scheduler"
                    });

                    alertsCreated++;
                    autoOffs++;
                    console.log(`🔌 AUTO-OFF: ${classroom.classroomId} — ${currentPower}W with no class scheduled`);
                }
            }
        }

        if (alertsCreated > 0) {
            console.log(`⏰ Scheduler: ${alertsCreated} alert(s) created, ${autoOffs} auto-off(s) triggered`);
        }
    } catch (error) {
        console.error("❌ Scheduler error:", error.message);
    }
}

/**
 * Start the scheduler — call this after DB connection
 */
export function startScheduler() {
    console.log("⏰ Timetable automation scheduler started (checking every 60s)");

    // Run once immediately
    schedulerTick();

    // Then every interval
    setInterval(schedulerTick, CHECK_INTERVAL);
}

/**
 * Get automation status for all classrooms (used by the API)
 */
export async function getClassroomAutomationStatus() {
    const classrooms = await Classroom.find().lean();
    const statuses = [];

    for (const classroom of classrooms) {
        const timetableEntries = await Timetable.find({ classroomId: classroom._id }).lean();
        const hasClassNow = isClassScheduledNow(timetableEntries);
        const activeClass = getActiveClass(timetableEntries);
        const nextClass = getNextClass(timetableEntries);

        // Get latest power reading
        const latestReading = await EnergyData.findOne({ classroomId: classroom._id })
            .sort({ timestamp: -1 })
            .select("power timestamp")
            .lean();

        const currentPower = latestReading?.power || 0;
        const readingAge = latestReading
            ? (Date.now() - new Date(latestReading.timestamp).getTime()) / 1000
            : Infinity;

        // Get last automation action for this classroom
        const lastAction = await AutomationLog.findOne({ classroomId: classroom._id })
            .sort({ createdAt: -1 })
            .lean();

        // Determine status
        let status;
        if (readingAge > 120 || currentPower <= IDLE_THRESHOLD) {
            status = "idle";        // gray — off or no data
        } else if (hasClassNow) {
            status = "active";      // green — class in progress
        } else {
            status = "wasting";     // red — power on, no class
        }

        statuses.push({
            classroomId: classroom.classroomId,
            classroomObjId: classroom._id,
            name: classroom.name,
            status,
            currentPower,
            hasClassNow,
            activeClass: activeClass ? {
                subject: activeClass.subject,
                faculty: activeClass.faculty,
                endTime: activeClass.endTime
            } : null,
            nextClass: nextClass ? {
                subject: nextClass.subject,
                startTime: nextClass.startTime,
                endTime: nextClass.endTime
            } : null,
            lastAction: lastAction ? {
                action: lastAction.action,
                reason: lastAction.reason,
                time: lastAction.createdAt
            } : null,
            lastReadingAge: Math.round(readingAge)
        });
    }

    return statuses;
}

export { isClassScheduledNow, getNextClass, getActiveClass };
