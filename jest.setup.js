// jest.setup.js
import { connectToDatabase, closeDatabaseConnection } from './src/config/db.js';

// Esta función se ejecuta UNA SOLA VEZ antes de que todos los tests comiencen.
export default async function jestSetup() {
    console.log('🔧 [Jest Setup] Conectando a la base de datos...');
    const db = await connectToDatabase();
    
    // Guardamos la BD en el objeto global, que SÍ será compartido con los tests
    global.__DB__ = db;
    console.log('✅ [Jest Setup] Base de datos conectada y guardada globalmente.');

    // Devolvemos una función de "teardown" que Jest ejecutará al final de todo
    return async () => {
        console.log('🔧 [Jest Teardown] Cerrando la conexión a la base de datos...');
        await closeDatabaseConnection();
        console.log('✅ [Jest Teardown] Conexión cerrada.');
    };
}