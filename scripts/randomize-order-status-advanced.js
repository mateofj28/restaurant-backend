// Script avanzado para modificar estados con probabilidades personalizadas
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

// Configuración de probabilidades (deben sumar 100)
const STATUS_PROBABILITIES = {
    'cocinando': 40,           // 40% probabilidad
    'listo para entregar': 35, // 35% probabilidad  
    'entregado': 25           // 25% probabilidad
};

// Función para seleccionar estado basado en probabilidades
function getRandomStatusByProbability() {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [status, probability] of Object.entries(STATUS_PROBABILITIES)) {
        cumulative += probability;
        if (random <= cumulative) {
            return status;
        }
    }
    
    // Fallback al último estado
    return Object.keys(STATUS_PROBABILITIES)[Object.keys(STATUS_PROBABILITIES).length - 1];
}

async function randomizeOrderStatusAdvanced(orderId = null, options = {}) {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const ordersCollection = db.collection('orders');
        
        console.log('🎲 Iniciando randomización avanzada de estados...\n');
        
        // Mostrar configuración de probabilidades
        console.log('⚙️ Configuración de probabilidades:');
        Object.entries(STATUS_PROBABILITIES).forEach(([status, prob]) => {
            console.log(`   ${status}: ${prob}%`);
        });
        console.log();
        
        let targetOrder;
        
        if (orderId) {
            if (!ObjectId.isValid(orderId)) {
                console.log('❌ ID de orden no válido');
                return;
            }
            
            targetOrder = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
            if (!targetOrder) {
                console.log(`❌ Orden con ID ${orderId} no encontrada`);
                return;
            }
            console.log(`🎯 Orden específica: ${orderId}`);
        } else {
            const orders = await ordersCollection.find({})
                .sort({ createdAt: -1 })
                .limit(1)
                .toArray();
            
            if (orders.length === 0) {
                console.log('❌ No se encontraron órdenes');
                return;
            }
            
            targetOrder = orders[0];
            console.log(`🎯 Última orden: ${targetOrder._id}`);
        }
        
        // Mostrar información de la orden
        console.log(`\n📋 Información de la orden:`);
        console.log(`   ID: ${targetOrder._id}`);
        console.log(`   Tipo: ${targetOrder.orderType}`);
        console.log(`   Total: $${targetOrder.total}`);
        console.log(`   Creada: ${targetOrder.createdAt.toLocaleString()}`);
        
        // Procesar cada producto
        const updatedProducts = [];
        let totalUnitsProcessed = 0;
        const statusCounts = {};
        
        for (let productIndex = 0; productIndex < targetOrder.requestedProducts.length; productIndex++) {
            const product = targetOrder.requestedProducts[productIndex];
            console.log(`\n🍽️ Producto ${productIndex + 1}: ${product.productSnapshot.name}`);
            console.log(`   Cantidad: ${product.requestedQuantity}`);
            console.log(`   Precio: $${product.productSnapshot.price}`);
            
            // Estados actuales
            console.log('   Estados actuales:');
            product.statusByQuantity.forEach(unit => {
                console.log(`     Unidad ${unit.index}: ${unit.status}`);
            });
            
            // Generar nuevos estados
            const newStatusByQuantity = product.statusByQuantity.map(unit => {
                const newStatus = options.useEqualProbability ? 
                    ['cocinando', 'listo para entregar', 'entregado'][Math.floor(Math.random() * 3)] :
                    getRandomStatusByProbability();
                
                statusCounts[newStatus] = (statusCounts[newStatus] || 0) + 1;
                totalUnitsProcessed++;
                
                return {
                    ...unit,
                    status: newStatus
                };
            });
            
            // Mostrar nuevos estados
            console.log('   Nuevos estados:');
            newStatusByQuantity.forEach(unit => {
                const emoji = unit.status === 'cocinando' ? '🔥' : 
                             unit.status === 'listo para entregar' ? '✅' : '🍽️';
                console.log(`     Unidad ${unit.index}: ${emoji} ${unit.status}`);
            });
            
            updatedProducts.push({
                ...product,
                statusByQuantity: newStatusByQuantity
            });
        }
        
        // Actualizar en base de datos
        console.log('\n💾 Actualizando base de datos...');
        const updateResult = await ordersCollection.updateOne(
            { _id: targetOrder._id },
            {
                $set: {
                    requestedProducts: updatedProducts,
                    updatedAt: new Date()
                },
                $push: {
                    editHistory: {
                        timestamp: new Date(),
                        editedBy: 'system',
                        userName: 'Script de Randomización',
                        changes: [{
                            type: 'ESTADOS_RANDOMIZADOS',
                            details: `Estados randomizados para ${totalUnitsProcessed} unidades`
                        }]
                    }
                }
            }
        );
        
        if (updateResult.modifiedCount > 0) {
            console.log('✅ Actualización exitosa!\n');
            
            // Mostrar estadísticas finales
            console.log('📊 Estadísticas finales:');
            console.log(`   Total unidades procesadas: ${totalUnitsProcessed}`);
            console.log('   Distribución de estados:');
            
            Object.entries(statusCounts).forEach(([status, count]) => {
                const percentage = ((count / totalUnitsProcessed) * 100).toFixed(1);
                const emoji = status === 'cocinando' ? '🔥' : 
                             status === 'listo para entregar' ? '✅' : '🍽️';
                console.log(`     ${emoji} ${status}: ${count} unidades (${percentage}%)`);
            });
            
            // Comparar con probabilidades esperadas
            console.log('\n🎯 Comparación con probabilidades esperadas:');
            Object.entries(STATUS_PROBABILITIES).forEach(([status, expectedProb]) => {
                const actualCount = statusCounts[status] || 0;
                const actualProb = ((actualCount / totalUnitsProcessed) * 100).toFixed(1);
                const diff = (actualProb - expectedProb).toFixed(1);
                const diffSign = diff >= 0 ? '+' : '';
                console.log(`     ${status}: ${actualProb}% (esperado: ${expectedProb}%, diferencia: ${diffSign}${diff}%)`);
            });
            
        } else {
            console.log('❌ No se pudo actualizar la orden');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

// Función para mostrar ayuda
function showHelp() {
    console.log(`
🎲 Script Avanzado de Randomización de Estados

Uso:
  node scripts/randomize-order-status-advanced.js [OPTIONS] [ORDER_ID]

Opciones:
  --equal-probability    Usar probabilidades iguales (33.33% cada estado)
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node scripts/randomize-order-status-advanced.js
  node scripts/randomize-order-status-advanced.js 507f1f77bcf86cd799439011
  node scripts/randomize-order-status-advanced.js --equal-probability

Estados y probabilidades por defecto:
  🔥 cocinando: 40%
  ✅ listo para entregar: 35%
  🍽️ entregado: 25%
`);
}

// Procesar argumentos
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

const options = {
    useEqualProbability: args.includes('--equal-probability')
};

const orderId = args.find(arg => !arg.startsWith('--')) || null;

// Ejecutar
randomizeOrderStatusAdvanced(orderId, options);