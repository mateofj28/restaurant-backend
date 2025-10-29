import Customer from '../models/Customer.js';
import { validationResult } from 'express-validator';

// Obtener todos los clientes con filtros
const getCustomers = async (req, res) => {
    try {
        const { 
            isActive = 'true', 
            search,
            city,
            state,
            page = 1,
            limit = 20,
            sortBy = 'fullName',
            sortOrder = 'asc'
        } = req.query;

        const companyId = req.user.companyId;
        
        // Construir filtros
        const filters = { companyId };
        
        if (isActive !== 'all') filters.isActive = isActive === 'true';
        if (city) filters.city = { $regex: city, $options: 'i' };
        if (state) filters.state = { $regex: state, $options: 'i' };
        
        // Búsqueda por texto
        if (search) {
            filters.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Ordenamiento
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const customers = await Customer.find(filters)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Customer.countDocuments(filters);

        // Estadísticas
        const stats = await Customer.aggregate([
            { $match: { companyId: req.user.companyId, isActive: true } },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 },
                    totalOrders: { $sum: { $size: '$orderHistory' } },
                    avgOrdersPerCustomer: { $avg: { $size: '$orderHistory' } },
                    topCities: { $push: '$city' }
                }
            }
        ]);

        // Contar clientes por ciudad
        const citiesStats = await Customer.aggregate([
            { $match: { companyId: req.user.companyId, isActive: true } },
            {
                $group: {
                    _id: '$city',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            customers,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            },
            stats: stats[0] || { totalCustomers: 0, totalOrders: 0, avgOrdersPerCustomer: 0 },
            citiesStats
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener cliente por ID
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const customer = await Customer.findOne({ _id: id, companyId })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('orderHistory.orderId', 'orderNumber status totalAmount createdAt');

        if (!customer) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(customer);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Crear nuevo cliente
const createCustomer = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const customerData = {
            ...req.body,
            companyId: req.user.companyId,
            createdBy: req.user.id
        };

        const customer = new Customer(customerData);
        await customer.save();

        await customer.populate('createdBy', 'name email');

        res.status(201).json(customer);
    } catch (error) {
        console.error('Error al crear cliente:', error);
        
        if (error.code === 'DUPLICATE_EMAIL') {
            return res.status(400).json({ error: error.message });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Ya existe un cliente con este correo electrónico' });
        }
        
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Actualizar cliente
const updateCustomer = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const companyId = req.user.companyId;

        const customer = await Customer.findOne({ _id: id, companyId });
        if (!customer) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const updateData = {
            ...req.body,
            updatedBy: req.user.id
        };

        // No permitir cambiar companyId
        delete updateData.companyId;
        delete updateData.orderHistory;

        const updatedCustomer = await Customer.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy updatedBy', 'name email');

        res.json(updatedCustomer);
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        
        if (error.code === 'DUPLICATE_EMAIL') {
            return res.status(400).json({ error: error.message });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Ya existe un cliente con este correo electrónico' });
        }
        
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Desactivar cliente (soft delete)
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const customer = await Customer.findOneAndUpdate(
            { _id: id, companyId },
            { 
                isActive: false,
                updatedBy: req.user.id
            },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente desactivado correctamente' });
    } catch (error) {
        console.error('Error al desactivar cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Agregar orden al historial del cliente
const addOrderToHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderId, totalAmount } = req.body;
        const companyId = req.user.companyId;

        const customer = await Customer.findOneAndUpdate(
            { _id: id, companyId },
            {
                $push: {
                    orderHistory: {
                        orderId,
                        totalAmount,
                        orderDate: new Date()
                    }
                },
                updatedBy: req.user.id
            },
            { new: true }
        ).populate('createdBy updatedBy', 'name email');

        if (!customer) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(customer);
    } catch (error) {
        console.error('Error al agregar orden al historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Buscar clientes por email o teléfono (para órdenes rápidas)
const searchCustomers = async (req, res) => {
    try {
        const { query } = req.query;
        const companyId = req.user.companyId;

        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'La búsqueda debe tener al menos 3 caracteres' });
        }

        const customers = await Customer.find({
            companyId,
            isActive: true,
            $or: [
                { fullName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phoneNumber: { $regex: query, $options: 'i' } }
            ]
        })
        .select('fullName email phoneNumber deliveryAddress city state')
        .limit(10);

        res.json(customers);
    } catch (error) {
        console.error('Error en búsqueda de clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addOrderToHistory,
    searchCustomers
};