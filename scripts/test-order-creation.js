// Script para probar la creación de órdenes con la nueva estructura
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const COMPANY_ID = '6901b96a2412a976618fb34a';

async function testOrderCreation() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Conectado a MongoDB');
        
        const db = client.db(process.env.DB_NAME);
        
        // Obtener una mesa disponible
        const tablesCollection = db.collection('tables');
        const availableTable = await tablesCollection.findOne({
            companyId: COMPANY_ID,
            status: 'available',
            isActive: true
        });
        
        if (!availableTable) {
            console.log('❌ No hay mesas disponibles para probar');
            return;
        }
        
        // Obtener un producto disponible
        const productsCollection = db.collection('products');
        const availableProduct = await productsCollection.findOne({
            companyId: new ObjectId(COMPANY_ID)
        });
        
        if (!availableProduct) {
            console.log('❌ No hay productos disponibles para probar');
            return;
        }
        
        console.log(`🪑 Mesa seleccionada: ${availableTable.number} (ID: ${availableTable._id})`);
        console.log(`🍔 Producto seleccionado: ${availableProduct.name} - $${availableProduct.price}`);
        
        // Crear orden de ejemplo con la nueva estructura
        const ordersCollection = db.collection('orders');
        
        const sampleOrder = {
            orderType: "table",
            tableId: availableTable._id.toString(),
            peopleCount: 2,
            requestedProducts: [
                {
                    productId: availableProduct._id.toString(),
                    productSnapshot: {
                        name: availableProduct.name,
                        price: availableProduct.price,
                        category: availableProduct.category || '',
                        description: availableProduct.description || ''
                    },
                    requestedQuantity: 2,
                    message: "Sin cebolla por favor",
                    statusByQuantity: [
                        { index: 1, status: "pendiente" },
                        { index: 2, status: "pendiente" }
                    ]
                }
            ],
            itemCount: 1,
            total: availableProduct.price * 2,
            createdAt: new Date(),
            status: "received",
            companyId: COMPANY_ID,
            createdBy: null
        };
        
        console.log('\n📝 Creando orden con estructura actualizada...');
        const result = await ordersCollection.insertOne(sampleOrder);
        
        // Actualizar estado de la mesa
        await tablesCollection.updateOne(
            { _id: availableTable._id },
            {
                $set: {
                    status: 'occupied',
                    currentOrder: result.insertedId,
                    occupiedAt: new Date(),
                    occupiedBy: 'test-script'
                }
            }
        );
        
        console.log('✅ Orden creada exitosamente!');
        console.log(`   ID de la orden: ${result.insertedId}`);
        console.log(`   Mesa ocupada: ${availableTable.number}`);
        console.log(`   Total: $${sampleOrder.total}`);
        
        // Mostrar la estructura final
        const createdOrder = await ordersCollection.findOne({ _id: result.insertedId });
        console.log('\n📋 Estructura de la orden creada:');
        console.log(JSON.stringify(createdOrder, null, 2));
        
        // Verificar que cumple con el formato requerido
        console.log('\n🔍 Verificación de estructura:');
        console.log(`✅ Usa tableId en lugar de table: ${!!createdOrder.tableId}`);
        console.log(`✅ Tiene productSnapshot: ${!!createdOrder.requestedProducts[0].productSnapshot}`);
        console.log(`✅ Tiene statusByQuantity: ${!!createdOrder.requestedProducts[0].statusByQuantity}`);
        console.log(`✅ Usa companyId como referencia: ${!!createdOrder.companyId}`);
        console.log(`✅ Fechas como Date objects: ${createdOrder.createdAt instanceof Date}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

// Ejecutar el script
testOrderCreation();