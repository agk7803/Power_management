/**
 * Realistic Energy Load Pattern Generator
 * Simulates ESP32 sensor readings based on time-of-day and classroom config
 */

/**
 * Get base power load based on time and classroom equipment
 * @param {Object} classroom - { acCount, fanCount, lightCount, hasProjector, capacity }
 * @param {number} hour - Current hour (0-23)
 * @param {number} dayOfWeek - 0=Sunday, 6=Saturday
 * @returns {number} Base power in watts
 */
export const getBaseLoad = (classroom, hour, dayOfWeek) => {
    const ac = classroom?.acCount || 0;
    const fans = classroom?.fanCount || 0;
    const lights = classroom?.lightCount || 0;
    const projector = classroom?.hasProjector ? 1 : 0;

    // Per-appliance wattage
    const AC_WATTS = 1500;          // Split AC
    const FAN_WATTS = 75;
    const LIGHT_WATTS = 40;         // LED tube
    const PROJECTOR_WATTS = 300;
    const STANDBY_WATTS = 15;       // Base standby per room

    // Weekend — everything off except standby
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return STANDBY_WATTS;
    }

    // Night/Early morning (0-7 AM) — standby only
    if (hour < 7) {
        return STANDBY_WATTS;
    }

    // Late evening (9 PM - midnight) — standby
    if (hour >= 21) {
        return STANDBY_WATTS;
    }

    // Pre-class (7-9 AM) — lights on, some fans
    if (hour >= 7 && hour < 9) {
        return lights * LIGHT_WATTS * 0.5 + fans * FAN_WATTS * 0.3 + STANDBY_WATTS;
    }

    // Peak class hours (9 AM - 5 PM)
    if (hour >= 9 && hour < 17) {
        const acLoad = ac * AC_WATTS;
        const fanLoad = fans * FAN_WATTS;
        const lightLoad = lights * LIGHT_WATTS;
        const projectorLoad = projector * PROJECTOR_WATTS;
        return acLoad + fanLoad + lightLoad + projectorLoad + STANDBY_WATTS;
    }

    // After hours (5 PM - 9 PM) — reduced load
    if (hour >= 17 && hour < 21) {
        return lights * LIGHT_WATTS * 0.3 + fans * FAN_WATTS * 0.2 + STANDBY_WATTS;
    }

    return STANDBY_WATTS;
};

/**
 * Add realistic noise to a base reading
 * @param {number} base - Base power value
 * @param {number} noiseFactor - Percentage of noise (0.1 = ±10%)
 * @returns {number} Noisy power value
 */
export const addNoise = (base, noiseFactor = 0.1) => {
    const noise = base * noiseFactor * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(base + noise));
};

/**
 * Determine if this reading should be an anomaly spike
 * @param {number} chance - Probability (0-1), default 5%
 * @returns {boolean}
 */
export const shouldSpike = (chance = 0.05) => {
    return Math.random() < chance;
};

/**
 * Generate an anomaly spike multiplier
 * @returns {number} Multiplier between 2x and 4x
 */
export const getSpikeMultiplier = () => {
    return 2 + Math.random() * 2;  // 2x to 4x spike
};

/**
 * Generate realistic voltage with small variance
 * @returns {number} Voltage around 230V ± 5V
 */
export const getVoltage = () => {
    return 225 + Math.random() * 10;  // 225-235V
};

/**
 * Calculate current from power and voltage
 * @param {number} power - watts
 * @param {number} voltage - volts
 * @returns {number} current in amps
 */
export const getCurrent = (power, voltage) => {
    return Math.round((power / voltage) * 100) / 100;
};
