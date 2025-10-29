import { validationResult } from 'express-validator';
import { ObjectId } from '../config/db.js';

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

        const collection = req.db.collection('customers');
        const companyId = new ObjectId(req.user.companyId);
        
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

        const customers = await collection.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();

        const total = await collection.countDocuments(filters);

        // Estadísticas
        const stats = await collection.aggregate([
            { $match: { companyId: companyId, isActive: true } },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 },
                    totalOrders: { $sum: { $size: { $ifNull: ['$orderHistory', []] } } },
                    avgOrdersPerCustomer: { $avg: { $size: { $ifNull: ['$orderHistory', []] } } }
                }
            }
        ]).toArray();

        // Contar clientes por ciudad
        const citiesStats = await collection.aggregate([
            { $match: { companyId: companyId, isActive: true } },
            {
                $group: {
                    _id: '$city',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

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
        const collection = req.db.collection('customers');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de cliente no válido' });
        }

        const customer = await collection.findOne({ 
            _id: new ObjectId(id), 
            companyId 
        });

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

        const collection = req.db.collection('customers');
        const companyId = new ObjectId(req.user.companyId);

        // Verificar email único por empresa
        const existingCustomer = await collection.findOne({
            companyId,
            email: req.body.email
        });

        if (existingCustomer) {
            return res.status(400).json({ error: 'Ya existe un cliente con este correo electrónico en la empresa' });
        }

        const customerData = {
            ...req.body,
            companyId,
            createdBy: new ObjectId(req.user.id),
            createdAt: new Date(),
            isActive: true,
            orderHistory: []
        };

        const result = await collection.insertOne(customerData);
        const customer = await collection.findOne({ _id: result.insertedId });

        res.status(201).json(customer);
    } catch (error) {
        console.error('Error al crear cliente:', error);
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
        const collection = req.db.collection('customers');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de cliente no válido' });
        }

        // Verificar que el cliente existe
        const customer = await collection.findOne({ 
            _id: new ObjectId(id), 
            companyId 
        });
        
        if (!customer) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Verificar email único si se está cambiando
        if (req.body.email && req.body.email !== customer.email) {
            const existingCustomer = await collection.findOne({
                companyId,
                email: req.body.email,
                _id: { $ne: new ObjectId(id) }
            });

            if (existingCustomer) {
                return res.status(400).json({ error: 'Ya existe un cliente con este correo electrónico' });
            }
        }

        const updateData = {
            ...req.body,
            updatedBy: new ObjectId(req.user.id),
            updatedAt: new Date()
        };

        // No permitir cambiar campos críticos
        delete updateData.companyId;
        delete updateData.orderHistory;
        delete updateData.createdAt;
        delete updateData.createdBy;

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), companyId },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        res.json(result);
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Desactivar cliente (soft delete)
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const collection = req.db.collection('customers');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de cliente no válido' });
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
        const collection = req.db.collection('customers');
        const companyId = new ObjectId(req.user.companyId);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de cliente no válido' });
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), companyId },
            {
                $push: {
                    orderHistory: {
                        orderId: new ObjectId(orderId),
                        totalAmount,
                        orderDate: new Date()
                    }
                },
                $set: {
                    updatedBy: new ObjectId(req.user.id),
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(result);
    } catch (error) {
        console.error('Error al agregar orden al historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Buscar clientes por email o teléfono (para órdenes rápidas)
const searchCustomers = async (req, res) => {
    try {
        const { query } = req.query;
        const collection = req.db.collection('customers');
        const companyId = new ObjectId(req.user.companyId);

        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'La búsqueda debe tener al menos 3 caracteres' });
        }

        const customers = await collection.find({
            companyId,
            isActive: true,
            $or: [
                { fullName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phoneNumber: { $regex: query, $options: 'i' } }
            ]
        }, {
            projection: {
                fullName: 1,
                email: 1,
                phoneNumber: 1,
                deliveryAddress: 1,
                city: 1,
                state: 1
            }
        })
        .limit(10)
        .toArray();

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