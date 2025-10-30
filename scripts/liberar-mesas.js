// Script para liberar todas las mesas ocupadas en la base de datos
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function liberarTodasLasMesas() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Conectado a MongoDB');
        
        const db = client.db(process.env.DB_NAME);
        const tablesCollection = db.collection('tables');
        
        // Verificar estado actual de las mesas
        console.log('🔍 Verificando estado actual de las mesas...\n');
        
        const allTables = await tablesCollection.find({}).toArray();
        console.log(`📊 Total de mesas en la base de datos: ${allTables.length}`);
        
        // Mostrar estadísticas actuales
        const estadisticas = {
            available: allTables.filter(t => t.status === 'available').length,
            occupied: allTables.filter(t => t.status === 'occupied').length,
            reserved: allTables.filter(t => t.status === 'reserved').length,
            cleaning: allTables.filter(t => t.status === 'cleaning').length,
            out_of_service: allTables.filter(t => t.status === 'out_of_service').length
        };
        
        console.log('\n📈 Estado actual de las mesas:');
        console.log(`   🟢 Disponibles: ${estadisticas.available}`);
        console.log(`   🔴 Ocupadas: ${estadisticas.occupied}`);
        console.log(`   🟡 Reservadas: ${estadisticas.reserved}`);
        console.log(`   🧹 En limpieza: ${estadisticas.cleaning}`);
        console.log(`   ⚫ Fuera de servicio: ${estadisticas.out_of_service}`);
        
        // Mostrar mesas ocupadas antes de liberar
        const mesasOcupadas = allTables.filter(t => t.status === 'occupied');
        if (mesasOcupadas.length > 0) {
            console.log('\n🔴 Mesas ocupadas que se van a liberar:');
            mesasOcupadas.forEach(mesa => {
                console.log(`   Mesa ${mesa.number} - ${mesa.location || 'Sin ubicación'}`);
                console.log(`     Ocupada desde: ${mesa.occupiedAt || 'No registrado'}`);
                console.log(`     Orden actual: ${mesa.currentOrder || 'No registrada'}`);
                console.log('');
            });
        }
        
        // Liberar todas las mesas (cambiar estado a available y limpiar campos de ocupación)
        console.log('🔄 Liberando todas las mesas...\n');
        
        const resultado = await tablesCollection.updateMany(
            {}, // Sin filtro = todas las mesas
            {
                $set: {
                    status: 'available',
                    currentOrder: null,
                    occupiedAt: null,
                    occupiedBy: null,
                    updatedAt: new Date(),
                    updatedBy: 'system-script-liberar'
                }
            }
        );
        
        console.log(`✅ Operación completada exitosamente!`);
        console.log(`   Mesas actualizadas: ${resultado.modifiedCount}`);
        console.log(`   Mesas que coincidieron: ${resultado.matchedCount}`);
        
        // Verificar estado final
        console.log('\n🔍 Verificando estado final...');
        const mesasFinales = await tablesCollection.find({}).toArray();
        const disponiblesFinales = mesasFinales.filter(t => t.status === 'available').length;
        
        console.log(`📊 Estado final:`);
        console.log(`   🟢 Todas las mesas disponibles: ${disponiblesFinales}/${mesasFinales.length}`);
        
        if (disponiblesFinales === mesasFinales.length) {
            console.log('\n🎉 ¡Todas las mesas han sido liberadas exitosamente!');
        } else {
            console.log('\n⚠️  Algunas mesas no pudieron ser liberadas. Verificar manualmente.');
        }
        
        // Mostrar resumen por empresa
        console.log('\n📋 Resumen por empresa:');
        const empresas = [...new Set(mesasFinales.map(t => t.companyId))];
        
        for (const empresaId of empresas) {
            const mesasEmpresa = mesasFinales.filter(t => t.companyId === empresaId);
            console.log(`   Empresa ${empresaId}: ${mesasEmpresa.length} mesas liberadas`);
        }
        
    } catch (error) {
        console.error('❌ Error al liberar las mesas:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

// Ejecutar el script
liberarTodasLasMesas();