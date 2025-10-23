// En src/routes/ordenes.routes.js
import { Router } from 'express';
import { ObjectId } from '../config/db.js';

const router = Router();

// POST: Crear una nueva orden
router.post('/', async (req, res) => {
    try {
        const collection = req.db.collection('ordenes');
        const nuevaOrden = req.body;

        // --- Validaciones ---
        // 1. El tipo de pedido es obligatorio
        if (!nuevaOrden.tipoPedido || !['mesa', 'domicilio', 'recoger'].includes(nuevaOrden.tipoPedido)) {
            return res.status(400).json({ error: 'El tipo de pedido es inválido o no fue proporcionado.' });
        }

        // 2. Si es domicilio, el idCliente es obligatorio
        if (nuevaOrden.tipoPedido === 'domicilio' && !nuevaOrden.idCliente) {
            return res.status(400).json({ error: 'Para pedidos a domicilio, el idCliente es obligatorio.' });
        }

        // 3. La lista de productos no puede estar vacía
        if (!nuevaOrden.productosSolicitados || nuevaOrden.productosSolicitados.length === 0) {
            return res.status(400).json({ error: 'La orden debe contener al menos un producto.' });
        }

        // --- Añadir datos automáticos del servidor ---
        nuevaOrden.fechaCreacion = new Date();
        nuevaOrden.estadoGeneral = 'recibida'; // Estado inicial de la orden

        const result = await collection.insertOne(nuevaOrden);

        // Devolvemos una respuesta 201 (Created) con el ID del nuevo documento
        res.status(201).json({
            message: 'Orden creada exitosamente',
            orderId: result.insertedId
        });

    } catch (error) {
        console.error("Error al crear la orden:", error);
        res.status(500).json({ error: 'Error interno del servidor al crear la orden' });
    }
});


// GET: Listar todas las órdenes
router.get('/', async (req, res) => {
    try {
        const collection = req.db.collection('ordenes');
        const ordenes = await collection.find({}).sort({ fechaCreacion: -1 }).toArray(); // -1 para ordenar del más nuevo al más viejo
        res.status(200).json(ordenes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las órdenes' });
    }
});

// GET: Obtener una orden específica por su ID
router.get('/:id', async (req, res) => {
    try {
        const collection = req.db.collection('ordenes');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de orden no válido' });
        }

        const orden = await collection.findOne({ _id: new ObjectId(id) });

        if (orden) {
            res.status(200).json(orden);
        } else {
            res.status(404).json({ error: 'Orden no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la orden' });
    }
});

// UPDATE: Actualizar una orden por su ID
// En src/routes/ordenes.routes.js

// UPDATE: Actualizar una orden por su ID
router.put('/:id', async (req, res) => {
    try {
        const collection = req.db.collection('ordenes');
        const { id } = req.params;
        const ordenActualizada = req.body;

        // --- INICIO DE BLOQUE DE DEPURACIÓN ---
        console.log('--- DEPURACIÓN DE RUTA PUT ---');
        console.log('ID recibido en la URL (req.params.id):', id);
        console.log('¿Es un ObjectId válido?', ObjectId.isValid(id));
        console.log('Cuerpo (req.body) recibido:', JSON.stringify(ordenActualizada, null, 2));
        // --- FIN DE BLOQUE DE DEPURACIÓN ---

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de orden no válido' });
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: ordenActualizada },
            { returnDocument: 'after' }
        );

        // --- INICIO DE BLOQUE DE DEPURACIÓN ---
        console.log('Resultado de findOneAndUpdate:', result);
        console.log('--- FIN DE DEPURACIÓN ---');
        // --- FIN DE BLOQUE DE DEPURACIÓN ---

        if (result) {
            res.status(200).json(result.value);
        } else {
            res.status(404).json({ error: 'Orden no encontrada' });
        }
    } catch (error) {
        console.error("Error al actualizar la orden:", error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la orden' });
    }
});

export default router;