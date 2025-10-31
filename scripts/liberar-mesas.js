// Script para liberar todas las mesas ocupadas
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

async function liberarTodasLasMesas() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        
        console.log('🔓 Iniciando liberación de mesas...\n');
        
        const tablesCollection = db.collection('tables');
        
        // 1. Obtener todas las mesas ocupadas
        const mesasOcupadas = await tablesCollection.find({
            status: { $in: ['occupied', 'reserved'] }
        }).toArray();
        
        console.log(`📊 Mesas encontradas para liberar: ${mesasOcupadas.length}`);
        
        if (mesasOcupadas.length === 0) {
            console.log('✅ No hay mesas ocupadas para liberar');
            return;
        }
        
        // 2. Mostrar mesas que se van a liberar
        console.log('\n📋 Mesas que se liberarán:');
        mesasOcupadas.forEach(mesa => {
            console.log(`   Mesa ${mesa.number} - Estado: ${mesa.status} - Orden: ${mesa.currentOrder || 'N/A'}`);
        });
        
        // 3. Liberar todas las mesas
        const resultado = await tablesCollection.updateMany(
            { status: { $in: ['occupied', 'reserved'] } },
            {
                $set: {
                    status: 'available',
                    currentOrder: null,
                    occupiedAt: null,
                    occupiedBy: null,
                    reservedAt: null,
                    reservedBy: null,
                    reservedFor: null
                }
            }
        );
        
        console.log(`\n✅ Mesas liberadas exitosamente: ${resultado.modifiedCount}`);
        
        // 4. Verificar resultado
        const mesasLibres = await tablesCollection.countDocuments({ status: 'available' });
        const mesasTotal = await tablesCollection.countDocuments({ isActive: true });
        
        console.log(`\n📈 Estado final:`);
        console.log(`   Mesas disponibles: ${mesasLibres}`);
        console.log(`   Mesas totales activas: ${mesasTotal}`);
        console.log(`   Porcentaje libre: ${((mesasLibres / mesasTotal) * 100).toFixed(1)}%`);
        
        console.log('\n🎉 Proceso completado exitosamente!');
        
    } catch (error) {
        console.error('❌ Error liberando mesas:', error);
    } finally {
        await client.close();
    }
}

// Ejecutar script
liberarTodasLasMesas();