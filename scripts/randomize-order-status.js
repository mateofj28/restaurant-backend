// Script para modificar aleatoriamente los estados de statusByQuantity de una orden
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

// Estados permitidos según tu especificación
const VALID_STATUSES = ['cocinando', 'listo para entregar', 'entregado'];

async function randomizeOrderStatus(orderId = null) {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        const ordersCollection = db.collection('orders');
        
        console.log('🎲 Iniciando randomización de estados de orden...\n');
        
        let targetOrder;
        
        if (orderId) {
            // Buscar orden específica
            if (!ObjectId.isValid(orderId)) {
                console.log('❌ ID de orden no válido');
                return;
            }
            
            targetOrder = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
            if (!targetOrder) {
                console.log(`❌ Orden con ID ${orderId} no encontrada`);
                return;
            }
            console.log(`🎯 Orden específica seleccionada: ${orderId}`);
        } else {
            // Buscar la última orden
            const orders = await ordersCollection.find({})
                .sort({ createdAt: -1 })
                .limit(1)
                .toArray();
            
            if (orders.length === 0) {
                console.log('❌ No se encontraron órdenes en la base de datos');
                return;
            }
            
            targetOrder = orders[0];
            console.log(`🎯 Última orden seleccionada: ${targetOrder._id}`);
        }
        
        // Mostrar estado actual
        console.log('\n📋 Estado actual de la orden:');
        console.log(`   Tipo: ${targetOrder.orderType}`);
        console.log(`   Total: $${targetOrder.total}`);
        console.log(`   Productos: ${targetOrder.requestedProducts.length}`);
        
        // Mostrar estados actuales de cada producto
        targetOrder.requestedProducts.forEach((product, productIndex) => {
            console.log(`\n   Producto ${productIndex + 1}: ${product.productSnapshot.name}`);
            console.log(`   Cantidad: ${product.requestedQuantity}`);
            console.log('   Estados actuales:');
            product.statusByQuantity.forEach(unit => {
                console.log(`     - Unidad ${unit.index}: ${unit.status}`);
            });
        });
        
        // Generar nuevos estados aleatorios
        console.log('\n🎲 Generando nuevos estados aleatorios...');
        
        const updatedProducts = targetOrder.requestedProducts.map((product, productIndex) => {
            const updatedProduct = { ...product };
            
            // Randomizar cada unidad del producto
            updatedProduct.statusByQuantity = product.statusByQuantity.map(unit => {
                const randomStatus = VALID_STATUSES[Math.floor(Math.random() * VALID_STATUSES.length)];
                return {
                    ...unit,
                    status: randomStatus
                };
            });
            
            console.log(`\n   Producto ${productIndex + 1}: ${product.productSnapshot.name}`);
            console.log('   Nuevos estados:');
            updatedProduct.statusByQuantity.forEach(unit => {
                console.log(`     - Unidad ${unit.index}: ${unit.status}`);
            });
            
            return updatedProduct;
        });
        
        // Actualizar en la base de datos
        const updateResult = await ordersCollection.updateOne(
            { _id: targetOrder._id },
            {
                $set: {
                    requestedProducts: updatedProducts,
                    updatedAt: new Date()
                }
            }
        );
        
        if (updateResult.modifiedCount > 0) {
            console.log('\n✅ Estados actualizados exitosamente!');
            
            // Mostrar resumen de cambios
            console.log('\n📊 Resumen de estados aplicados:');
            const statusCounts = {};
            updatedProducts.forEach(product => {
                product.statusByQuantity.forEach(unit => {
                    statusCounts[unit.status] = (statusCounts[unit.status] || 0) + 1;
                });
            });
            
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`   ${status}: ${count} unidades`);
            });
            
            // Mostrar estadísticas
            const totalUnits = updatedProducts.reduce((sum, product) => sum + product.requestedQuantity, 0);
            console.log(`\n📈 Total de unidades procesadas: ${totalUnits}`);
            console.log(`🎯 Orden actualizada: ${targetOrder._id}`);
            
        } else {
            console.log('❌ No se pudo actualizar la orden');
        }
        
    } catch (error) {
        console.error('❌ Error durante la randomización:', error);
    } finally {
        await client.close();
    }
}

// Función para mostrar ayuda
function showHelp() {
    console.log(`
🎲 Script de Randomización de Estados de Orden

Uso:
  node scripts/randomize-order-status.js                    # Randomiza la última orden
  node scripts/randomize-order-status.js [ORDER_ID]         # Randomiza orden específica

Estados disponibles:
  - cocinando
  - listo para entregar  
  - entregado

Ejemplos:
  node scripts/randomize-order-status.js
  node scripts/randomize-order-status.js 507f1f77bcf86cd799439011
`);
}

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

const orderId = args[0] || null;

// Ejecutar script
randomizeOrderStatus(orderId);