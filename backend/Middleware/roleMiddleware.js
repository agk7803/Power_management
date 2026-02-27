/**
 * Role-Based Access Middleware
 * Usage: requireRole("admin") or requireRole("admin", "faculty")
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: insufficient role" });
        }
        next();
    };
};
