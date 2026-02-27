/**
 * ESP32 Hardware Poller
 *
 * Periodically fetches energy data from the real ESP32 device
 * and ingests it into the backend via the same pipeline as the simulator.
 *
 * The ESP32 serves JSON at its IP address like:
 * {
 *   "classes": [
 *     { "classid": "A33", "occupied": 1, "voltage": 243.2, "current": 0, "power": 0.5, "energy": 0.009 },
 *     { "classid": "B22", "occupied": 1, "voltage": 243.3, "current": 0, "power": 0.5, "energy": 0.002 }
 *   ]
 * }
 */

const ESP32_URL = process.env.ESP32_URL || "http://192.168.1.165";
const POLL_INTERVAL = parseInt(process.env.ESP32_POLL_INTERVAL) || 5000; // 5 seconds

let pollingTimer = null;
let isPolling = false;

async function fetchAndIngest(API_BASE) {
    if (isPolling) return; // Prevent overlapping requests
    isPolling = true;

    try {
        // Fetch data from ESP32
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const response = await fetch(ESP32_URL, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`❌ ESP32 responded with status ${response.status}`);
            return;
        }

        const esp32Data = await response.json();

        if (!esp32Data.classes || !Array.isArray(esp32Data.classes)) {
            console.error("❌ ESP32 data missing 'classes' array");
            return;
        }

        // Forward to our own ingest endpoint
        const ingestResponse = await fetch(`${API_BASE}/energy/ingest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(esp32Data)
        });

        const result = await ingestResponse.json();

        if (ingestResponse.ok) {
            const count = result.results?.length || 0;
            const classIds = (result.results || []).map(r => r.classid).join(", ");
            console.log(`📡 ESP32 → Ingested ${count} reading(s): [${classIds}]`);

            if (result.errors?.length > 0) {
                for (const e of result.errors) {
                    console.warn(`  ⚠️ ${e.classid}: ${e.error}`);
                }
            }
        } else {
            console.error(`❌ Ingest failed: ${result.message}`);
        }
    } catch (error) {
        if (error.name === "AbortError") {
            console.warn("⏱️ ESP32 request timed out — device may be offline");
        } else if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
            console.warn("🔴 ESP32 unreachable — check device is on the same network");
        } else {
            console.error("❌ ESP32 poll error:", error.message);
        }
    } finally {
        isPolling = false;
    }
}

export function startESP32Poller(port) {
    const API_BASE = `http://localhost:${port}/api`;

    console.log("═══════════════════════════════════════════");
    console.log("  📡 ESP32 Hardware Poller Started");
    console.log(`  ESP32 URL: ${ESP32_URL}`);
    console.log(`  Poll interval: ${POLL_INTERVAL / 1000}s`);
    console.log(`  Ingesting to: ${API_BASE}/energy/ingest`);
    console.log("═══════════════════════════════════════════");

    // Initial fetch after 2 seconds (let server fully start)
    setTimeout(() => fetchAndIngest(API_BASE), 2000);

    // Then poll every POLL_INTERVAL
    pollingTimer = setInterval(() => fetchAndIngest(API_BASE), POLL_INTERVAL);
}

export function stopESP32Poller() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        console.log("🛑 ESP32 poller stopped");
    }
}
