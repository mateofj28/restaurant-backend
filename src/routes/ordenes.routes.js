// En src/routes/ordenes.routes.js
import { Router } from 'express';
import { ObjectId } from '../config/db.js';
import { TABLE_STATUS } from './tables.routes.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// POST: Crear una nueva orden
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'mesero']), async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const newOrder = req.body;

        // --- Validaciones ---
        // 1. El tipo de pedido es obligatorio
        if (!newOrder.orderType || !['table', 'delivery', 'pickup'].includes(newOrder.orderType)) {
            return res.status(400).json({ error: 'El tipo de pedido es inválido o no fue proporcionado.' });
        }

        // 2. Si es domicilio, el customerId es obligatorio
        if (newOrder.orderType === 'delivery' && !newOrder.customerId) {
            return res.status(400).json({ error: 'Para pedidos a domicilio, el customerId es obligatorio.' });
        }

        // 3. Si es mesa, validar disponibilidad de mesa
        let tableData = null;
        if (newOrder.orderType === 'table') {
            if (!newOrder.tableId && !newOrder.table) {
                return res.status(400).json({ error: 'Para pedidos en mesa, el tableId o número de mesa es obligatorio.' });
            }

            // Verificar disponibilidad de mesa
            const tablesCollection = req.db.collection('tables');

            // Buscar por tableId o por número de mesa
            let tableQuery;
            if (newOrder.tableId) {
                // Validar que tableId sea un ObjectId válido
                if (!ObjectId.isValid(newOrder.tableId)) {
                    return res.status(400).json({ error: 'tableId no es un ObjectId válido.' });
                }
                tableQuery = { _id: new ObjectId(newOrder.tableId), companyId: req.user.companyId };
            } else {
                tableQuery = { number: parseInt(newOrder.table), companyId: req.user.companyId, isActive: true };
            }

            tableData = await tablesCollection.findOne(tableQuery);

            if (!tableData) {
                return res.status(404).json({ error: `Mesa no encontrada.` });
            }

            if (tableData.status !== TABLE_STATUS.AVAILABLE) {
                return res.status(400).json({
                    error: `Mesa ${tableData.number} no está disponible. Estado actual: ${tableData.status}`
                });
            }

            // Verificar capacidad si se proporciona peopleCount
            if (newOrder.peopleCount && tableData.capacity < newOrder.peopleCount) {
                return res.status(400).json({
                    error: `Mesa ${tableData.number} tiene capacidad para ${tableData.capacity} personas, pero se solicitó para ${newOrder.peopleCount}`
                });
            }
        }

        // 4. La lista de productos no puede estar vacía
        if (!newOrder.requestedProducts || newOrder.requestedProducts.length === 0) {
            return res.status(400).json({ error: 'La orden debe contener al menos un producto.' });
        }

        // 5. Validar y enriquecer productos con snapshots
        const productsCollection = req.db.collection('products');
        const enrichedProducts = [];
        let totalAmount = 0;

        for (const requestedProduct of newOrder.requestedProducts) {
            if (!requestedProduct.productId || !requestedProduct.requestedQuantity) {
                return res.status(400).json({
                    error: 'Cada producto debe tener productId y requestedQuantity.'
                });
            }

            // Obtener datos actuales del producto para el snapshot
            const product = await productsCollection.findOne({
                _id: new ObjectId(requestedProduct.productId),
                companyId: new ObjectId(req.user.companyId),
                isActive: true
            });

            if (!product) {
                return res.status(404).json({
                    error: `Producto con ID ${requestedProduct.productId} no encontrado.`
                });
            }

            // Crear el snapshot del producto
            const productSnapshot = {
                name: product.name,
                price: product.price,
                category: product.category || '',
                description: product.description || ''
            };

            // Crear statusByQuantity inicial (todos pendientes)
            const statusByQuantity = [];
            for (let i = 1; i <= requestedProduct.requestedQuantity; i++) {
                statusByQuantity.push({
                    index: i,
                    status: 'pendiente'
                });
            }

            // Calcular subtotal
            const subtotal = product.price * requestedProduct.requestedQuantity;
            totalAmount += subtotal;

            enrichedProducts.push({
                productId: requestedProduct.productId,
                productSnapshot,
                requestedQuantity: parseInt(requestedProduct.requestedQuantity),
                message: requestedProduct.message || '',
                statusByQuantity
            });
        }

        // --- Crear la estructura final de la orden ---
        const orderData = {
            orderType: newOrder.orderType,
            requestedProducts: enrichedProducts,
            itemCount: enrichedProducts.length,
            total: parseFloat(totalAmount.toFixed(2)),
            createdAt: new Date(),
            status: 'received',
            companyId: req.user.companyId,
            createdBy: req.user.userId || null
        };

        // Agregar campos específicos según el tipo de orden
        if (newOrder.orderType === 'table') {
            orderData.tableId = tableData._id.toString();
            orderData.peopleCount = newOrder.peopleCount || 1;
        }

        if (newOrder.orderType === 'delivery') {
            orderData.customerId = newOrder.customerId;
            orderData.deliveryAddress = newOrder.deliveryAddress || '';
        }

        if (newOrder.orderType === 'pickup') {
            orderData.customerName = newOrder.customerName || '';
            orderData.customerPhone = newOrder.customerPhone || '';
        }

        const result = await collection.insertOne(orderData);

        // Si es una orden de mesa, ocupar la mesa
        if (newOrder.orderType === 'table') {
            const tablesCollection = req.db.collection('tables');
            await tablesCollection.updateOne(
                { _id: tableData._id },
                {
                    $set: {
                        status: TABLE_STATUS.OCCUPIED,
                        currentOrder: result.insertedId,
                        occupiedAt: new Date(),
                        occupiedBy: req.user.userId
                    }
                }
            );
        }

        // Devolvemos una respuesta 201 (Created) con el ID del nuevo documento
        res.status(201).json({
            message: 'Orden creada exitosamente',
            orderId: result.insertedId,
            order: {
                ...orderData,
                _id: result.insertedId
            },
            tableStatus: newOrder.orderType === 'table' ? `Mesa ${tableData.number} ocupada exitosamente` : null
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: 'Error interno del servidor al crear la orden' });
    }
});


