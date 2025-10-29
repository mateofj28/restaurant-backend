import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { ObjectId } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/products');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});

// Obtener todos los productos con filtros
const getProducts = async (req, res) => {
    try {
        const { 
            category, 
            isActive = 'true', 
            isAvailable = 'true',
            search,
            page = 1,
            limit = 20,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        const collection = req.db.collection('products');
        const companyId = new ObjectId(req.user.companyId);
        
        // Construir filtros
        const filters = { companyId };
        
        if (category) filters.category = category;
        if (isActive !== 'all') filters.isActive = isActive === 'true';
        if (isAvailable !== 'all') filters.isAvailable = isAvailable === 'true';
        
        // Búsqueda por texto
        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const products = await collection.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();

        const total = await collection.countDocuments(filters);

        // Estadísticas por categoría
        const stats = await collection.aggregate([
            { $match: { companyId: companyId, isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    available: { $sum: { $cond: ['$isAvailable', 1, 0] } },
                    avgPrice: { $avg: '$price' },
                    avgPrepTime: { $avg: '$preparationTime' }
                }
            }
        ]).toArray();

        res.json({
            products,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            },
            stats
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener producto por ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const collection = req.db.collection('products');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de producto no válido' });
        }

        const product = await collection.findOne({ 
            _id: new ObjectId(id), 
            companyId 
        });

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Crear nuevo producto
const createProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const collection = req.db.collection('products');
        const productData = {
            ...req.body,
            companyId: new ObjectId(req.user.companyId),
            createdBy: new ObjectId(req.user.id),
            createdAt: new Date(),
            isActive: true,
            isAvailable: true
        };

        // Manejar imagen si se subió
        if (req.file) {
            productData.image = {
                url: `/uploads/products/${req.file.filename}`,
                filename: req.file.filename,
                publicId: null
            };
        }

        // Convertir arrays de strings si vienen como strings
        if (typeof productData.allergens === 'string') {
            productData.allergens = JSON.parse(productData.allergens);
        }
        if (typeof productData.tags === 'string') {
            productData.tags = JSON.parse(productData.tags);
        }
        if (typeof productData.nutritionalInfo === 'string') {
            productData.nutritionalInfo = JSON.parse(productData.nutritionalInfo);
        }

        const result = await collection.insertOne(productData);
        const product = await collection.findOne({ _id: result.insertedId });

        res.status(201).json(product);
    } catch (error) {
        console.error('Error al crear producto:', error);
        
        // Eliminar imagen si hubo error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error al eliminar imagen:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Actualizar producto
const updateProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const collection = req.db.collection('products');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de producto no válido' });
        }

        const product = await collection.findOne({ 
            _id: new ObjectId(id), 
            companyId 
        });
        
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const updateData = {
            ...req.body,
            updatedBy: new ObjectId(req.user.id),
            updatedAt: new Date()
        };

        // Manejar nueva imagen
        if (req.file) {
            // Eliminar imagen anterior si existe
            if (product.image && product.image.filename) {
                try {
                    const oldImagePath = path.join(__dirname, '../../uploads/products', product.image.filename);
                    await fs.unlink(oldImagePath);
                } catch (error) {
                    console.error('Error al eliminar imagen anterior:', error);
                }
            }

            updateData.image = {
                url: `/uploads/products/${req.file.filename}`,
                filename: req.file.filename,
                publicId: null
            };
        }

        // Convertir arrays de strings si vienen como strings
        if (typeof updateData.allergens === 'string') {
            updateData.allergens = JSON.parse(updateData.allergens);
        }
        if (typeof updateData.tags === 'string') {
            updateData.tags = JSON.parse(updateData.tags);
        }
        if (typeof updateData.nutritionalInfo === 'string') {
            updateData.nutritionalInfo = JSON.parse(updateData.nutritionalInfo);
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), companyId },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        res.json(result);
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        
        // Eliminar nueva imagen si hubo error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error al eliminar imagen:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Cambiar disponibilidad del producto
const toggleAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { isAvailable } = req.body;
        const collection = req.db.collection('products');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de producto no válido' });
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), companyId },
            { 
                $set: {
                    isAvailable: isAvailable,
                    updatedBy: new ObjectId(req.user.id),
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(result);
    } catch (error) {
        console.error('Error al cambiar disponibilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar producto (soft delete)
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const collection = req.db.collection('products');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de producto no válido' });
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), companyId },
            { 
                $set: {
                    isActive: false,
                    updatedBy: new ObjectId(req.user.id),
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto desactivado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener productos por categoría (para el menú público)
const getProductsByCategory = async (req, res) => {
    try {
        const { companyId } = req.params;
        const collection = req.db.collection('products');

        if (!ObjectId.isValid(companyId)) {
            return res.status(400).json({ error: 'ID de empresa no válido' });
        }
        
        const products = await collection.find({
            companyId: new ObjectId(companyId),
            isActive: true,
            isAvailable: true
        }, {
            projection: {
                name: 1,
                price: 1,
                preparationTime: 1,
                image: 1,
                category: 1,
                description: 1,
                observations: 1,
                allergens: 1,
                tags: 1
            }
        }).sort({ category: 1, name: 1 }).toArray();

        // Agrupar por categoría
        const menu = products.reduce((acc, product) => {
            if (!acc[product.category]) {
                acc[product.category] = [];
            }
            acc[product.category].push(product);
            return acc;
        }, {});

        res.json(menu);
    } catch (error) {
        console.error('Error al obtener menú:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    toggleAvailability,
    deleteProduct,
    getProductsByCategory
};

// Exportar middleware de multer por separado
export const uploadMiddleware = upload.single('image');