// Script para probar la nueva lógica selectiva de reducción de cantidades
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

async function testSelectiveReduction() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        
        console.log('🧪 Probando lógica selectiva de reducción...\n');
        
        // 1. Crear orden de prueba con estados mixtos
        console.log('1️⃣ Creando orden de prueba...');
        const ordersCollection = db.collection('orders');
        
        const testOrder = {
            orderType: 'table',
            tableId: '507f1f77bcf86cd799439011',
            peopleCount: 4,
            requestedProducts: [
                {
                    productId: '507f1f77bcf86cd799439012',
                    productSnapshot: {
                        name: 'Hamburguesa Clásica',
                        price: 15000,
                        category: 'Platos Principales',
                        description: 'Hamburguesa con carne, lechuga, tomate'
                    },
                    requestedQuantity: 5,
                    message: '',
                    statusByQuantity: [
                        { index: 1, status: 'entregado' },      // No se puede eliminar
                        { index: 2, status: 'pendiente' },     // Se puede eliminar
                        { index: 3, status: 'en_preparacion' }, // No se puede eliminar
                        { index: 4, status: 'pendiente' },     // Se puede eliminar
                        { index: 5, status: 'pendiente' }      // Se puede eliminar
                    ]
                }
            ],
            itemCount: 1,
            total: 75000,
            createdAt: new Date(),
            status: 'received',
            companyId: '507f1f77bcf86cd799439010',
            createdBy: '507f1f77bcf86cd799439014',
            editHistory: []
        };
        
        const insertResult = await ordersCollection.insertOne(testOrder);
        const orderId = insertResult.insertedId;
        console.log(`✅ Orden creada con ID: ${orderId}`);
        console.log('Estado inicial:');
        console.log('  - 1 hamburguesa: entregado (NO eliminable)');
        console.log('  - 1 hamburguesa: pendiente (eliminable)');
        console.log('  - 1 hamburguesa: en_preparacion (NO eliminable)');
        console.log('  - 1 hamburguesa: pendiente (eliminable)');
        console.log('  - 1 hamburguesa: pendiente (eliminable)');
        console.log('  Total pendientes: 3, Total no pendientes: 2\n');
        
        // 2. Caso 1: Reducir de 5 a 3 (eliminar 2 pendientes) - DEBE FUNCIONAR
        console.log('2️⃣ Caso 1: Reducir de 5 a 3 hamburguesas (eliminar 2 pendientes)');
        const result1 = await simulateReduction(ordersCollection, orderId, 3);
        console.log('Resultado:', result1.success ? '✅ ÉXITO' : '❌ FALLO');
        if (result1.success) {
            console.log('Estado después de reducir:');
            result1.finalStatus.forEach(unit => {
                console.log(`  - Hamburguesa ${unit.index}: ${unit.status}`);
            });
        } else {
            console.log('Error:', result1.error);
        }
        console.log();
        
        // 3. Caso 2: Reducir de 3 a 1 (eliminar 2 más) - DEBE FALLAR
        console.log('3️⃣ Caso 2: Reducir de 3 a 1 hamburguesa (eliminar 2 más)');
        const result2 = await simulateReduction(ordersCollection, orderId, 1);
        console.log('Resultado:', result2.success ? '✅ ÉXITO' : '❌ FALLO (esperado)');
        if (!result2.success) {
            console.log('Error esperado:', result2.error);
        }
        console.log();
        
        // 4. Caso 3: Reducir de 3 a 2 (eliminar 1 pendiente) - DEBE FUNCIONAR
        console.log('4️⃣ Caso 3: Reducir de 3 a 2 hamburguesas (eliminar 1 pendiente)');
        const result3 = await simulateReduction(ordersCollection, orderId, 2);
        console.log('Resultado:', result3.success ? '✅ ÉXITO' : '❌ FALLO');
        if (result3.success) {
            console.log('Estado final:');
            result3.finalStatus.forEach(unit => {
                console.log(`  - Hamburguesa ${unit.index}: ${unit.status}`);
            });
        }
        console.log();
        
        // 5. Limpiar datos de prueba
        console.log('5️⃣ Limpiando datos de prueba...');
        await ordersCollection.deleteOne({ _id: orderId });
        console.log('✅ Orden de prueba eliminada\n');
        
        console.log('🎉 Pruebas de lógica selectiva completadas!');
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        await client.close();
    }
}

// Función para simular la lógica de reducción
async function simulateReduction(collection, orderId, newQuantity) {
    try {
        const currentOrder = await collection.findOne({ _id: orderId });
        if (!currentOrder) {
            return { success: false, error: 'Orden no encontrada' };
        }
        
        const currentProduct = currentOrder.requestedProducts[0];
        const currentQuantity = currentProduct.requestedQuantity;
        
        if (newQuantity >= currentQuantity) {
            return { success: true, message: 'No hay reducción' };
        }
        
        // Aplicar la nueva lógica selectiva
        const unitsToRemove = currentQuantity - newQuantity;
        
        // Separar unidades por estado
        const pendingUnits = currentProduct.statusByQuantity.filter(unit => unit.status === 'pendiente');
        const nonPendingUnits = currentProduct.statusByQuantity.filter(unit => unit.status !== 'pendiente');
        
        // Verificar que hay suficientes unidades pendientes
        if (pendingUnits.length < unitsToRemove) {
            return {
                success: false,
                error: `Solo hay ${pendingUnits.length} unidades pendientes disponibles para eliminar, pero se necesitan eliminar ${unitsToRemove}`
            };
        }
        
        // Mantener todas las unidades no pendientes + las pendientes que no se eliminan
        const pendingUnitsToKeep = pendingUnits.slice(0, pendingUnits.length - unitsToRemove);
        const finalStatusByQuantity = [...nonPendingUnits, ...pendingUnitsToKeep];
        
        // Reindexar manteniendo orden
        const reindexedStatusByQuantity = finalStatusByQuantity
            .sort((a, b) => a.index - b.index)
            .map((unit, index) => ({
                ...unit,
                index: index + 1
            }));
        
        // Actualizar en base de datos para la siguiente prueba
        await collection.updateOne(
            { _id: orderId },
            {
                $set: {
                    'requestedProducts.0.requestedQuantity': newQuantity,
                    'requestedProducts.0.statusByQuantity': reindexedStatusByQuantity
                }
            }
        );
        
        return {
            success: true,
            finalStatus: reindexedStatusByQuantity,
            removedUnits: unitsToRemove
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Ejecutar pruebas
testSelectiveReduction();