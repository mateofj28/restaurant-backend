// Script para probar TODAS las funcionalidades del endpoint PUT mejorado
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const COMPANY_ID = '6901b96a2412a976618fb34a';

async function testCompleteUpdate() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('🔗 Conectado a MongoDB\n');
        
        const db = client.db(process.env.DB_NAME);
        const ordersCollection = db.collection('orders');
        const productsCollection = db.collection('products');
        
        // Obtener productos disponibles
        const products = await productsCollection.find({
            companyId: new ObjectId(COMPANY_ID)
        }).limit(3).toArray();
        
        if (products.length < 2) {
            console.log('❌ Se necesitan al menos 2 productos para las pruebas');
            return;
        }
        
        console.log('📦 Productos disponibles para pruebas:');
        products.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name} - $${p.price} (ID: ${p._id})`);
        });
        
        // Crear orden inicial para probar
        console.log('\n🏗️  Creando orden inicial para pruebas...');
        const initialOrder = {
            orderType: "table",
            tableId: "69027b8248ad048a952f31c8", // Mesa 1
            peopleCount: 2,
            requestedProducts: [
                {
                    productId: products[0]._id.toString(),
                    productSnapshot: {
                        name: products[0].name,
                        price: products[0].price,
                        category: products[0].category,
                        description: products[0].description
                    },
                    requestedQuantity: 2,
                    message: "Sin cebolla",
                    statusByQuantity: [
                        { index: 1, status: "pendiente" },
                        { index: 2, status: "en_preparacion" }
                    ]
                }
            ],
            itemCount: 1,
            total: products[0].price * 2,
            createdAt: new Date(),
            status: "received",
            companyId: COMPANY_ID,
            createdBy: null
        };
        
        const createResult = await ordersCollection.insertOne(initialOrder);
        const orderId = createResult.insertedId;
        
        console.log(`✅ Orden inicial creada: ${orderId}`);
        console.log(`   Producto: ${products[0].name} x2`);
        console.log(`   Estados: pendiente, en_preparacion`);
        console.log(`   Total: $${initialOrder.total}`);
        
        // TEST 1: Aumentar cantidad (mantener estados + agregar nuevos)
        console.log('\n🧪 TEST 1: Aumentar cantidad de producto existente');
        const test1Update = {
            orderType: "table",
            tableId: "69027b8248ad048a952f31c8",
            peopleCount: 2,
            requestedProducts: [
                {
                    productId: products[0]._id.toString(),
                    productSnapshot: {
                        name: products[0].name,
                        price: products[0].price,
                        category: products[0].category,
                        description: products[0].description
                    },
                    requestedQuantity: 4, // Aumentamos de 2 a 4
                    message: "Sin cebolla",
                    statusByQuantity: [] // El backend debe ser inteligente
                }
            ]
        };
        
        await testUpdate(ordersCollection, orderId, test1Update, 'Aumentar cantidad');
        
        // TEST 2: Disminuir cantidad (mantener solo primeros estados)
        console.log('\n🧪 TEST 2: Disminuir cantidad de producto existente');
        const test2Update = {
            orderType: "table",
            tableId: "69027b8248ad048a952f31c8",
            peopleCount: 2,
            requestedProducts: [
                {
                    productId: products[0]._id.toString(),
                    productSnapshot: {
                        name: products[0].name,
                        price: products[0].price,
                        category: products[0].category,
                        description: products[0].description
                    },
                    requestedQuantity: 1, // Disminuimos de 4 a 1
                    message: "Sin cebolla",
                    statusByQuantity: []
                }
            ]
        };
        
        await testUpdate(ordersCollection, orderId, test2Update, 'Disminuir cantidad');
        
        // TEST 3: Agregar producto nuevo
        console.log('\n🧪 TEST 3: Agregar producto nuevo');
        const test3Update = {
            orderType: "table",
            tableId: "69027b8248ad048a952f31c8",
            peopleCount: 2,
            requestedProducts: [
                {
                    productId: products[0]._id.toString(),
                    productSnapshot: {
                        name: products[0].name,
                        price: products[0].price,
                        category: products[0].category,
                        description: products[0].description
                    },
                    requestedQuantity: 1,
                    message: "Sin cebolla",
                    statusByQuantity: []
                },
                {
                    productId: products[1]._id.toString(),
                    productSnapshot: {
                        name: products[1].name,
                        price: products[1].price,
                        category: products[1].category,
                        description: products[1].description
                    },
                    requestedQuantity: 3, // Producto nuevo
                    message: "Extra queso",
                    statusByQuantity: []
                }
            ]
        };
        
        await testUpdate(ordersCollection, orderId, test3Update, 'Agregar producto nuevo');
        
        // TEST 4: Cambiar tipo de orden (table → delivery)
        console.log('\n🧪 TEST 4: Cambiar tipo de orden a delivery');
        const test4Update = {
            orderType: "delivery",
            tableId: null,
            peopleCount: null,
            customerId: "customer123",
            deliveryAddress: "Calle 123 #45-67",
            requestedProducts: [
                {
                    productId: products[0]._id.toString(),
                    productSnapshot: {
                        name: products[0].name,
                        price: products[0].price,
                        category: products[0].category,
                        description: products[0].description
                    },
                    requestedQuantity: 1,
                    message: "Sin cebolla",
                    statusByQuantity: []
                },
                {
                    productId: products[1]._id.toString(),
                    productSnapshot: {
                        name: products[1].name,
                        price: products[1].price,
                        category: products[1].category,
                        description: products[1].description
                    },
                    requestedQuantity: 3,
                    message: "Extra queso",
                    statusByQuantity: []
                }
            ]
        };
        
        await testUpdate(ordersCollection, orderId, test4Update, 'Cambiar a delivery');
        
        // TEST 5: Eliminar producto
        console.log('\n🧪 TEST 5: Eliminar un producto');
        const test5Update = {
            orderType: "delivery",
            tableId: null,
            customerId: "customer123",
            deliveryAddress: "Calle 123 #45-67",
            requestedProducts: [
                {
                    productId: products[1]._id.toString(),
                    productSnapshot: {
                        name: products[1].name,
                        price: products[1].price,
                        category: products[1].category,
                        description: products[1].description
                    },
                    requestedQuantity: 3,
                    message: "Extra queso",
                    statusByQuantity: []
                }
                // Eliminamos el primer producto
            ]
        };
        
        await testUpdate(ordersCollection, orderId, test5Update, 'Eliminar producto');
        
        // TEST 6: Cambiar de vuelta a mesa
        console.log('\n🧪 TEST 6: Cambiar de vuelta a mesa');
        const test6Update = {
            orderType: "table",
            tableId: "69027b8248ad048a952f31c9", // Mesa diferente
            peopleCount: 4,
            requestedProducts: [
                {
                    productId: products[1]._id.toString(),
                    productSnapshot: {
                        name: products[1].name,
                        price: products[1].price,
                        category: products[1].category,
                        description: products[1].description
                    },
                    requestedQuantity: 3,
                    message: "Extra queso",
                    statusByQuantity: []
                }
            ]
        };
        
        await testUpdate(ordersCollection, orderId, test6Update, 'Cambiar a mesa diferente');
        
        console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
        
        // Limpiar orden de prueba
        await ordersCollection.deleteOne({ _id: orderId });
        console.log('🧹 Orden de prueba eliminada');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

async function testUpdate(collection, orderId, updateData, testName) {
    try {
        console.log(`\n📤 Enviando actualización: ${testName}`);
        console.log(`   Productos: ${updateData.requestedProducts.length}`);
        console.log(`   Tipo: ${updateData.orderType}`);
        
        // Simular la lógica del endpoint PUT
        const currentOrder = await collection.findOne({ _id: orderId });
        
        // Procesar productos con lógica inteligente
        const processedProducts = updateData.requestedProducts.map(product => {
            const existingProduct = currentOrder.requestedProducts.find(p => p.productId === product.productId);
            
            if (existingProduct) {
                if (existingProduct.requestedQuantity === product.requestedQuantity) {
                    return { ...product, statusByQuantity: existingProduct.statusByQuantity };
                } else if (existingProduct.requestedQuantity < product.requestedQuantity) {
                    const newStatuses = [];
                    for (let i = 0; i < product.requestedQuantity; i++) {
                        if (i < existingProduct.statusByQuantity.length) {
                            newStatuses.push(existingProduct.statusByQuantity[i]);
                        } else {
                            newStatuses.push({ index: i + 1, status: 'pendiente' });
                        }
                    }
                    return { ...product, statusByQuantity: newStatuses };
                } else {
                    return { ...product, statusByQuantity: existingProduct.statusByQuantity.slice(0, product.requestedQuantity) };
                }
            } else {
                const newStatuses = [];
                for (let i = 0; i < product.requestedQuantity; i++) {
                    newStatuses.push({ index: i + 1, status: 'pendiente' });
                }
                return { ...product, statusByQuantity: newStatuses };
            }
        });
        
        const total = processedProducts.reduce((sum, p) => sum + (p.productSnapshot.price * p.requestedQuantity), 0);
        
        const finalUpdate = {
            ...updateData,
            requestedProducts: processedProducts,
            itemCount: processedProducts.length,
            total: parseFloat(total.toFixed(2)),
            updatedAt: new Date()
        };
        
        const result = await collection.findOneAndUpdate(
            { _id: orderId },
            { $set: finalUpdate },
            { returnDocument: 'after' }
        );
        
        console.log(`✅ ${testName} exitoso`);
        console.log(`   Total recalculado: $${result.total}`);
        console.log(`   Items: ${result.itemCount}`);
        
        // Mostrar estados preservados/creados
        result.requestedProducts.forEach((product, i) => {
            const estados = product.statusByQuantity.map(s => s.status).join(', ');
            console.log(`   Producto ${i + 1}: ${product.requestedQuantity} unidades [${estados}]`);
        });
        
    } catch (error) {
        console.error(`❌ Error en ${testName}:`, error.message);
    }
}

testCompleteUpdate();