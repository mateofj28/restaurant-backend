// En src/routes/tables.routes.js
import { Router } from 'express';
import { ObjectId } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Estados de mesa
const TABLE_STATUS = {
    AVAILABLE: 'available',      // Disponible
    OCCUPIED: 'occupied',        // Ocupada
    RESERVED: 'reserved',        // Reservada
    CLEANING: 'cleaning',        // En limpieza
    OUT_OF_SERVICE: 'out_of_service' // Fuera de servicio
};

// POST: Crear una nueva mesa
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const collection = req.db.collection('tables');
        const newTable = req.body;

        // --- Validaciones ---
        if (!newTable.number || !newTable.capacity) {
            return res.status(400).json({ 
                error: 'Número de mesa y capacidad son obligatorios' 
            });
        }

        if (!req.user.companyId) {
            return res.status(400).json({ 
                error: 'Usuario debe estar asociado a una empresa' 
            });
        }

        // Verificar si ya existe una mesa con ese número en la empresa
        const existingTable = await collection.findOne({ 
            number: newTable.number,
            companyId: req.user.companyId
        });

        if (existingTable) {
            return res.status(400).json({ 
                error: `Ya existe una mesa con el número ${newTable.number} en esta empresa` 
            });
        }

        // --- Estructura de la mesa ---
        const table = {
            number: parseInt(newTable.number),
            capacity: parseInt(newTable.capacity),
            status: newTable.status || TABLE_STATUS.AVAILABLE,
            companyId: req.user.companyId,
            
            // Información adicional
            location: newTable.location || '', // Ej: "Terraza", "Salón principal", "VIP"
            description: newTable.description || '',
            isActive: true,
            
            // Información de ocupación actual
            currentOrder: null, // ID de la orden actual si está ocupada
            occupiedAt: null,   // Cuándo se ocupó
            occupiedBy: null,   // Usuario que la ocupó
            
            // Metadatos
            createdAt: new Date(),
            createdBy: req.user.userId,
            updatedAt: new Date()
        };

        const result = await collection.insertOne(table);

        res.status(201).json({
            message: 'Mesa creada exitosamente',
            table: {
                id: result.insertedId,
                number: table.number,
                capacity: table.capacity,
                status: table.status,
                location: table.location,
                companyId: table.companyId
            }
        });

    } catch (error) {
        console.error("Error creating table:", error);
        res.status(500).json({ error: 'Error interno del servidor al crear la mesa' });
    }
});

// GET: Listar todas las mesas de la empresa
router.get('/', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('tables');
        const { status, isActive = 'true' } = req.query;

        if (!req.user.companyId) {
            return res.status(400).json({ 
                error: 'Usuario debe estar asociado a una empresa' 
            });
        }

        // Filtros
        const filter = { 
            companyId: req.user.companyId,
            isActive: isActive === 'true'
        };

        if (status) {
            filter.status = status;
        }

        const tables = await collection
            .find(filter)
            .sort({ number: 1 }) // Ordenar por número de mesa
            .toArray();

        // Agregar información de estadísticas
        const stats = {
            total: tables.length,
            available: tables.filter(t => t.status === TABLE_STATUS.AVAILABLE).length,
            occupied: tables.filter(t => t.status === TABLE_STATUS.OCCUPIED).length,
            reserved: tables.filter(t => t.status === TABLE_STATUS.RESERVED).length,
            cleaning: tables.filter(t => t.status === TABLE_STATUS.CLEANING).length,
            outOfService: tables.filter(t => t.status === TABLE_STATUS.OUT_OF_SERVICE).length
        };

        res.status(200).json({
            tables,
            stats
        });

    } catch (error) {
        console.error("Error fetching tables:", error);
        res.status(500).json({ error: 'Error al obtener las mesas' });
    }
});

// GET: Obtener una mesa específica por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('tables');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de mesa no válido' });
        }

        const table = await collection.findOne({ 
            _id: new ObjectId(id),
            companyId: req.user.companyId
        });

        if (!table) {
            return res.status(404).json({ error: 'Mesa no encontrada' });
        }

        // Si la mesa está ocupada, obtener información de la orden actual
        if (table.currentOrder) {
            const ordersCollection = req.db.collection('orders');
            const currentOrder = await ordersCollection.findOne({ 
                _id: new ObjectId(table.currentOrder) 
            });
            table.orderDetails = currentOrder;
        }

        res.status(200).json(table);

    } catch (error) {
        console.error("Error fetching table:", error);
        res.status(500).json({ error: 'Error al obtener la mesa' });
    }
});

