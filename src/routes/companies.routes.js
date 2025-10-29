// En src/routes/companies.routes.js
import { Router } from 'express';
import { ObjectId } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// POST: Crear una nueva empresa
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const collection = req.db.collection('companies');
        const newCompany = req.body;

        // --- Validaciones ---
        if (!newCompany.name || !newCompany.email || !newCompany.businessType) {
            return res.status(400).json({ 
                error: 'Nombre, email y tipo de negocio son obligatorios' 
            });
        }

        // Verificar si ya existe una empresa con ese email
        const existingCompany = await collection.findOne({ email: newCompany.email });
        if (existingCompany) {
            return res.status(400).json({ 
                error: 'Ya existe una empresa con ese email' 
            });
        }

        // --- Estructura completa de la empresa ---
        const company = {
            // Datos básicos
            name: newCompany.name,
            businessType: newCompany.businessType, // restaurant, cafe, bakery, food_truck, etc.
            description: newCompany.description || '',
            logo: newCompany.logo || null,
            website: newCompany.website || null,

            // Información de contacto
            email: newCompany.email,
            phone: newCompany.phone || null,
            address: {
                street: newCompany.address?.street || '',
                city: newCompany.address?.city || '',
                country: newCompany.address?.country || '',
                postalCode: newCompany.address?.postalCode || ''
            },

            // Configuración operativa
            timezone: newCompany.timezone || 'America/Bogota',
            currency: newCompany.currency || 'COP',
            language: newCompany.language || 'es',
            operatingHours: newCompany.operatingHours || {
                monday: { open: '08:00', close: '22:00', isOpen: true },
                tuesday: { open: '08:00', close: '22:00', isOpen: true },
                wednesday: { open: '08:00', close: '22:00', isOpen: true },
                thursday: { open: '08:00', close: '22:00', isOpen: true },
                friday: { open: '08:00', close: '22:00', isOpen: true },
                saturday: { open: '08:00', close: '22:00', isOpen: true },
                sunday: { open: '08:00', close: '22:00', isOpen: true }
            },

            // Configuración del sistema
            settings: {
                allowedOrderTypes: newCompany.settings?.allowedOrderTypes || ['table', 'delivery', 'pickup'],
                maxTablesCount: newCompany.settings?.maxTablesCount || 50,
                enableDelivery: newCompany.settings?.enableDelivery || true,
                enablePickup: newCompany.settings?.enablePickup || true,
                taxRate: newCompany.settings?.taxRate || 0.19, // 19% IVA por defecto
                serviceCharge: newCompany.settings?.serviceCharge || 0.10 // 10% servicio
            },

            subscription: {
                plan: newCompany.subscription?.plan || 'basic',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
                isActive: true
            },

            features: {
                multiLocation: newCompany.features?.multiLocation || false,
                inventory: newCompany.features?.inventory || false,
                analytics: newCompany.features?.analytics || false,
                integrations: newCompany.features?.integrations || false
            },

            // Metadatos
            isActive: true,
            createdAt: new Date(),
            createdBy: req.user.userId,
            updatedAt: new Date()
        };

        const result = await collection.insertOne(company);

        res.status(201).json({
            message: 'Empresa creada exitosamente',
            company: {
                id: result.insertedId,
                name: company.name,
                businessType: company.businessType,
                email: company.email,
                isActive: company.isActive,
                createdAt: company.createdAt
            }
        });

    } catch (error) {
        console.error("Error creating company:", error);
        res.status(500).json({ error: 'Error interno del servidor al crear la empresa' });
    }
});

// GET: Listar todas las empresas (solo admins)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const collection = req.db.collection('companies');
        const { page = 1, limit = 10, isActive } = req.query;
        
        const filter = {};
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const skip = (page - 1) * limit;
        const companies = await collection
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();

        const total = await collection.countDocuments(filter);

        res.status(200).json({
            companies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching companies:", error);
        res.status(500).json({ error: 'Error al obtener las empresas' });
    }
});

// GET: Obtener una empresa por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('companies');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de empresa no válido' });
        }

        const company = await collection.findOne({ _id: new ObjectId(id) });

        if (!company) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        // Solo admins pueden ver cualquier empresa, otros usuarios solo la suya
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'No tienes permisos para ver esta empresa' });
        }

        res.status(200).json(company);

    } catch (error) {
        console.error("Error fetching company:", error);
        res.status(500).json({ error: 'Error al obtener la empresa' });
    }
});

// PUT: Actualizar una empresa
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const collection = req.db.collection('companies');
        const { id } = req.params;
        const updates = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de empresa no válido' });
        }

        // Solo admins pueden actualizar cualquier empresa, otros usuarios solo la suya
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'No tienes permisos para actualizar esta empresa' });
        }

        // Campos que no se pueden actualizar directamente
        delete updates._id;
        delete updates.createdAt;
        delete updates.createdBy;
        
        // Agregar timestamp de actualización
        updates.updatedAt = new Date();
        updates.updatedBy = req.user.userId;

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updates },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        res.status(200).json({
            message: 'Empresa actualizada exitosamente',
            company: result
        });

    } catch (error) {
        console.error("Error updating company:", error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar la empresa' });
    }
});

// DELETE: Desactivar una empresa (soft delete)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const collection = req.db.collection('companies');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de empresa no válido' });
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

        if (!result) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        res.status(200).json({
            message: 'Empresa desactivada exitosamente',
            company: result
        });

    } catch (error) {
        console.error("Error deactivating company:", error);
        res.status(500).json({ error: 'Error interno del servidor al desactivar la empresa' });
    }
});

// PATCH: Activar/Desactivar empresa
router.patch('/:id/toggle-status', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const collection = req.db.collection('companies');
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de empresa no válido' });
        }

        const company = await collection.findOne({ _id: new ObjectId(id) });
        if (!company) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const newStatus = !company.isActive;
        const updateData = {
            isActive: newStatus,
            updatedAt: new Date(),
            updatedBy: req.user.userId
        };

        if (newStatus) {
            updateData.reactivatedAt = new Date();
        } else {
            updateData.deactivatedAt = new Date();
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        res.status(200).json({
            message: `Empresa ${newStatus ? 'activada' : 'desactivada'} exitosamente`,
            company: result
        });

    } catch (error) {
        console.error("Error toggling company status:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;