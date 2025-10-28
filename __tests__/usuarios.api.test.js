import request from 'supertest';
import { createApp } from '../src/app.js'; // Importamos la función

let app;

beforeAll(async () => {
    // Obtenemos la instancia de la BD del global setup
    const db = global.__DB__;
    app = createApp(db);
});

describe('API Endpoints de Usuarios', () => {

    test('POST /api/users - debería crear un nuevo usuario', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({ name: 'Test User', age: 30, city: 'Test City' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Usuario creado');
        expect(response.body).toHaveProperty('id');
    });

    test('GET /api/users - debería obtener la lista de usuarios', async () => {
        const response = await request(app).get('/api/users');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/users/:id - debería obtener un usuario por su ID', async () => {
        // Primero, creamos un usuario para obtener su ID
        const postResponse = await request(app)
            .post('/api/users')
            .send({ name: 'Test User 2', age: 25 });
        const userId = postResponse.body.id;

        const response = await request(app).get(`/api/users/${userId}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('name', 'Test User 2');
    });

    test('PUT /api/users/:id - debería actualizar un usuario', async () => {
        const postResponse = await request(app)
            .post('/api/users')
            .send({ name: 'Test User 3', age: 40 });
        const userId = postResponse.body.id;

        const response = await request(app)
            .put(`/api/users/${userId}`)
            .send({ age: 41 });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Usuario actualizado');
    });

    test('DELETE /api/users/:id - debería eliminar un usuario', async () => {
        const postResponse = await request(app)
            .post('/api/users')
            .send({ name: 'Test User 4', age: 50 });
        const userId = postResponse.body.id;

        const response = await request(app).delete(`/api/users/${userId}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Usuario eliminado');
    });
});