// Script para probar la funcionalidad de edición de órdenes
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

async function testOrderEditing() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        
        console.log('🧪 Iniciando pruebas de edición de órdenes...\n');
        
        // 1. Crear una orden de prueba
        console.log('1️⃣ Creando orden de prueba...');
        const ordersCollection = db.collection('orders');
        
        const testOrder = {
            orderType: 'table',
            tableId: '507f1f77bcf86cd799439011', // ID de ejemplo
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
                    requestedQuantity: 2,
                    message: '',
                    statusByQuantity: [
                        { index: 1, status: 'pendiente' },
                        { index: 2, status: 'pendiente' }
                    ]
                },
                {
                    productId: '507f1f77bcf86cd799439013',
                    productSnapshot: {
                        name: 'Papas Fritas',
                        price: 8000,
                        category: 'Acompañamientos',
                        description: 'Papas fritas crujientes'
                    },
                    requestedQuantity: 3,
                    message: '',
                    statusByQuantity: [
                        { index: 1, status: 'pendiente' },
                        { index: 2, status: 'en_preparacion' },
                        { index: 3, status: 'listo' }
                    ]
                }
            ],
            itemCount: 2,
            total: 54000, // (15000 * 2) + (8000 * 3)
            createdAt: new Date(),
            status: 'received',
            companyId: '507f1f77bcf86cd799439010',
            createdBy: '507f1f77bcf86cd799439014',
            editHistory: []
        };
        
        const insertResult = await ordersCollection.insertOne(testOrder);
        const orderId = insertResult.insertedId;
        console.log(`✅ Orden creada con ID: ${orderId}\n`);
        
        // 2. Simular ediciones válidas
        console.log('2️⃣ Probando ediciones válidas...\n');
        
        // 2a. Aumentar cantidad de hamburguesas (siempre permitido)
        console.log('📈 Caso 1: Aumentar cantidad de hamburguesas de 2 a 4');
        const edit1 = await simulateEdit(ordersCollection, orderId, [
            {
                productId: '507f1f77bcf86cd799439012',
                requestedQuantity: 4,
                message: ''
            },
            {
                productId: '507f1f77bcf86cd799439013',
                requestedQuantity: 3,
                message: ''
            }
        ]);
        console.log('Resultado:', edit1.success ? '✅ ÉXITO' : '❌ FALLO');
        if (edit1.success) {
            console.log(`- Nuevas hamburguesas agregadas: ${edit1.summary.totalChanges} cambios`);
            console.log(`- Nuevo total: $${edit1.order.total}`);
        }
        console.log();
        
        // 2b. Agregar un producto nuevo
        console.log('➕ Caso 2: Agregar bebida nueva');
        const edit2 = await simulateEdit(ordersCollection, orderId, [
            {
                productId: '507f1f77bcf86cd799439012',
                requestedQuantity: 4,
                message: ''
            },
            {
                productId: '507f1f77bcf86cd799439013',
                requestedQuantity: 3,
                message: ''
            },
            {
                productId: '507f1f77bcf86cd799439015', // Nuevo producto
                requestedQuantity: 2,
                message: 'Sin hielo'
            }
        ]);
        console.log('Resultado:', edit2.success ? '✅ ÉXITO' : '❌ FALLO');
        if (edit2.success) {
            console.log(`- Productos agregados: ${edit2.summary.totalChanges} cambios`);
        }
        console.log();
        
        // 3. Simular ediciones inválidas
        console.log('3️⃣ Probando ediciones inválidas...\n');
        
        // 3a. Intentar reducir papas fritas (tiene unidades no pendientes)
        console.log('📉 Caso 3: Intentar reducir papas fritas de 3 a 1 (debería fallar)');
        const edit3 = await simulateEdit(ordersCollection, orderId, [
            {
                productId: '507f1f77bcf86cd799439012',
                requestedQuantity: 4,
                message: ''
            },
            {
                productId: '507f1f77bcf86cd799439013',
                requestedQuantity: 1, // Reducir de 3 a 1
                message: ''
            }
        ]);
        console.log('Resultado:', edit3.success ? '✅ ÉXITO' : '❌ FALLO (esperado)');
        if (!edit3.success) {
            console.log('- Razón del fallo:', edit3.details[0]);
        }
        console.log();
        
        // 3b. Intentar eliminar papas fritas completamente
        console.log('🗑️ Caso 4: Intentar eliminar papas fritas completamente (debería fallar)');
        const edit4 = await simulateEdit(ordersCollection, orderId, [
            {
                productId: '507f1f77bcf86cd799439012',
                requestedQuantity: 4,
                message: ''
            }
            // No incluir papas fritas = eliminar
        ]);
        console.log('Resultado:', edit4.success ? '✅ ÉXITO' : '❌ FALLO (esperado)');
        if (!edit4.success) {
            console.log('- Razón del fallo:', edit4.details[0]);
        }
        console.log();
        
        // 4. Mostrar historial de auditoría
        console.log('4️⃣ Historial de auditoría final...\n');
        const finalOrder = await ordersCollection.findOne({ _id: orderId });
        if (finalOrder.editHistory) {
            finalOrder.editHistory.forEach((entry, index) => {
                console.log(`📝 Edición ${index + 1}:`);
                console.log(`   Fecha: ${entry.timestamp.toISOString()}`);
                console.log(`   Usuario: ${entry.userName}`);
                console.log(`   Cambios: ${entry.changes.length}`);
                entry.changes.forEach(change => {
                    console.log(`   - ${change.type}: ${change.details}`);
                });
                console.log();
            });
        }
        
        // 5. Limpiar datos de prueba
        console.log('5️⃣ Limpiando datos de prueba...');
        await ordersCollection.deleteOne({ _id: orderId });
        console.log('✅ Orden de prueba eliminada\n');
        
        console.log('🎉 Pruebas completadas exitosamente!');
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        await client.close();
    }
}

