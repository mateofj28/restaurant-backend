// Script para probar la actualización de órdenes
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testUpdateOrder() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Conectado a MongoDB');
        
        const db = client.db(process.env.DB_NAME);
        const collection = db.collection('orders');
        
        // Obtener una orden existente con la nueva estructura
        const existingOrder = await collection.findOne({ 
            "requestedProducts.productSnapshot": { $exists: true } 
        });
        
        if (!existingOrder) {
            console.log('❌ No hay órdenes para probar. Crea una orden primero.');
            return;
        }
        
        console.log('🔍 Orden original encontrada:');
        console.log(`   ID: ${existingOrder._id}`);
        console.log(`   Estado: ${existingOrder.status}`);
        console.log(`   Productos: ${existingOrder.itemCount} items`);
        console.log(`   Total: $${existingOrder.total}`);
        
        // Simular una actualización de estado de producto
        const updatedProducts = existingOrder.requestedProducts.map(product => {
            const updatedProduct = { ...product };
            
            // Cambiar el estado del primer item a "en_preparacion"
            if (updatedProduct.statusByQuantity && updatedProduct.statusByQuantity.length > 0) {
                updatedProduct.statusByQuantity[0] = {
                    index: 1,
                    status: 'en_preparacion'
                };
            }
            
            return updatedProduct;
        });
        
        console.log('\n🔄 Simulando actualización de estado de producto...');
        
        // Preparar datos de actualización (solo lo que se debe cambiar)
        const updateData = {
            requestedProducts: updatedProducts,
            status: 'in_progress'
        };
        
        console.log('📤 Datos a actualizar:');
        console.log(`   Nuevo estado: ${updateData.status}`);
        console.log(`   Productos actualizados: ${updateData.requestedProducts.length}`);
        
        // Simular la lógica del endpoint PUT
        const allowedUpdates = {};
        
        if (updateData.requestedProducts !== undefined) {
            allowedUpdates.requestedProducts = updateData.requestedProducts;
            allowedUpdates.itemCount = updateData.requestedProducts.length;
            
            // Calcular nuevo total
            let newTotal = 0;
            updateData.requestedProducts.forEach(product => {
                if (product.productSnapshot && product.productSnapshot.price) {
                    newTotal += product.productSnapshot.price * product.requestedQuantity;
                }
            });
            allowedUpdates.total = parseFloat(newTotal.toFixed(2));
        }
        
        if (updateData.status !== undefined) {
            allowedUpdates.status = updateData.status;
        }
        
        allowedUpdates.updatedAt = new Date();
        
        console.log('\n✅ Campos que se actualizarán de forma segura:');
        console.log('   - requestedProducts (con nuevos estados)');
        console.log('   - status');
        console.log('   - updatedAt');
        console.log('   - itemCount (recalculado)');
        console.log('   - total (recalculado)');
        
        console.log('\n🔒 Campos que se preservan:');
        console.log('   - _id, orderType, tableId, companyId, createdBy, createdAt');
        console.log('   - productSnapshot (datos históricos)');
        console.log('   - peopleCount, tableInfo, companyInfo');
        
        // Actualizar la orden
        const result = await collection.findOneAndUpdate(
            { _id: existingOrder._id },
            { $set: allowedUpdates },
            { returnDocument: 'after' }
        );
        
        if (result) {
            console.log('\n✅ Orden actualizada exitosamente!');
            console.log(`   ID: ${result._id}`);
            console.log(`   Nuevo estado: ${result.status}`);
            console.log(`   Total recalculado: $${result.total}`);
            console.log(`   Actualizado en: ${result.updatedAt}`);
            
            // Verificar que los snapshots se preservaron
            console.log('\n🔍 Verificación de integridad:');
            const firstProduct = result.requestedProducts[0];
            console.log(`   ✅ ProductSnapshot preservado: ${!!firstProduct.productSnapshot}`);
            console.log(`   ✅ Nombre del producto: ${firstProduct.productSnapshot.name}`);
            console.log(`   ✅ Precio histórico: $${firstProduct.productSnapshot.price}`);
            console.log(`   ✅ Estado actualizado: ${firstProduct.statusByQuantity[0].status}`);
            
            // Verificar estructura completa
            const requiredFields = ['_id', 'orderType', 'requestedProducts', 'itemCount', 'total', 'createdAt', 'status', 'companyId'];
            const missingFields = requiredFields.filter(field => !result.hasOwnProperty(field));
            
            if (missingFields.length === 0) {
                console.log('   ✅ Todos los campos requeridos están presentes');
            } else {
                console.log(`   ❌ Campos faltantes: ${missingFields.join(', ')}`);
            }
            
        } else {
            console.log('❌ No se pudo actualizar la orden');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

testUpdateOrder();