// GET: Listar todas las órdenes
router.get('/', authenticateToken, requireRole(['admin', 'manager', 'mesero']), async (req, res) => {
    try {
        const collection = req.db.collection('orders');

        // Usar agregación para hacer lookups y traer información completa
        const pipeline = [
            // Filtrar por empresa del usuario autenticado
            {
                $match: {
                    companyId: req.user.companyId
                }
            },
            // Lookup para obtener información de la mesa (si es orden de mesa)
            {
                $lookup: {
                    from: 'tables',
                    let: { tableId: { $toObjectId: '$tableId' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$tableId'] }
                            }
                        },
                        {
                            $project: {
                                number: 1,
                                capacity: 1,
                                location: 1,
                                status: 1
                            }
                        }
                    ],
                    as: 'tableInfo'
                }
            },
            // Lookup para obtener información de la empresa
            {
                $lookup: {
                    from: 'companies',
                    let: { companyId: { $toObjectId: '$companyId' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$companyId'] }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                businessName: 1,
                                address: 1
                            }
                        }
                    ],
                    as: 'companyInfo'
                }
            },
            // Lookup para obtener información del usuario que creó la orden
            {
                $lookup: {
                    from: 'users',
                    let: { createdBy: { $toObjectId: '$createdBy' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$createdBy'] }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                role: 1
                            }
                        }
                    ],
                    as: 'createdByInfo'
                }
            },
            // Reestructurar el resultado
            {
                $addFields: {
                    tableInfo: { $arrayElemAt: ['$tableInfo', 0] },
                    companyInfo: { $arrayElemAt: ['$companyInfo', 0] },
                    createdByInfo: { $arrayElemAt: ['$createdByInfo', 0] }
                }
            },
            // Ordenar del más nuevo al más viejo
            {
                $sort: { createdAt: -1 }
            }
        ];

        const orders = await collection.aggregate(pipeline).toArray();
        
        // Procesar las órdenes para limpiar la estructura
        const processedOrders = orders.map(order => {
            const processedOrder = {
                _id: order._id,
                orderType: order.orderType,
                requestedProducts: order.requestedProducts,
                itemCount: order.itemCount,
                total: order.total,
                createdAt: order.createdAt,
                status: order.status,
                companyId: order.companyId,
                createdBy: order.createdBy
            };

            // Agregar campos específicos según el tipo de orden
            if (order.orderType === 'table') {
                processedOrder.tableId = order.tableId;
                processedOrder.peopleCount = order.peopleCount;
                processedOrder.tableInfo = order.tableInfo || null;
            }

            if (order.orderType === 'delivery') {
                processedOrder.customerId = order.customerId;
                processedOrder.deliveryAddress = order.deliveryAddress;
            }

            if (order.orderType === 'pickup') {
                processedOrder.customerName = order.customerName;
                processedOrder.customerPhone = order.customerPhone;
            }

            // Agregar información de referencias
            processedOrder.companyInfo = order.companyInfo || null;
            processedOrder.createdByInfo = order.createdByInfo || null;

            return processedOrder;
        });

        res.status(200).json(processedOrders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: 'Error al obtener las órdenes' });
    }
});

