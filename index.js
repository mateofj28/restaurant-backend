// index.js
import { createApp } from './src/app.js';
import { connectToDatabase } from './src/config/db.js'; // Necesitamos importarla aquí de nuevo
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
    const db = await connectToDatabase(); // Conectamos y luego pasamos la db a la app
    const app = createApp(db);
    app.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
})();