// Función auxiliar para simular ediciones
async function simulateEdit(collection, orderId, requestedProducts) {
    try {
        // Simular la lógica del endpoint de edición
        const currentOrder = await collection.findOne({ _id: orderId });
        
        if (!currentOrder) {
            return { success: false, error: 'Orden no encontrada' };
        }
        
        // Simular validaciones básicas
        const errors = [];
        const changes = [];
        
        // Verificar productos eliminados
        for (const currentProduct of currentOrder.requestedProducts) {
            const stillRequested = requestedProducts.find(p => p.productId === currentProduct.productId);
            
            if (!stillRequested) {
                // Producto eliminado - verificar si todas las unidades están pendientes
                const nonPendingUnits = currentProduct.statusByQuantity.filter(unit => unit.status !== 'pendiente');
                if (nonPendingUnits.length > 0) {
                    errors.push(`No se puede eliminar ${currentProduct.productSnapshot.name}: tiene ${nonPendingUnits.length} unidades que no están en estado "pendiente"`);
                } else {
                    changes.push({
                        type: 'PRODUCTO_ELIMINADO',
                        productName: currentProduct.productSnapshot.name
                    });
                }
            }
        }
        
        // Verificar productos modificados
        for (const requestedProduct of requestedProducts) {
            const currentProduct = currentOrder.requestedProducts.find(p => p.productId === requestedProduct.productId);
            
            if (currentProduct) {
                if (requestedProduct.requestedQuantity < currentProduct.requestedQuantity) {
                    // Cantidad reducida - verificar unidades a eliminar
                    const unitsToRemove = currentProduct.requestedQuantity - requestedProduct.requestedQuantity;
                    const unitsToRemoveData = currentProduct.statusByQuantity.slice(requestedProduct.requestedQuantity);
                    const nonPendingUnitsToRemove = unitsToRemoveData.filter(unit => unit.status !== 'pendiente');
                    
                    if (nonPendingUnitsToRemove.length > 0) {
                        errors.push(`No se puede reducir ${currentProduct.productSnapshot.name} a ${requestedProduct.requestedQuantity} unidades: ${nonPendingUnitsToRemove.length} de las unidades a eliminar no están en estado "pendiente"`);
                    } else {
                        changes.push({
                            type: 'CANTIDAD_REDUCIDA',
                            productName: currentProduct.productSnapshot.name
                        });
                    }
                } else if (requestedProduct.requestedQuantity > currentProduct.requestedQuantity) {
                    changes.push({
                        type: 'CANTIDAD_AUMENTADA',
                        productName: currentProduct.productSnapshot.name
                    });
                }
            } else {
                changes.push({
                    type: 'PRODUCTO_AGREGADO',
                    productId: requestedProduct.productId
                });
            }
        }
        
        if (errors.length > 0) {
            return { success: false, details: errors };
        }
        
        // Simular actualización exitosa
        const newTotal = requestedProducts.reduce((sum, p) => {
            const currentProduct = currentOrder.requestedProducts.find(cp => cp.productId === p.productId);
            const price = currentProduct ? currentProduct.productSnapshot.price : 10000; // Precio por defecto para productos nuevos
            return sum + (price * p.requestedQuantity);
        }, 0);
        
        return {
            success: true,
            order: { total: newTotal },
            summary: { totalChanges: changes.length }
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Ejecutar pruebas
testOrderEditing();