import jwt from 'jsonwebtoken';

/**
 * Verify that the request contains a valid JWT.
 *
 * Expected header:
 * Authorization: Bearer <token>
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Authentication required.'
        });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            error: 'Invalid authorization header.'
        });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error(
            'JWT_SECRET is not configured in the backend environment.'
        );

        return res.status(500).json({
            error: 'Server authentication configuration error.'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            jwtSecret
        );

        req.user = decoded;

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Your session has expired. Please log in again.'
            });
        }

        return res.status(401).json({
            error: 'Invalid authentication token.'
        });
    }
}


/**
 * Allow Admin accounts only.
 *
 * authenticateToken must run before this middleware.
 */
export function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required.'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required.'
        });
    }

    next();
}