import React, { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import "../styles/pages.css";

function ChallengesPage() {
    const { user } = useAuth();
    const [joinedChallenges, setJoinedChallenges] = useState([]);

    // Static challenges for MVP gamification
    const challenges = [
        {
            id: 1,
            title: "Power Down Friday",
            description: "Reduce classroom energy usage by 20% every Friday for a month.",
            icon: "⚡",
            reward: "🏆 Energy Champion Badge",
            difficulty: "Medium",
            duration: "4 weeks",
            participants: 12,
            status: "active",
        },
        {
            id: 2,
            title: "Zero Idle Week",
            description: "Ensure no idle power consumption detected in your classroom for an entire week.",
            icon: "💤",
            reward: "🌟 Zero Waste Star",
            difficulty: "Hard",
            duration: "1 week",
            participants: 8,
            status: "active",
        },
        {
            id: 3,
            title: "Light Monitor",
            description: "Turn off lights in unoccupied rooms. Report 10 instances.",
            icon: "💡",
            reward: "💡 Light Guardian",
            difficulty: "Easy",
            duration: "2 weeks",
            participants: 24,
            status: "active",
        },
        {
            id: 4,
            title: "AC Optimizer",
            description: "Maintain AC temperature at 24°C for all scheduled classes in your room.",
            icon: "❄️",
            reward: "❄️ Climate Hero",
            difficulty: "Medium",
            duration: "2 weeks",
            participants: 15,
            status: "active",
        },
        {
            id: 5,
            title: "Weekend Warrior",
            description: "Ensure zero energy consumption in your assigned room during weekends.",
            icon: "🌿",
            reward: "🌿 Weekend Saver",
            difficulty: "Easy",
            duration: "4 weekends",
            participants: 20,
            status: "upcoming",
        },
        {
            id: 6,
            title: "Data Champion",
            description: "Report any malfunctioning sensors or devices. Report 5 issues.",
            icon: "📡",
            reward: "📡 Tech Watchdog",
            difficulty: "Easy",
            duration: "Ongoing",
            participants: 6,
            status: "active",
        },
    ];

    const handleJoin = (challengeId) => {
        if (joinedChallenges.includes(challengeId)) {
            setJoinedChallenges(prev => prev.filter(id => id !== challengeId));
        } else {
            setJoinedChallenges(prev => [...prev, challengeId]);
        }
    };

    const getDifficultyColor = (diff) => {
        if (diff === "Easy") return "green";
        if (diff === "Medium") return "orange";
        return "red";
    };

    return (
        <Layout>
            <div className="page">
                <div className="page__header">
                    <div>
                        <h1 className="page__title">Energy Challenges</h1>
                        <p className="page__subtitle">Join campus-wide energy saving challenges and earn rewards!</p>
                    </div>
                    <div className="page__actions">
                        <span className="tag tag--purple" style={{ fontSize: "0.95rem", padding: "8px 16px" }}>
                            👤 {user?.name || "User"} · {joinedChallenges.length} joined
                        </span>
                    </div>
                </div>

                {/* Active Challenges */}
                <div className="challenges-grid">
                    {challenges.map(challenge => {
                        const isJoined = joinedChallenges.includes(challenge.id);
                        return (
                            <div key={challenge.id} className={`challenge-card ${isJoined ? "challenge-card--joined" : ""}`}>
                                <div className="challenge-card__header">
                                    <span className="challenge-card__icon">{challenge.icon}</span>
                                    <span className={`tag tag--${challenge.status === "active" ? "green" : "blue"}`}>
                                        {challenge.status}
                                    </span>
                                </div>
                                <h3 className="challenge-card__title">{challenge.title}</h3>
                                <p className="challenge-card__desc">{challenge.description}</p>
                                <div className="challenge-card__meta">
                                    <span className={`tag tag--${getDifficultyColor(challenge.difficulty)}`}>
                                        {challenge.difficulty}
                                    </span>
                                    <span className="challenge-card__duration">⏱️ {challenge.duration}</span>
                                </div>
                                <div className="challenge-card__footer">
                                    <span className="challenge-card__participants">
                                        👥 {challenge.participants + (isJoined ? 1 : 0)} participants
                                    </span>
                                    <span className="challenge-card__reward">{challenge.reward}</span>
                                </div>
                                <button
                                    className={`btn btn--sm ${isJoined ? "btn--outline" : "btn--primary"}`}
                                    onClick={() => handleJoin(challenge.id)}
                                    style={{ width: "100%", marginTop: 12 }}
                                >
                                    {isJoined ? "Leave Challenge" : "Join Challenge"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}

export default ChallengesPage;