// GET: Obtener una orden específica por su ID
router.get('/:id', authenticateToken, requireRole(['admin', 'manager', 'mesero']), async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de orden no válido' });
        }

        // Usar agregación para obtener información completa
        const pipeline = [
            {
                $match: { _id: new ObjectId(id) }
            },
            // Lookup para obtener información de la mesa (si es orden de mesa)
            {
                $lookup: {
                    from: 'tables',
                    let: { tableId: { $toObjectId: '$tableId' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$tableId'] }
                            }
                        },
                        {
                            $project: {
                                number: 1,
                                capacity: 1,
                                location: 1,
                                status: 1
                            }
                        }
                    ],
                    as: 'tableInfo'
                }
            },
            // Lookup para obtener información de la empresa
            {
                $lookup: {
                    from: 'companies',
                    let: { companyId: { $toObjectId: '$companyId' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$companyId'] }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                businessName: 1,
                                address: 1
                            }
                        }
                    ],
                    as: 'companyInfo'
                }
            },
            // Lookup para obtener información del usuario que creó la orden
            {
                $lookup: {
                    from: 'users',
                    let: { createdBy: { $toObjectId: '$createdBy' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$createdBy'] }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                email: 1,
                                role: 1
                            }
                        }
                    ],
                    as: 'createdByInfo'
                }
            },
            // Reestructurar el resultado
            {
                $addFields: {
                    tableInfo: { $arrayElemAt: ['$tableInfo', 0] },
                    companyInfo: { $arrayElemAt: ['$companyInfo', 0] },
                    createdByInfo: { $arrayElemAt: ['$createdByInfo', 0] }
                }
            }
        ];

        const orders = await collection.aggregate(pipeline).toArray();
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const order = orders[0];
        
        // Procesar la orden para limpiar la estructura
        const processedOrder = {
            _id: order._id,
            orderType: order.orderType,
            requestedProducts: order.requestedProducts,
            itemCount: order.itemCount,
            total: order.total,
            createdAt: order.createdAt,
            status: order.status,
            companyId: order.companyId,
            createdBy: order.createdBy
        };

        // Agregar campos específicos según el tipo de orden
        if (order.orderType === 'table') {
            processedOrder.tableId = order.tableId;
            processedOrder.peopleCount = order.peopleCount;
            processedOrder.tableInfo = order.tableInfo || null;
        }

        if (order.orderType === 'delivery') {
            processedOrder.customerId = order.customerId;
            processedOrder.deliveryAddress = order.deliveryAddress;
        }

        if (order.orderType === 'pickup') {
            processedOrder.customerName = order.customerName;
            processedOrder.customerPhone = order.customerPhone;
        }

        // Agregar información de referencias
        processedOrder.companyInfo = order.companyInfo || null;
        processedOrder.createdByInfo = order.createdByInfo || null;

        res.status(200).json(processedOrder);
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ error: 'Error al obtener la orden' });
    }
});

