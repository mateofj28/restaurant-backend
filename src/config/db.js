// En src/config/db.js
import { MongoClient, ObjectId } from 'mongodb';

// Carga las variables de entorno desde el archivo .env
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
}

const client = new MongoClient(uri);

export { ObjectId };

export async function connectToDatabase() {
    try {
        await client.connect();
        console.log("✅ Conectado exitosamente a MongoDB Atlas!");
        // Puedes elegir una base de datos específica o usar la que viene por defecto
        // Por ejemplo: return client.db('miBaseDeDatos');
        return client.db(); // Usa la base de datos especificada en la URI o la por defecto
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error);
        process.exit(1); // Termina el proceso si no se puede conectar
    }
}

export async function closeDatabaseConnection() {
    try {
        await client.close();
        console.log("🔌 Conexión a MongoDB cerrada.");
    } catch (error) {
        console.error("❌ Error closing connection:", error);
    }
}