// PUT: Actualizar una mesa
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('tables');
        const { id } = req.params;
        const updates = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de mesa no válido' });
        }

        // Verificar que la mesa pertenece a la empresa del usuario
        const existingTable = await collection.findOne({ 
            _id: new ObjectId(id),
            companyId: req.user.companyId
        });

        if (!existingTable) {
            return res.status(404).json({ error: 'Mesa no encontrada' });
        }

        // Si se está cambiando el número, verificar que no exista otra mesa con ese número
        if (updates.number && updates.number !== existingTable.number) {
            const duplicateTable = await collection.findOne({
                number: parseInt(updates.number),
                companyId: req.user.companyId,
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateTable) {
                return res.status(400).json({ 
                    error: `Ya existe otra mesa con el número ${updates.number}` 
                });
            }
        }

        // Campos que no se pueden actualizar directamente
        delete updates._id;
        delete updates.companyId;
        delete updates.createdAt;
        delete updates.createdBy;
        delete updates.currentOrder; // Se maneja por separado
        delete updates.occupiedAt;
        delete updates.occupiedBy;

        // Agregar timestamp de actualización
        updates.updatedAt = new Date();
        updates.updatedBy = req.user.userId;

        // Convertir números si vienen como string
        if (updates.number) updates.number = parseInt(updates.number);
        if (updates.capacity) updates.capacity = parseInt(updates.capacity);

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updates },
            { returnDocument: 'after' }
        );

        res.status(200).json({
            message: 'Mesa actualizada exitosamente',
            table: result
        });

    } catch (error) {
        console.error("Error updating table:", error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la mesa' });
    }
});

// PATCH: Cambiar estado de una mesa
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('tables');
        const { id } = req.params;
        const { status, orderId } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de mesa no válido' });
        }

        if (!Object.values(TABLE_STATUS).includes(status)) {
            return res.status(400).json({ 
                error: `Estado inválido. Estados permitidos: ${Object.values(TABLE_STATUS).join(', ')}` 
            });
        }

        const table = await collection.findOne({ 
            _id: new ObjectId(id),
            companyId: req.user.companyId
        });

        if (!table) {
            return res.status(404).json({ error: 'Mesa no encontrada' });
        }

        const updateData = {
            status,
            updatedAt: new Date(),
            updatedBy: req.user.userId
        };

        // Lógica según el nuevo estado
        if (status === TABLE_STATUS.OCCUPIED) {
            if (!orderId) {
                return res.status(400).json({ 
                    error: 'Se requiere orderId para ocupar la mesa' 
                });
            }
            updateData.currentOrder = orderId;
            updateData.occupiedAt = new Date();
            updateData.occupiedBy = req.user.userId;
        } else if (status === TABLE_STATUS.AVAILABLE) {
            // Liberar la mesa
            updateData.currentOrder = null;
            updateData.occupiedAt = null;
            updateData.occupiedBy = null;
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        res.status(200).json({
            message: `Mesa ${status === TABLE_STATUS.OCCUPIED ? 'ocupada' : 'liberada'} exitosamente`,
            table: result
        });

    } catch (error) {
        console.error("Error updating table status:", error);
        res.status(500).json({ error: 'Error interno del servidor al cambiar estado de mesa' });
    }
});

// GET: Verificar disponibilidad de mesa
router.get('/check-availability/:number', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('tables');
        const { number } = req.params;
        const { peopleCount } = req.query;

        const table = await collection.findOne({ 
            number: parseInt(number),
            companyId: req.user.companyId,
            isActive: true
        });

        if (!table) {
            return res.status(404).json({ 
                error: 'Mesa no encontrada',
                available: false
            });
        }

        const isAvailable = table.status === TABLE_STATUS.AVAILABLE;
        const hasCapacity = !peopleCount || table.capacity >= parseInt(peopleCount);

        res.status(200).json({
            available: isAvailable && hasCapacity,
            table: {
                number: table.number,
                capacity: table.capacity,
                status: table.status,
                location: table.location
            },
            reasons: {
                notAvailable: !isAvailable ? `Mesa está ${table.status}` : null,
                insufficientCapacity: !hasCapacity ? `Capacidad insuficiente (${table.capacity} vs ${peopleCount})` : null
            }
        });

    } catch (error) {
        console.error("Error checking table availability:", error);
        res.status(500).json({ error: 'Error al verificar disponibilidad de mesa' });
    }
});

// DELETE: Desactivar una mesa (soft delete)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const collection = req.db.collection('tables');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de mesa no válido' });
        }

        const table = await collection.findOne({ 
            _id: new ObjectId(id),
            companyId: req.user.companyId
        });

        if (!table) {
            return res.status(404).json({ error: 'Mesa no encontrada' });
        }

        // No permitir eliminar mesa ocupada
        if (table.status === TABLE_STATUS.OCCUPIED) {
            return res.status(400).json({ 
                error: 'No se puede eliminar una mesa ocupada' 
            });
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    isActive: false,
                    deactivatedAt: new Date(),
                    deactivatedBy: req.user.userId
                } 
            },
            { returnDocument: 'after' }
        );

        res.status(200).json({
            message: 'Mesa desactivada exitosamente',
            table: result
        });

    } catch (error) {
        console.error("Error deactivating table:", error);
        res.status(500).json({ error: 'Error interno del servidor al desactivar la mesa' });
    }
});

// Exportar estados para usar en otros módulos
export { TABLE_STATUS };
export default router;