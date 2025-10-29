import jwt from 'jsonwebtoken';

// Middleware para verificar el token JWT
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_super_segura', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        
        req.user = user;
        next();
    });
};

// Middleware para verificar roles específicos
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Roles permitidos: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};

// Middleware para verificar que el usuario pertenece a la empresa
export const requireCompany = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!req.user.companyId) {
        return res.status(403).json({ error: 'Usuario no asociado a ninguna empresa' });
    }

    next();
};

// Middleware combinado: autenticación + empresa
export const authenticateAndRequireCompany = [authenticateToken, requireCompany];

// Middleware para admin global (sin restricción de empresa)
export const requireGlobalAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores' });
    }

    next();
};

// Middleware opcional de autenticación (no falla si no hay token)
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_super_segura', (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

export default {
    authenticateToken,
    requireRole,
    requireCompany,
    authenticateAndRequireCompany,
    requireGlobalAdmin,
    optionalAuth
};