// src/app.js
import express from 'express';
import userRoutes from './routes/usuario.routes.js';
import orderRoutes from './routes/ordenes.routes.js';

// Ahora la función recibe la instancia de 'db' como argumento
export function createApp(db) {
    const app = express();

    app.use((req, res, next) => {
        req.db = db; // Usamos la conexión que nos inyectaron
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        next();
    });

    app.use(express.json({ charset: 'utf-8' }));
    app.use('/api/users', userRoutes);
    app.use('/api/orders', orderRoutes);

    app.get('/', (req, res) => {
        res.send('🚀 API de Restaurant funcionando!');
    });

    return app;
}