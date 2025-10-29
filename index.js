// index.js
import { createApp } from './src/app.js';
import { connectToDatabase } from './src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
    try {
        // Conectar MongoDB nativo
        const db = await connectToDatabase();
        
        const app = createApp(db);
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        process.exit(1);
    }
})();