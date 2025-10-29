import express from 'express';
import { body } from 'express-validator';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    toggleAvailability,
    deleteProduct,
    getProductsByCategory,
    uploadMiddleware
} from '../controllers/products.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validaciones
const productValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número mayor a 0'),
    body('preparationTime')
        .isInt({ min: 1 })
        .withMessage('El tiempo de preparación debe ser al menos 1 minuto'),
    body('category')
        .isIn(['entradas', 'platos', 'postres', 'bebidas'])
        .withMessage('La categoría debe ser: entradas, platos, postres o bebidas'),
    body('description')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('observations')
        .optional()
        .trim()
        .isLength({ max: 300 })
        .withMessage('Las observaciones no pueden exceder 300 caracteres'),
    body('allergens')
        .optional()
        .isArray()
        .withMessage('Los alérgenos deben ser un array'),
    body('allergens.*')
        .optional()
        .isIn(['gluten', 'lactosa', 'frutos_secos', 'mariscos', 'huevos', 'soja', 'pescado'])
        .withMessage('Alérgeno no válido'),
    body('nutritionalInfo.calories')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Las calorías deben ser un número positivo'),
    body('nutritionalInfo.proteins')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Las proteínas deben ser un número positivo'),
    body('nutritionalInfo.carbs')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Los carbohidratos deben ser un número positivo'),
    body('nutritionalInfo.fats')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Las grasas deben ser un número positivo')
];

const availabilityValidation = [
    body('isAvailable')
        .isBoolean()
        .withMessage('isAvailable debe ser true o false')
];

// Rutas públicas
/**
 * @swagger
 * /api/products/menu/{companyId}:
 *   get:
 *     summary: Obtener menú público de productos por empresa
 *     tags: [Products - Public]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la empresa
 *     responses:
 *       200:
 *         description: Menú obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entradas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductPublic'
 *                 platos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductPublic'
 *                 postres:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductPublic'
 *                 bebidas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductPublic'
 */
router.get('/menu/:companyId', getProductsByCategory);

// Rutas protegidas
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Obtener todos los productos con filtros
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [entradas, platos, postres, bebidas]
 *         description: Filtrar por categoría
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *           default: true
 *         description: Filtrar por estado activo
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *           default: true
 *         description: Filtrar por disponibilidad
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre y descripción
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
 *           default: name
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
 *         description: Lista de productos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Categoría
 *                       count:
 *                         type: integer
 *                         description: Total de productos
 *                       available:
 *                         type: integer
 *                         description: Productos disponibles
 *                       avgPrice:
 *                         type: number
 *                         description: Precio promedio
 *                       avgPrepTime:
 *                         type: number
 *                         description: Tiempo promedio de preparación
 */
router.get('/', authenticateToken, getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:id', authenticateToken, getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear nuevo producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - preparationTime
 *               - category
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Pizza Margherita"
 *               price:
 *                 type: number
 *                 example: 15.99
 *               preparationTime:
 *                 type: integer
 *                 example: 20
 *               category:
 *                 type: string
 *                 enum: [entradas, platos, postres, bebidas]
 *                 example: "platos"
 *               description:
 *                 type: string
 *                 example: "Pizza clásica con tomate, mozzarella y albahaca fresca"
 *               observations:
 *                 type: string
 *                 example: "Disponible en masa fina o gruesa"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagen del producto (max 5MB)
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [gluten, lactosa, frutos_secos, mariscos, huevos, soja, pescado]
 *               nutritionalInfo:
 *                 type: object
 *                 properties:
 *                   calories:
 *                     type: number
 *                   proteins:
 *                     type: number
 *                   carbs:
 *                     type: number
 *                   fats:
 *                     type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Datos inválidos
 */
router.post('/', authenticateToken, requireRole(['admin', 'manager']), uploadMiddleware, productValidation, createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Actualizar producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 */
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), uploadMiddleware, productValidation, updateProduct);

/**
 * @swagger
 * /api/products/{id}/availability:
 *   patch:
 *     summary: Cambiar disponibilidad del producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Disponibilidad actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
router.patch('/:id/availability', authenticateToken, requireRole(['admin', 'manager', 'waiter']), availabilityValidation, toggleAvailability);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Desactivar producto (soft delete)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Producto desactivado correctamente"
 */
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), deleteProduct);

export default router;