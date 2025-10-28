// En __tests__/ordenes.api.test.js
import request from 'supertest';
import { createApp } from '../src/app.js'; // Importamos la función que crea la app

let app;
let db; // Variable para la conexión de limpieza

// Datos de prueba que usaremos en los tests
const testTableOrder = {
    table: 10,
    peopleCount: 2,
    orderType: 'table',
    requestedProducts: [
        {
            productName: 'Test Order - Table Product',
            requestedQuantity: 1,
            message: 'Test message',
            statusByQuantity: [{ status: 'received' }]
        }
    ],
    itemCount: 1,
    total: 20000
};

const testDeliveryOrder = {
    orderType: 'delivery',
    customerId: 'cliente-test-987',
    requestedProducts: [
        {
            productName: 'Test Order - Delivery Product',
            requestedQuantity: 1,
            message: '',
            statusByQuantity: [{ status: 'received' }]
        }
    ],
    itemCount: 0,
    total: 30000
};


beforeAll(async () => {
    // Obtenemos la instancia de la BD del global setup
    db = global.__DB__;
    app = createApp(db);
});

afterAll(async () => {
    // Solo limpiamos los datos, no cerramos la conexión
    try {
        if (db) {
            await db.collection('orders').deleteMany({
                "requestedProducts.productName": { $regex: /Test Order/ }
            });
        }
    } catch (error) {
        // Ignoramos errores de limpieza si la conexión ya está cerrada
        console.log('Cleanup skipped - connection already closed');
    }
});


describe('API Endpoints de Órdenes', () => {

    // Test para CREAR una orden de tipo MESA (POST)
    test('POST /api/orders - debería crear una nueva orden para mesa', async () => {
        const response = await request(app)
            .post('/api/orders')
            .send(testTableOrder);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Orden creada exitosamente');
        expect(response.body).toHaveProperty('orderId');
        expect(typeof response.body.orderId).toBe('string');
    });

    // Test para CREAR una orden de tipo DOMICILIO (POST)
    test('POST /api/orders - debería crear una nueva orden a domicilio', async () => {
        const response = await request(app)
            .post('/api/orders')
            .send(testDeliveryOrder);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('orderId');
    });

    // Test para VALIDAR una orden inválida (POST)
    test('POST /api/orders - debería fallar al crear una orden a domicilio sin customerId', async () => {
        const invalidOrder = { ...testDeliveryOrder };
        delete invalidOrder.customerId; // Hacemos la orden inválida

        const response = await request(app)
            .post('/api/orders')
            .send(invalidOrder);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Para pedidos a domicilio, el idCliente es obligatorio.');
    });

    // Test para LEER todas las órdenes (GET)
    test('GET /api/orders - debería obtener la lista de órdenes', async () => {
        // Primero, nos aseguramos de que hay al menos una orden
        await request(app).post('/api/orders').send(testTableOrder);

        const response = await request(app).get('/api/orders');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        // Verificamos que al menos una orden contiene nuestro producto de prueba
        const containsTestOrder = response.body.some(order =>
            order.requestedProducts.some(p => p.productName.includes('Test Order'))
        );
        expect(containsTestOrder).toBe(true);
    });



    test('PUT /api/orders/:id - debería actualizar una orden existente', async () => {
        // 1. Creamos una orden para obtener su ID
        const postResponse = await request(app)
            .post('/api/orders')
            .send(testTableOrder);

        const orderId = postResponse.body.orderId;
        console.log(`ID de la orden creada para el test PUT: ${orderId}`); // Log para depuración

        // 2. VERIFICACIÓN: Nos aseguramos de que la orden existe ANTES de actualizarla
        const getResponse = await request(app).get(`/api/orders/${orderId}`);
        expect(getResponse.status).toBe(200, 'La orden creada no pudo ser encontrada con GET'); // Mensaje de error personalizado
        expect(getResponse.body).toHaveProperty('_id', orderId);

        // 3. Preparamos los datos de actualización
        const updatedData = {
            ...testTableOrder,
            status: 'preparing',
            requestedProducts: [
                {
                    ...testTableOrder.requestedProducts[0],
                    statusByQuantity: [{ status: 'preparing' }]
                }
            ]
        };

        // 4. Enviamos la petición PUT
        const putResponse = await request(app)
            .put(`/api/orders/${orderId}`)
            .send(updatedData);

        // 5. Verificamos que la actualización fue exitosa
        expect(putResponse.status).toBe(200);
        expect(putResponse.body.status).toBe('preparing');
        expect(putResponse.body.requestedProducts[0].statusByQuantity[0].status).toBe('preparing');
    });



});