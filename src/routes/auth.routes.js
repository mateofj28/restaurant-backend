// En src/routes/auth.routes.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from '../config/db.js';

const router = Router();

// Roles permitidos
const ROLES = {
    ADMIN: 'admin',
    COCINERO: 'cocinero', 
    MESERO: 'mesero'
};

// Clave secreta para JWT (en producción debe estar en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nombre de usuario único
 *                 example: "juan_mesero"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email único del usuario
 *                 example: "juan@restaurant.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Contraseña del usuario
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 enum: [admin, cocinero, mesero]
 *                 description: Rol del usuario (por defecto mesero)
 *                 example: "mesero"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario registrado exitosamente"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: Token JWT para autenticación
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST: Registrar un nuevo usuario
router.post('/register', async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const { username, email, password, role } = req.body;

        // --- Validaciones ---
        if (!username || !email || !password) {
            return res.status(400).json({ 
                error: 'Username, email y password son obligatorios' 
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await collection.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: 'El usuario o email ya existe' 
            });
        }

        // Asignar rol (por defecto mesero)
        const userRole = role && ['admin', 'cocinero', 'mesero'].includes(role) ? role : 'mesero';

        // Encriptar contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear usuario
        const newUser = {
            username,
            email,
            password: hashedPassword,
            role: userRole,
            companyId: req.body.companyId || null, // ID de la empresa a la que pertenece
            createdAt: new Date(),
            isActive: true
        };

        const result = await collection.insertOne(newUser);

        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: result.insertedId, 
                username, 
                email, 
                role: userRole,
                companyId: newUser.companyId
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Respuesta sin la contraseña
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: result.insertedId,
                username,
                email,
                role: userRole,
                createdAt: newUser.createdAt
            },
            token
        });

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario
 *                 example: "juan@restaurant.com"
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login exitoso"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: Token JWT para autenticación
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST: Iniciar sesión
router.post('/login', async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const { email, password } = req.body;

        // --- Validaciones ---
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email y password son obligatorios' 
            });
        }

        // Buscar usuario por email
        const user = await collection.findOne({ email });

        if (!user) {
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Verificar si el usuario está activo
        if (!user.isActive) {
            return res.status(401).json({ 
                error: 'Usuario desactivado' 
            });
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                email: user.email, 
                role: user.role,
                companyId: user.companyId
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Actualizar último login
        await collection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );

        // Respuesta exitosa
        res.status(200).json({
            message: 'Login exitoso',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: 'Error interno del servidor durante el login' });
    }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET: Obtener perfil del usuario autenticado
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const user = await collection.findOne(
            { _id: new ObjectId(req.user.userId) },
            { projection: { password: 0 } } // Excluir contraseña
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error("Error getting profile:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Middleware para autenticar token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        req.user = user;
        next();
    });
}

// Middleware para verificar roles
function authorizeRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'No tienes permisos para acceder a este recurso' 
            });
        }

        next();
    };
}

// Exportar middlewares para usar en otras rutas
export { authenticateToken, authorizeRole, ROLES };
export default router;