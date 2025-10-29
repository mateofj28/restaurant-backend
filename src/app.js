// src/app.js
import express from 'express';

import orderRoutes from './routes/ordenes.routes.js';
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/companies.routes.js';
import tableRoutes from './routes/tables.routes.js';
import productRoutes from './routes/products.routes.js';
import customerRoutes from './routes/customers.routes.js';
import { createSwaggerHTML, swaggerSpec } from './config/swagger-simple.js';

// Ahora la función recibe la instancia de 'db' como argumento
export function createApp(db) {
    const app = express();

    app.use((req, res, next) => {
        req.db = db; // Usamos la conexión que nos inyectaron
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        next();
    });

    app.use(express.json({ charset: 'utf-8' }));

    // Servir archivos estáticos
    app.use('/uploads', express.static('uploads'));
    app.use('/images', express.static('public/images'));



    app.use(express.static('public')); // Servir otros archivos del directorio public

    // Swagger UI
    app.get('/api-docs', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.send(createSwaggerHTML());
    });

    // Swagger JSON spec
    app.get('/api/swagger.json', (req, res) => {
        res.json(swaggerSpec);
    });

    // Rutas de autenticación
    app.use('/api/auth', authRoutes);

    // Rutas de empresas
    app.use('/api/companies', companyRoutes);

    // Rutas de mesas
    app.use('/api/tables', tableRoutes);

    // Rutas de productos
    app.use('/api/products', productRoutes);

    // Rutas de clientes
    app.use('/api/customers', customerRoutes);


    app.use('/api/orders', orderRoutes);

    app.get('/', (req, res) => {
        res.send(`
            <h1>🚀 API de Restaurant funcionando con autenticación!</h1>
            <p><a href="/api-docs" target="_blank" style="font-size: 18px; color: #007bff;">📖 Ver Documentación Swagger</a></p>

            <h2>📋 Endpoints disponibles:</h2>
            <h3>🔐 Autenticación:</h3>
            <ul>
                <li><strong>POST</strong> /api/auth/register - Registrar usuario</li>
                <li><strong>POST</strong> /api/auth/login - Iniciar sesión</li>
                <li><strong>GET</strong> /api/auth/profile - Obtener perfil (requiere token)</li>
            </ul>
            <h3>🏢 Empresas:</h3>
            <ul>
                <li><strong>GET</strong> /api/companies - Listar empresas (admin)</li>
                <li><strong>POST</strong> /api/companies - Crear empresa (admin)</li>
                <li><strong>GET</strong> /api/companies/:id - Obtener empresa por ID</li>
                <li><strong>PUT</strong> /api/companies/:id - Actualizar empresa</li>
                <li><strong>DELETE</strong> /api/companies/:id - Desactivar empresa (admin)</li>
                <li><strong>PATCH</strong> /api/companies/:id/toggle-status - Activar/Desactivar (admin)</li>
            </ul>
            <h3>🪑 Mesas:</h3>
            <ul>
                <li><strong>GET</strong> /api/tables - Listar mesas de la empresa</li>
                <li><strong>POST</strong> /api/tables - Crear mesa (admin)</li>
                <li><strong>GET</strong> /api/tables/:id - Obtener mesa por ID</li>
                <li><strong>PUT</strong> /api/tables/:id - Actualizar mesa</li>
                <li><strong>PATCH</strong> /api/tables/:id/status - Cambiar estado de mesa</li>
                <li><strong>GET</strong> /api/tables/check-availability/:number - Verificar disponibilidad</li>
                <li><strong>DELETE</strong> /api/tables/:id - Desactivar mesa (admin)</li>
            </ul>
            <h3>🍽️ Productos del Menú:</h3>
            <ul>
                <li><strong>GET</strong> /api/products - Listar productos con filtros</li>
                <li><strong>POST</strong> /api/products - Crear producto (admin/manager)</li>
                <li><strong>GET</strong> /api/products/:id - Obtener producto por ID</li>
                <li><strong>PUT</strong> /api/products/:id - Actualizar producto</li>
                <li><strong>PATCH</strong> /api/products/:id/availability - Cambiar disponibilidad</li>
                <li><strong>DELETE</strong> /api/products/:id - Desactivar producto</li>
                <li><strong>GET</strong> /api/products/menu/:companyId - Menú público por empresa</li>
            </ul>
            <h3>👥 Clientes (Domicilios):</h3>
            <ul>
                <li><strong>GET</strong> /api/customers - Listar clientes con filtros</li>
                <li><strong>POST</strong> /api/customers - Crear cliente</li>
                <li><strong>GET</strong> /api/customers/:id - Obtener cliente por ID</li>
                <li><strong>PUT</strong> /api/customers/:id - Actualizar cliente</li>
                <li><strong>DELETE</strong> /api/customers/:id - Desactivar cliente</li>
                <li><strong>GET</strong> /api/customers/search - Buscar clientes</li>
                <li><strong>POST</strong> /api/customers/:id/orders - Agregar orden al historial</li>
            </ul>
            <h3>📦 Órdenes:</h3>
            <ul>
                <li><strong>GET</strong> /api/orders - Listar órdenes</li>
                <li><strong>POST</strong> /api/orders - Crear orden</li>
                <li><strong>GET</strong> /api/orders/:id - Obtener orden por ID</li>
                <li><strong>PUT</strong> /api/orders/:id - Actualizar orden</li>
                <li><strong>PATCH</strong> /api/orders/:id/close - Cerrar cocina</li>
            </ul>

        `);
    });

    return app;
}