// UPDATE: Actualizar una orden por su ID - IMPLEMENTACIÓN COMPLETA
router.put('/:id', authenticateToken, requireRole(['admin', 'manager', 'mesero']), async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const { id } = req.params;
        const { orderType, tableId, peopleCount, requestedProducts } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de orden no válido' });
        }

        // 1. OBTENER ORDEN ACTUAL
        const currentOrder = await collection.findOne({ _id: new ObjectId(id) });
        if (!currentOrder) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        // 2. CASO ESPECIAL: Si no hay productos, eliminar orden
        if (!requestedProducts || requestedProducts.length === 0) {
            const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });
            
            // Liberar mesa si era orden de mesa
            if (currentOrder.orderType === 'table' && currentOrder.tableId) {
                const tablesCollection = req.db.collection('tables');
                await tablesCollection.updateOne(
                    { _id: new ObjectId(currentOrder.tableId) },
                    {
                        $set: {
                            status: TABLE_STATUS.AVAILABLE,
                            currentOrder: null,
                            occupiedAt: null,
                            occupiedBy: null
                        }
                    }
                );
            }

            return res.status(200).json({
                message: 'Orden eliminada automáticamente porque no tiene productos',
                deleted: true,
                orderId: id
            });
        }

        // 3. VALIDAR PRODUCTOS NUEVOS (solo los que no existían antes)
        const productsCollection = req.db.collection('products');
        const newProductIds = requestedProducts
            .filter(p => !currentOrder.requestedProducts.some(cp => cp.productId === p.productId))
            .map(p => p.productId);

        for (const productId of newProductIds) {
            const product = await productsCollection.findOne({
                _id: new ObjectId(productId),
                companyId: new ObjectId(req.user.companyId),
                isActive: true
            });

            if (!product) {
                return res.status(404).json({
                    error: `Producto con ID ${productId} no encontrado.`
                });
            }
        }

        // 4. PROCESAR PRODUCTOS CON LÓGICA INTELIGENTE
        const processedProducts = requestedProducts.map(product => {
            // Buscar si el producto ya existía en la orden
            const existingProduct = currentOrder.requestedProducts.find(p => p.productId === product.productId);

            if (existingProduct) {
                // PRODUCTO EXISTENTE: Mantener estados existentes según la cantidad
                if (existingProduct.requestedQuantity === product.requestedQuantity) {
                    // Cantidad igual: mantener estados existentes
                    return {
                        ...product,
                        statusByQuantity: existingProduct.statusByQuantity
                    };
                } else if (existingProduct.requestedQuantity < product.requestedQuantity) {
                    // Cantidad aumentó: mantener estados existentes + agregar nuevos como 'pendiente'
                    const newStatuses = [];
                    for (let i = 0; i < product.requestedQuantity; i++) {
                        if (i < existingProduct.statusByQuantity.length) {
                            newStatuses.push(existingProduct.statusByQuantity[i]);
                        } else {
                            newStatuses.push({ index: i + 1, status: 'pendiente' });
                        }
                    }
                    return {
                        ...product,
                        statusByQuantity: newStatuses
                    };
                } else {
                    // Cantidad disminuyó: mantener solo los primeros estados
                    return {
                        ...product,
                        statusByQuantity: existingProduct.statusByQuantity.slice(0, product.requestedQuantity)
                    };
                }
            } else {
                // PRODUCTO NUEVO: usar estados que vienen del frontend o crear como 'pendiente'
                if (!product.statusByQuantity || product.statusByQuantity.length !== product.requestedQuantity) {
                    const newStatuses = [];
                    for (let i = 0; i < product.requestedQuantity; i++) {
                        newStatuses.push({ index: i + 1, status: 'pendiente' });
                    }
                    return {
                        ...product,
                        statusByQuantity: newStatuses
                    };
                }
                return product;
            }
        });

        // 5. CALCULAR TOTAL
        const total = processedProducts.reduce((sum, product) => {
            return sum + (product.productSnapshot.price * product.requestedQuantity);
        }, 0);

        // 6. VALIDAR Y MANEJAR CAMBIO DE MESA
        let newTableData = null;
        if (orderType === 'table') {
            if (!tableId) {
                return res.status(400).json({ error: 'tableId es obligatorio para órdenes de mesa' });
            }

            // Validar que la nueva mesa esté disponible (si cambió)
            if (currentOrder.tableId !== tableId) {
                const tablesCollection = req.db.collection('tables');
                newTableData = await tablesCollection.findOne({
                    _id: new ObjectId(tableId),
                    companyId: req.user.companyId
                });

                if (!newTableData) {
                    return res.status(404).json({ error: 'Mesa no encontrada' });
                }

                if (newTableData.status !== TABLE_STATUS.AVAILABLE) {
                    return res.status(400).json({
                        error: `Mesa ${newTableData.number} no está disponible. Estado actual: ${newTableData.status}`
                    });
                }
            }
        }

        // 7. PREPARAR DATOS DE ACTUALIZACIÓN
        const updateData = {
            orderType,
            requestedProducts: processedProducts,
            itemCount: processedProducts.length,
            total: parseFloat(total.toFixed(2)),
            updatedAt: new Date()
        };

        // Campos específicos según tipo de orden
        if (orderType === 'table') {
            updateData.tableId = tableId;
            updateData.peopleCount = peopleCount || 1;
            // Limpiar campos de otros tipos
            updateData.customerId = null;
            updateData.deliveryAddress = null;
            updateData.customerName = null;
            updateData.customerPhone = null;
        } else if (orderType === 'delivery') {
            updateData.tableId = null;
            updateData.peopleCount = null;
            updateData.customerId = req.body.customerId || null;
            updateData.deliveryAddress = req.body.deliveryAddress || '';
            updateData.customerName = null;
            updateData.customerPhone = null;
        } else if (orderType === 'pickup') {
            updateData.tableId = null;
            updateData.peopleCount = null;
            updateData.customerId = null;
            updateData.deliveryAddress = null;
            updateData.customerName = req.body.customerName || '';
            updateData.customerPhone = req.body.customerPhone || '';
        }

        // 8. ACTUALIZAR ORDEN
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        // 9. MANEJAR CAMBIOS DE MESA
        const tablesCollection = req.db.collection('tables');
        
        // Liberar mesa anterior si cambió el tipo o la mesa
        if (currentOrder.orderType === 'table' && currentOrder.tableId && 
            (orderType !== 'table' || currentOrder.tableId !== tableId)) {
            await tablesCollection.updateOne(
                { _id: new ObjectId(currentOrder.tableId) },
                {
                    $set: {
                        status: TABLE_STATUS.AVAILABLE,
                        currentOrder: null,
                        occupiedAt: null,
                        occupiedBy: null
                    }
                }
            );
        }

        // Ocupar nueva mesa si es necesario
        if (orderType === 'table' && newTableData) {
            await tablesCollection.updateOne(
                { _id: new ObjectId(tableId) },
                {
                    $set: {
                        status: TABLE_STATUS.OCCUPIED,
                        currentOrder: result._id,
                        occupiedAt: new Date(),
                        occupiedBy: req.user.userId
                    }
                }
            );
        }

        // 10. DEVOLVER RESPUESTA ENRIQUECIDA
        const enrichedOrder = await getEnrichedOrder(collection, result._id);
        res.status(200).json(enrichedOrder);

    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la orden' });
    }
});

