// En src/routes/ordenes.routes.js
import { Router } from 'express';
import { ObjectId } from '../config/db.js';

const router = Router();

// POST: Crear una nueva orden
router.post('/', async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const newOrder = req.body;

        // --- Validaciones ---
        // 1. El tipo de pedido es obligatorio
        if (!newOrder.orderType || !['table', 'delivery', 'pickup'].includes(newOrder.orderType)) {
            return res.status(400).json({ error: 'El tipo de pedido es inválido o no fue proporcionado.' });
        }

        // 2. Si es domicilio, el idCliente es obligatorio
        if (newOrder.orderType === 'delivery' && !newOrder.customerId) {
            return res.status(400).json({ error: 'Para pedidos a domicilio, el idCliente es obligatorio.' });
        }

        // 3. La lista de productos no puede estar vacía
        if (!newOrder.requestedProducts || newOrder.requestedProducts.length === 0) {
            return res.status(400).json({ error: 'La orden debe contener al menos un producto.' });
        }

        // --- Añadir datos automáticos del servidor ---
        newOrder.createdAt = new Date();
        newOrder.status = 'received'; // Estado inicial de la orden

        const result = await collection.insertOne(newOrder);

        // Devolvemos una respuesta 201 (Created) con el ID del nuevo documento
        res.status(201).json({
            message: 'Orden creada exitosamente',
            orderId: result.insertedId
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: 'Error interno del servidor al crear la orden' });
    }
});


// GET: Listar todas las órdenes
router.get('/', async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const orders = await collection.find({}).sort({ createdAt: -1 }).toArray(); // -1 para ordenar del más nuevo al más viejo
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las órdenes' });
    }
});

// GET: Obtener una orden específica por su ID
router.get('/:id', async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de orden no válido' });
        }

        const order = await collection.findOne({ _id: new ObjectId(id) });

        if (order) {
            res.status(200).json(order);
        } else {
            res.status(404).json({ error: 'Orden no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la orden' });
    }
});

// UPDATE: Actualizar una orden por su ID
router.put('/:id', async (req, res) => {
    try {
        const collection = req.db.collection('orders');
        const { id } = req.params;
        const updatedOrder = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de orden no válido' });
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updatedOrder },
            { returnDocument: 'after' }
        );

        if (result) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ error: 'Orden no encontrada' });
        }
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la orden' });
    }
});

export default router;