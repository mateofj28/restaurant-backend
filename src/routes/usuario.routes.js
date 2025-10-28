// En src/routes/usuario.routes.js
import { Router } from 'express';
import { ObjectId } from '../config/db.js';

const router = Router();

// 1. CREAR un nuevo usuario (POST /)
router.post('/', async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const newUser = req.body;
        const result = await collection.insertOne(newUser);
        res.status(201).json({ message: 'Usuario creado', id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

// 2. LEER todos los usuarios (GET /)
router.get('/', async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const users = await collection.find({}).toArray();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

// 3. LEER un usuario por su ID (GET /:id)
router.get('/:id', async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const { id } = req.params;
        // Convertir el string de ID a un ObjectId de MongoDB
        const user = await collection.findOne({ _id: new ObjectId(id) });
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// 4. ACTUALIZAR un usuario por su ID (PUT /:id)
router.put('/:id', async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const { id } = req.params;
        const updatedUser = req.body;
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedUser }
        );
        if (result.matchedCount > 0) {
            res.status(200).json({ message: 'Usuario actualizado' });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// 5. BORRAR un usuario por su ID (DELETE /:id)
router.delete('/:id', async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const { id } = req.params;
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'Usuario eliminado' });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

export default router;