// Función auxiliar para obtener orden enriquecida (reutilizable)
async function getEnrichedOrder(collection, orderId) {
    const pipeline = [
        {
            $match: { _id: new ObjectId(orderId) }
        },
        // Lookup para obtener información de la mesa
        {
            $lookup: {
                from: 'tables',
                let: { tableId: { $toObjectId: '$tableId' } },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$_id', '$$tableId'] }
                        }
                    },
                    {
                        $project: {
                            number: 1,
                            capacity: 1,
                            location: 1,
                            status: 1
                        }
                    }
                ],
                as: 'tableInfo'
            }
        },
        // Lookup para obtener información de la empresa
        {
            $lookup: {
                from: 'companies',
                let: { companyId: { $toObjectId: '$companyId' } },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$_id', '$$companyId'] }
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            businessName: 1,
                            address: 1
                        }
                    }
                ],
                as: 'companyInfo'
            }
        },
        // Lookup para obtener información del usuario
        {
            $lookup: {
                from: 'users',
                let: { createdBy: { $toObjectId: '$createdBy' } },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$_id', '$$createdBy'] }
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            email: 1,
                            role: 1
                        }
                    }
                ],
                as: 'createdByInfo'
            }
        },
        {
            $addFields: {
                tableInfo: { $arrayElemAt: ['$tableInfo', 0] },
                companyInfo: { $arrayElemAt: ['$companyInfo', 0] },
                createdByInfo: { $arrayElemAt: ['$createdByInfo', 0] }
            }
        }
    ];

    const orders = await collection.aggregate(pipeline).toArray();
    
    if (orders.length === 0) {
        return null;
    }

    const order = orders[0];
    
    // Procesar la orden para limpiar la estructura
    const processedOrder = {
        _id: order._id,
        orderType: order.orderType,
        requestedProducts: order.requestedProducts,
        itemCount: order.itemCount,
        total: order.total,
        createdAt: order.createdAt,
        status: order.status,
        companyId: order.companyId,
        createdBy: order.createdBy
    };

    // Agregar campos específicos según el tipo de orden
    if (order.orderType === 'table') {
        processedOrder.tableId = order.tableId;
        processedOrder.peopleCount = order.peopleCount;
        processedOrder.tableInfo = order.tableInfo || null;
    }

    if (order.orderType === 'delivery') {
        processedOrder.customerId = order.customerId;
        processedOrder.deliveryAddress = order.deliveryAddress;
    }

    if (order.orderType === 'pickup') {
        processedOrder.customerName = order.customerName;
        processedOrder.customerPhone = order.customerPhone;
    }

    // Agregar información de referencias
    processedOrder.companyInfo = order.companyInfo || null;
    processedOrder.createdByInfo = order.createdByInfo || null;

    // Agregar campos adicionales si existen
    if (order.updatedAt) processedOrder.updatedAt = order.updatedAt;
    if (order.closedAt) processedOrder.closedAt = order.closedAt;

    return processedOrder;
}

