import express from 'express';
import { body } from 'express-validator';
import {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addOrderToHistory,
    searchCustomers
} from '../controllers/customers.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validaciones
const customerValidation = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre completo debe tener entre 2 y 100 caracteres'),
    body('deliveryAddress')
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('La dirección debe tener entre 10 y 200 caracteres'),
    body('city')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('La ciudad debe tener entre 2 y 50 caracteres'),
    body('state')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El departamento debe tener entre 2 y 50 caracteres'),
    body('phoneNumber')
        .trim()
        .matches(/^(\+57|57)?[0-9]{10}$/)
        .withMessage('Número de celular inválido. Formato: +57XXXXXXXXXX, 57XXXXXXXXXX o XXXXXXXXXX'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Formato de correo electrónico inválido'),
    body('preferences.preferredDeliveryTime')
        .optional()
        .isIn(['morning', 'afternoon', 'evening', 'night'])
        .withMessage('Horario de entrega inválido'),
    body('preferences.specialInstructions')
        .optional()
        .trim()
        .isLength({ max: 300 })
        .withMessage('Las instrucciones especiales no pueden exceder 300 caracteres')
];

const orderHistoryValidation = [
    body('orderId')
        .isMongoId()
        .withMessage('ID de orden inválido'),
    body('totalAmount')
        .isFloat({ min: 0 })
        .withMessage('El monto total debe ser un número positivo')
];

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Obtener todos los clientes con filtros (Admin/Manager/Mesero)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *           default: true
 *         description: Filtrar por estado activo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre, email o teléfono
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtrar por ciudad
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filtrar por departamento
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Elementos por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: fullName
 *         description: Campo para ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalCustomers:
 *                       type: integer
 *                     totalOrders:
 *                       type: integer
 *                     avgOrdersPerCustomer:
 *                       type: number
 *                 citiesStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Nombre de la ciudad
 *                       count:
 *                         type: integer
 *                         description: Número de clientes
 */
router.get('/', authenticateToken, requireRole(['admin', 'manager', 'mesero']), getCustomers);

/**
 * @swagger
 * /api/customers/search:
 *   get:
 *     summary: Buscar clientes por nombre, email o teléfono (Admin/Manager/Mesero)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *         description: Texto a buscar (mínimo 3 caracteres)
 *         example: "juan"
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   fullName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *                   deliveryAddress:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *       400:
 *         description: Búsqueda muy corta
 */
router.get('/search', authenticateToken, requireRole(['admin', 'manager', 'mesero']), searchCustomers);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Obtener cliente por ID (Admin/Manager/Mesero)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/:id', authenticateToken, requireRole(['admin', 'manager', 'mesero']), getCustomerById);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Crear nuevo cliente (Admin/Manager/Mesero)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - deliveryAddress
 *               - city
 *               - state
 *               - phoneNumber
 *               - email
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Juan Carlos Pérez"
 *               deliveryAddress:
 *                 type: string
 *                 example: "Calle 123 #45-67, Apartamento 301"
 *               city:
 *                 type: string
 *                 example: "Bogotá"
 *               state:
 *                 type: string
 *                 example: "Cundinamarca"
 *               phoneNumber:
 *                 type: string
 *                 example: "+573001234567"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan.perez@email.com"
 *               preferences:
 *                 type: object
 *                 properties:
 *                   preferredDeliveryTime:
 *                     type: string
 *                     enum: [morning, afternoon, evening, night]
 *                     example: "afternoon"
 *                   specialInstructions:
 *                     type: string
 *                     example: "Tocar el timbre dos veces"
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Datos inválidos o cliente duplicado
 */
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'mesero']), customerValidation, createCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Actualizar cliente - Solo Admin/Manager
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerUpdate'
 *     responses:
 *       200:
 *         description: Cliente actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Cliente no encontrado
 */
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), customerValidation, updateCustomer);

/**
 * @swagger
 * /api/customers/{id}/orders:
 *   post:
 *     summary: Agregar orden al historial del cliente (Admin/Manager/Mesero)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - totalAmount
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "60d5ecb74b24a1234567890a"
 *               totalAmount:
 *                 type: number
 *                 example: 45000
 *     responses:
 *       200:
 *         description: Orden agregada al historial exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 */
router.post('/:id/orders', authenticateToken, requireRole(['admin', 'manager', 'mesero']), orderHistoryValidation, addOrderToHistory);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Desactivar cliente - Solo Admin/Manager
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cliente desactivado correctamente"
 */
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), deleteCustomer);

export default router;