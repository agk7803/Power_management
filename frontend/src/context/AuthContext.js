import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        apiFetch("/auth/profile")
            .then((data) => setUser(data.user || data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const data = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        setUser(data.user);
        return data;
    };

    const register = async (name, email, password, role) => {
        const data = await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password, role }),
        });
        setUser(data.user);
        return data;
    };

    const logout = async () => {
        try {
            await apiFetch("/auth/logout", { method: "POST" });
        } catch (e) {
            // ignore
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
