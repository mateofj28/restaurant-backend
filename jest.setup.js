// jest.setup.js
import { connectToDatabase, closeDatabaseConnection } from './src/config/db.js';

// Setup que se ejecuta antes de todos los tests
beforeAll(async () => {
    console.log('🔧 [Jest Setup] Conectando a la base de datos...');
    const db = await connectToDatabase();
    
    // Guardamos la BD en el objeto global, que SÍ será compartido con los tests
    global.__DB__ = db;
    console.log('✅ [Jest Setup] Base de datos conectada y guardada globalmente.');
});

// Teardown que se ejecuta después de todos los tests
afterAll(async () => {
    console.log('🔧 [Jest Teardown] Cerrando la conexión a la base de datos...');
    await closeDatabaseConnection();
    console.log('✅ [Jest Teardown] Conexión cerrada.');
});