// PATCH: Cerrar cocina - Endpoint específico para el botón "Cerrar cocina"
router.patch('/:id/close', authenticateToken, requireRole(['admin', 'manager', 'mesero']), async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de orden no válido' });
        }

        // Obtener la orden actual
        const currentOrder = await collection.findOne({ _id: new ObjectId(id) });

        if (!currentOrder) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        // Preparar la actualización para cerrar cocina
        const updateData = {
            status: 'closed',
            closedAt: new Date()
        };

        // Actualizar automáticamente los estados de productos que no están entregados
        if (currentOrder.requestedProducts) {
            updateData.requestedProducts = currentOrder.requestedProducts.map(product => {
                const updatedProduct = { ...product };
                updatedProduct.statusByQuantity = product.statusByQuantity.map(statusItem => {
                    // Solo cambiar estados que no sean "entregado"
                    if (statusItem.status !== 'entregado') {
                        return { status: 'listo para entregar' };
                    }
                    return statusItem;
                });
                return updatedProduct;
            });
        }

        // Actualizar la orden
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (result) {
            // Si es una orden de mesa, liberar la mesa
            if (result.orderType === 'table' && result.tableId) {
                const tablesCollection = req.db.collection('tables');
                await tablesCollection.updateOne(
                    { _id: new ObjectId(result.tableId) },
                    {
                        $set: {
                            status: TABLE_STATUS.AVAILABLE,
                            currentOrder: null,
                            occupiedAt: null,
                            occupiedBy: null
                        }
                    }
                );
            }

            res.status(200).json({
                message: 'Cocina cerrada exitosamente',
                order: result,
                tableStatus: result.orderType === 'table' ? 'Mesa liberada exitosamente' : null
            });
        } else {
            res.status(404).json({ error: 'Orden no encontrada' });
        }
    } catch (error) {
        console.error("Error closing kitchen:", error);
        res.status(500).json({ error: 'Error interno del servidor al cerrar la cocina' });
    }
});

export default router;