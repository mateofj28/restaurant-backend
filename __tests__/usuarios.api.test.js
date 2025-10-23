import request from 'supertest';
import { createApp } from '../src/app.js'; // Importamos la función

let app;

beforeAll(async () => {
    // Obtenemos la instancia de la BD del global setup
    const db = global.__DB__;
    app = createApp(db);
});

describe('API Endpoints de Usuarios', () => {

    test('POST /api/usuarios - debería crear un nuevo usuario', async () => {
        const response = await request(app)
            .post('/api/usuarios')
            .send({ nombre: 'Test User', edad: 30, ciudad: 'Test City' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Usuario creado');
        expect(response.body).toHaveProperty('id');
    });

    test('GET /api/usuarios - debería obtener la lista de usuarios', async () => {
        const response = await request(app).get('/api/usuarios');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/usuarios/:id - debería obtener un usuario por su ID', async () => {
        // Primero, creamos un usuario para obtener su ID
        const postResponse = await request(app)
            .post('/api/usuarios')
            .send({ nombre: 'Test User 2', edad: 25 });
        const userId = postResponse.body.id;

        const response = await request(app).get(`/api/usuarios/${userId}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('nombre', 'Test User 2');
    });

    test('PUT /api/usuarios/:id - debería actualizar un usuario', async () => {
        const postResponse = await request(app)
            .post('/api/usuarios')
            .send({ nombre: 'Test User 3', edad: 40 });
        const userId = postResponse.body.id;

        const response = await request(app)
            .put(`/api/usuarios/${userId}`)
            .send({ edad: 41 });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Usuario actualizado');
    });

    test('DELETE /api/usuarios/:id - debería eliminar un usuario', async () => {
        const postResponse = await request(app)
            .post('/api/usuarios')
            .send({ nombre: 'Test User 4', edad: 50 });
        const userId = postResponse.body.id;

        const response = await request(app).delete(`/api/usuarios/${userId}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Usuario eliminado');
    });
});