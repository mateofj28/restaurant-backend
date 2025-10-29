import Product from '../models/Product.js';
import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

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

        const companyId = req.user.companyId;
        
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

        const products = await Product.find(filters)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(filters);

        // Estadísticas por categoría
        const stats = await Product.aggregate([
            { $match: { companyId: req.user.companyId, isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    available: { $sum: { $cond: ['$isAvailable', 1, 0] } },
                    avgPrice: { $avg: '$price' },
                    avgPrepTime: { $avg: '$preparationTime' }
                }
            }
        ]);

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
        const companyId = req.user.companyId;

        const product = await Product.findOne({ _id: id, companyId })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

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

        const productData = {
            ...req.body,
            companyId: req.user.companyId,
            createdBy: req.user.id
        };

        // Manejar imagen si se subió
        if (req.file) {
            productData.image = {
                url: `/uploads/products/${req.file.filename}`,
                filename: req.file.filename,
                publicId: null
            };
        }

        const product = new Product(productData);
        await product.save();

        await product.populate('createdBy', 'name email');

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
        const companyId = req.user.companyId;

        const product = await Product.findOne({ _id: id, companyId });
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const updateData = {
            ...req.body,
            updatedBy: req.user.id
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

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy updatedBy', 'name email');

        res.json(updatedProduct);
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
        const companyId = req.user.companyId;

        const product = await Product.findOneAndUpdate(
            { _id: id, companyId },
            { 
                isAvailable: isAvailable,
                updatedBy: req.user.id
            },
            { new: true }
        ).populate('createdBy updatedBy', 'name email');

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error al cambiar disponibilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar producto (soft delete)
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const product = await Product.findOneAndUpdate(
            { _id: id, companyId },
            { 
                isActive: false,
                updatedBy: req.user.id
            },
            { new: true }
        );

        if (!product) {
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
        
        const products = await Product.find({
            companyId,
            isActive: true,
            isAvailable: true
        }).select('name price preparationTime image category description observations allergens tags')
          .sort({ category: 1, name: 1 });

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