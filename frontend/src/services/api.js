const API_BASE = "http://localhost:5001/api";

export async function apiFetch(endpoint, options = {}) {
    const config = {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
        delete config.headers["Content-Type"];
    }

    const res = await fetch(`${API_BASE}${endpoint}`, config);

    // Auto-redirect on auth failure (REMOVED: handled by context/protected routes)
    if (res.status === 401) {
        throw new Error("Session expired");
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "API Error");
    }

    return data;
}

// Convenience methods
export const api = {
    get: (url) => apiFetch(url),
    post: (url, body) => apiFetch(url, { method: "POST", body: JSON.stringify(body) }),
    put: (url, body) => apiFetch(url, { method: "PUT", body: JSON.stringify(body) }),
    delete: (url) => apiFetch(url, { method: "DELETE" }),
};
