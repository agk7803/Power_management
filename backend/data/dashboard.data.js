// backend/data/dashboard.data.js

const dashboardData = {
    energyToday: "12000 kWh",
    savings: "2289%",
    activeRooms: "9",
    forecastAccuracy: "100%",
    alerts: [
        {
            type: "warning",
            title: "High usage — Room 204",
            time: "2 minutes ago"
        },
        {
            type: "info",
            title: "AC optimized — Block B",
            time: "15 minutes ago"
        },
        {
            type: "success",
            title: "Lights auto-off — Lab 3",
            time: "1 hour ago"
        }
    ]
};

export default dashboardData;