/**
 * Energy Calculation Service
 * Computes cost, CO₂ emissions, and detects idle state
 */

/**
 * Calculate electricity cost
 * @param {number} energy_kWh - Energy consumed in kWh
 * @param {number} tariff - Cost per kWh (₹)
 * @returns {number} cost in ₹
 */
export const calculateCost = (energy_kWh, tariff) => {
    return Math.round(energy_kWh * tariff * 100) / 100;
};

/**
 * Calculate CO₂ emissions
 * @param {number} energy_kWh - Energy consumed in kWh
 * @param {number} co2Factor - kg CO₂ per kWh
 * @returns {number} CO₂ in kg
 */
export const calculateCO2 = (energy_kWh, co2Factor) => {
    return Math.round(energy_kWh * co2Factor * 1000) / 1000;
};

/**
 * Detect idle state
 * @param {number} power - Current power in watts
 * @param {number} threshold - Idle threshold in watts (default 50W)
 * @returns {boolean}
 */
export const detectIdle = (power, threshold = 50) => {
    return power < threshold;
};

/**
 * Convert power (watts) and interval (seconds) to energy (kWh)
 * @param {number} power - Power in watts
 * @param {number} intervalSeconds - Time interval in seconds
 * @returns {number} energy in kWh
 */
export const powerToEnergy = (power, intervalSeconds = 5) => {
    // kWh = (watts * seconds) / (1000 * 3600)
    return Math.round((power * intervalSeconds) / 3600000 * 100000) / 100000;
};
