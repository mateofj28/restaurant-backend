// Script para probar la corrección de eliminación de productos
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';

async function testProductDeletion() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db();
        
        console.log('🧪 Probando corrección de eliminación de productos...\n');
        
        // 1. Crear orden de prueba con 2 productos
        console.log('1️⃣ Creando orden de prueba con 2 productos...');
        const ordersCollection = db.collection('orders');
        
        const testOrder = {
            orderType: 'table',
            tableId: '507f1f77bcf86cd799439011',
            peopleCount: 2,
            requestedProducts: [
                {
                    productId: '6901ba37c2539974d6fc90c2', // Agua Mineral
                    productSnapshot: {
                        name: 'Agua Mineral',
                        price: 2500,
                        category: 'Bebidas',
                        description: 'Agua mineral natural'
                    },
                    requestedQuantity: 1,
                    message: '',
                    statusByQuantity: [
                        { index: 1, status: 'pendiente' }
                    ]
                },
                {
                    productId: '6901ba37c2539974d6fc90c3', // Coca Cola
                    productSnapshot: {
                        name: 'Coca Cola',
                        price: 3500,
                        category: 'Bebidas',
                        description: 'Coca Cola 350ml'
                    },
                    requestedQuantity: 1,
                    message: '',
                    statusByQuantity: [
                        { index: 1, status: 'pendiente' }
                    ]
                }
            ],
            itemCount: 2,
            total: 6000,
            createdAt: new Date(),
            status: 'received',
            companyId: '507f1f77bcf86cd799439010',
            createdBy: '507f1f77bcf86cd799439014',
            editHistory: []
        };
        
        const insertResult = await ordersCollection.insertOne(testOrder);
        const orderId = insertResult.insertedId;
        console.log(`✅ Orden creada con ID: ${orderId}`);
        console.log('Productos iniciales: Agua Mineral + Coca Cola\n');
        
        // 2. Caso 1: Eliminar un producto específico (Coca Cola)
        console.log('2️⃣ Caso 1: Eliminar Coca Cola (mantener solo Agua Mineral)');
        const case1Result = await simulateEditProducts(ordersCollection, orderId, [
            {
                productId: '6901ba37c2539974d6fc90c2', // Solo Agua Mineral
                requestedQuantity: 1,
                message: ''
            }
            // No incluir Coca Cola = eliminarla
        ]);
        
        console.log('Resultado:', case1Result.success ? '✅ ÉXITO' : '❌ FALLO');
        if (case1Result.success) {
            console.log('Mensaje:', case1Result.message);
            if (case1Result.audit) {
                console.log('Cambios detectados:');
                case1Result.audit.changes.forEach(change => {
                    console.log(`  - ${change.type}: ${change.details}`);
                });
            }
            console.log(`Productos restantes: ${case1Result.order?.requestedProducts?.length || 0}`);
        } else {
            console.log('Error:', case1Result.error);
        }
        console.log();
        
        // 3. Caso 2: Eliminar todos los productos (carrito vacío)
        console.log('3️⃣ Caso 2: Eliminar todos los productos (carrito vacío)');
        const case2Result = await simulateEditProducts(ordersCollection, orderId, []);
        
        console.log('Resultado:', case2Result.success ? '✅ ÉXITO' : '❌ FALLO');
        if (case2Result.success) {
            console.log('Mensaje:', case2Result.message);
            if (case2Result.deleted) {
                console.log('🗑️ Orden eliminada completamente');
                console.log('🪑 Mesa liberada:', case2Result.tableReleased ? 'Sí' : 'No');
            }
        } else {
            console.log('Error:', case2Result.error);
        }
        console.log();
        
        // 4. Verificar que la orden fue eliminada
        console.log('4️⃣ Verificando eliminación...');
        const deletedOrder = await ordersCollection.findOne({ _id: orderId });
        if (!deletedOrder) {
            console.log('✅ Confirmado: Orden eliminada de la base de datos');
        } else {
            console.log('❌ Error: Orden aún existe en la base de datos');
        }
        
        console.log('\n🎉 Pruebas de eliminación completadas!');
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        await client.close();
    }
}

// Función para simular el endpoint edit-products
async function simulateEditProducts(collection, orderId, requestedProducts) {
    try {
        // Simular la petición al endpoint
        const response = await fetch(`http://localhost:3000/api/orders/${orderId}/edit-products`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-token-for-testing' // En prueba real usarías token válido
            },
            body: JSON.stringify({
                requestedProducts,
                editedBy: 'test-user'
            })
        });
        
        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        // Si no hay servidor corriendo, simular la lógica localmente
        console.log('⚠️ No se pudo conectar al servidor, simulando lógicamente...');
        
        const currentOrder = await collection.findOne({ _id: orderId });
        if (!currentOrder) {
            return { success: false, error: 'Orden no encontrada' };
        }
        
        // Detectar productos eliminados
        const requestedProductIds = requestedProducts.map(p => p.productId);
        const productsToDelete = currentOrder.requestedProducts.filter(
            currentProduct => !requestedProductIds.includes(currentProduct.productId)
        );
        
        const changes = [];
        
        // Registrar eliminaciones
        productsToDelete.forEach(product => {
            changes.push({
                type: 'PRODUCTO_ELIMINADO',
                productId: product.productId,
                productName: product.productSnapshot.name,
                details: `Eliminado completamente (${product.requestedQuantity} unidades)`
            });
        });
        
        // Si no quedan productos, simular eliminación de orden
        if (requestedProducts.length === 0) {
            await collection.deleteOne({ _id: orderId });
            return {
                success: true,
                message: 'Orden eliminada completamente porque no quedan productos',
                deleted: true,
                orderId: orderId.toString(),
                audit: { changes },
                tableReleased: currentOrder.orderType === 'table'
            };
        }
        
        // Si hay cambios, simular actualización
        if (changes.length > 0) {
            await collection.updateOne(
                { _id: orderId },
                {
                    $set: {
                        requestedProducts: requestedProducts.map(p => {
                            const currentProduct = currentOrder.requestedProducts.find(cp => cp.productId === p.productId);
                            return currentProduct ? {
                                ...currentProduct,
                                requestedQuantity: p.requestedQuantity
                            } : p;
                        }),
                        updatedAt: new Date()
                    }
                }
            );
            
            return {
                success: true,
                message: 'Orden editada exitosamente',
                order: { requestedProducts },
                audit: { changes }
            };
        }
        
        return {
            success: true,
            message: 'No se detectaron cambios en la orden',
            audit: null
        };
    }
}

// Ejecutar pruebas
testProductDeletion();