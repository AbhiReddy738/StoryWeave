import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(`[DEBUG - SERVER] Incoming request: ${req.method} ${req.originalUrl}`);
    console.log(`[DEBUG - SERVER] Authorization Header:`, authHeader || "NOT PRESENT");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn(`[DEBUG - SERVER] Rejecting request to ${req.originalUrl} - Missing or malformed Auth Header`);
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    const token = authHeader.split(" ")[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "storyweave_secret_key_123");
        req.user = decoded; // Contains { id, email }
        console.log(`[DEBUG - SERVER] Token verified successfully. User ID: ${decoded.id}, Email: ${decoded.email}`);
        next();
    } catch (err) {
        console.error(`[DEBUG - SERVER] Token verification failed:`, err.message);
        return res.status(401).json({ message: "Invalid or Expired Token" });
    }
};

export default authMiddleware;
