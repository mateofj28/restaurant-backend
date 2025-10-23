// En __tests__/ordenes.api.test.js
import request from 'supertest';
import { createApp } from '../src/app.js'; // Importamos la función que crea la app

let app;
let db; // Variable para la conexión de limpieza

// Datos de prueba que usaremos en los tests
const ordenMesaDePrueba = {
    mesa: 10,
    cantidadPersonas: 2,
    tipoPedido: 'mesa',
    productosSolicitados: [
        {
            nombreProducto: 'Orden de Prueba - Producto Mesa',
            cantidadSolicitada: 1,
            mensaje: 'Test message',
            estadosPorCantidad: [{ estado: 'recibida' }]
        }
    ],
    cantidadIps: 1,
    total: 20000
};

const ordenDomicilioDePrueba = {
    tipoPedido: 'domicilio',
    idCliente: 'cliente-test-987',
    productosSolicitados: [
        {
            nombreProducto: 'Orden de Prueba - Producto Domicilio',
            cantidadSolicitada: 1,
            mensaje: '',
            estadosPorCantidad: [{ estado: 'recibida' }]
        }
    ],
    cantidadIps: 0,
    total: 30000
};


beforeAll(async () => {
    // Obtenemos la instancia de la BD del global setup
    db = global.__DB__;
    app = createApp(db);
});

afterAll(async () => {
    // Solo limpiamos los datos, no cerramos la conexión
    if (db) {
        await db.collection('ordenes').deleteMany({
            "productosSolicitados.nombreProducto": { $regex: /Orden de Prueba/ }
        });
    }
});


describe('API Endpoints de Órdenes', () => {

    // Test para CREAR una orden de tipo MESA (POST)
    test('POST /api/ordenes - debería crear una nueva orden para mesa', async () => {
        const response = await request(app)
            .post('/api/ordenes')
            .send(ordenMesaDePrueba);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Orden creada exitosamente');
        expect(response.body).toHaveProperty('orderId');
        expect(typeof response.body.orderId).toBe('string');
    });

    // Test para CREAR una orden de tipo DOMICILIO (POST)
    test('POST /api/ordenes - debería crear una nueva orden a domicilio', async () => {
        const response = await request(app)
            .post('/api/ordenes')
            .send(ordenDomicilioDePrueba);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('orderId');
    });

    // Test para VALIDAR una orden inválida (POST)
    test('POST /api/ordenes - debería fallar al crear una orden a domicilio sin idCliente', async () => {
        const ordenInvalida = { ...ordenDomicilioDePrueba };
        delete ordenInvalida.idCliente; // Hacemos la orden inválida

        const response = await request(app)
            .post('/api/ordenes')
            .send(ordenInvalida);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Para pedidos a domicilio, el idCliente es obligatorio.');
    });

    // Test para LEER todas las órdenes (GET)
    test('GET /api/ordenes - debería obtener la lista de órdenes', async () => {
        // Primero, nos aseguramos de que hay al menos una orden
        await request(app).post('/api/ordenes').send(ordenMesaDePrueba);

        const response = await request(app).get('/api/ordenes');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        // Verificamos que al menos una orden contiene nuestro producto de prueba
        const contieneOrdenDePrueba = response.body.some(orden =>
            orden.productosSolicitados.some(p => p.nombreProducto.includes('Orden de Prueba'))
        );
        expect(contieneOrdenDePrueba).toBe(true);
    });



    test('PUT /api/ordenes/:id - debería actualizar una orden existente', async () => {
        // 1. Creamos una orden para obtener su ID
        const postResponse = await request(app)
            .post('/api/ordenes')
            .send(ordenMesaDePrueba);

        const orderId = postResponse.body.orderId;
        console.log(`ID de la orden creada para el test PUT: ${orderId}`); // Log para depuración

        // 2. VERIFICACIÓN: Nos aseguramos de que la orden existe ANTES de actualizarla
        const getResponse = await request(app).get(`/api/ordenes/${orderId}`);
        expect(getResponse.status).toBe(200, 'La orden creada no pudo ser encontrada con GET'); // Mensaje de error personalizado
        expect(getResponse.body).toHaveProperty('_id', orderId);

        // 3. Preparamos los datos de actualización
        const datosActualizados = {
            ...ordenMesaDePrueba,
            estadoGeneral: 'en_preparacion',
            productosSolicitados: [
                {
                    ...ordenMesaDePrueba.productosSolicitados[0],
                    estadosPorCantidad: [{ estado: 'en_preparacion' }]
                }
            ]
        };

        // 4. Enviamos la petición PUT
        const putResponse = await request(app)
            .put(`/api/ordenes/${orderId}`)
            .send(datosActualizados);

        // 5. Verificamos que la actualización fue exitosa
        expect(putResponse.status).toBe(200);
        expect(putResponse.body.estadoGeneral).toBe('en_preparacion');
        expect(putResponse.body.productosSolicitados[0].estadosPorCantidad[0].estado).toBe('en_preparacion');
    });



});