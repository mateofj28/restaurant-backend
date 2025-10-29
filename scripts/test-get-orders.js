// Script para probar el GET de órdenes con la nueva estructura
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const COMPANY_ID = '6901b96a2412a976618fb34a';

async function testGetOrders() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Conectado a MongoDB');
        
        const db = client.db(process.env.DB_NAME);
        const collection = db.collection('orders');
        
        console.log('🔍 Probando la nueva estructura del GET de órdenes...\n');
        
        // Simular el pipeline de agregación que usa el endpoint
        const pipeline = [
            // Filtrar por empresa
            {
                $match: {
                    companyId: COMPANY_ID
                }
            },
            // Lookup para obtener información de la mesa
            {
                $lookup: {
                    from: 'tables',
                    let: { tableId: { $toObjectId: '$tableId' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$tableId'] }
                            }
                        },
                        {
                            $project: {
                                number: 1,
                                capacity: 1,
                                location: 1,
                                status: 1
                            }
                        }
                    ],
                    as: 'tableInfo'
                }
            },
            // Lookup para obtener información de la empresa
            {
                $lookup: {
                    from: 'companies',
                    let: { companyId: { $toObjectId: '$companyId' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$companyId'] }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                businessName: 1,
                                address: 1
                            }
                        }
                    ],
                    as: 'companyInfo'
                }
            },
            // Reestructurar el resultado
            {
                $addFields: {
                    tableInfo: { $arrayElemAt: ['$tableInfo', 0] },
                    companyInfo: { $arrayElemAt: ['$companyInfo', 0] }
                }
            },
            // Ordenar del más nuevo al más viejo
            {
                $sort: { createdAt: -1 }
            },
            // Limitar a 3 órdenes para la prueba
            {
                $limit: 3
            }
        ];

        const orders = await collection.aggregate(pipeline).toArray();
        
        console.log(`📦 Órdenes encontradas: ${orders.length}\n`);
        
        orders.forEach((order, index) => {
            console.log(`🍽️  Orden ${index + 1}:`);
            console.log(`   ID: ${order._id}`);
            console.log(`   Tipo: ${order.orderType}`);
            console.log(`   Estado: ${order.status}`);
            console.log(`   Total: $${order.total}`);
            console.log(`   Productos: ${order.itemCount} items`);
            
            if (order.orderType === 'table') {
                console.log(`   Mesa ID: ${order.tableId}`);
                if (order.tableInfo) {
                    console.log(`   Mesa Info: Mesa ${order.tableInfo.number} - ${order.tableInfo.location} (Capacidad: ${order.tableInfo.capacity})`);
                } else {
                    console.log(`   Mesa Info: No encontrada`);
                }
                console.log(`   Personas: ${order.peopleCount}`);
            }
            
            if (order.companyInfo) {
                console.log(`   Empresa: ${order.companyInfo.name || order.companyInfo.businessName}`);
            }
            
            console.log(`   Productos solicitados:`);
            order.requestedProducts.forEach((product, pIndex) => {
                console.log(`     ${pIndex + 1}. ${product.productSnapshot.name} - $${product.productSnapshot.price}`);
                console.log(`        Cantidad: ${product.requestedQuantity}`);
                console.log(`        Estados: ${product.statusByQuantity.map(s => `${s.index}:${s.status}`).join(', ')}`);
                if (product.message) {
                    console.log(`        Mensaje: ${product.message}`);
                }
            });
            
            console.log(`   Creado: ${order.createdAt}`);
            console.log('');
        });
        
        // Verificar estructura esperada
        if (orders.length > 0) {
            const sampleOrder = orders[0];
            console.log('🔍 Verificación de estructura:');
            console.log(`✅ Tiene tableId: ${!!sampleOrder.tableId}`);
            console.log(`✅ Tiene tableInfo: ${!!sampleOrder.tableInfo}`);
            console.log(`✅ Tiene companyInfo: ${!!sampleOrder.companyInfo}`);
            console.log(`✅ Tiene productSnapshot: ${!!sampleOrder.requestedProducts[0]?.productSnapshot}`);
            console.log(`✅ Tiene statusByQuantity: ${!!sampleOrder.requestedProducts[0]?.statusByQuantity}`);
            console.log(`✅ Estructura completa: ${JSON.stringify(sampleOrder, null, 2).length > 500 ? 'SÍ' : 'NO'}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

testGetOrders();