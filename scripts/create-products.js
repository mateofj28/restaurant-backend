// Script para crear productos de ejemplo para la empresa
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const COMPANY_ID = '6901b96a2412a976618fb34a';

const sampleProducts = [
    {
        name: "Hamburguesa Doble",
        description: "Hamburguesa con doble carne, queso, lechuga y tomate",
        price: 8.5,
        category: "Hamburguesas",
        isActive: true
    },
    {
        name: "Pizza Margherita",
        description: "Pizza clásica con tomate, mozzarella y albahaca",
        price: 12.0,
        category: "Pizzas",
        isActive: true
    },
    {
        name: "Ensalada César",
        description: "Ensalada fresca con pollo, crutones y aderezo césar",
        price: 7.5,
        category: "Ensaladas",
        isActive: true
    },
    {
        name: "Coca Cola",
        description: "Refresco de cola 350ml",
        price: 2.0,
        category: "Bebidas",
        isActive: true
    },
    {
        name: "Papas Fritas",
        description: "Papas fritas crujientes con sal",
        price: 3.5,
        category: "Acompañamientos",
        isActive: true
    }
];

async function createProducts() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Conectado a MongoDB');
        
        const db = client.db(process.env.DB_NAME);
        const collection = db.collection('products');
        
        const productsToCreate = sampleProducts.map(product => ({
            ...product,
            companyId: COMPANY_ID,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system-script'
        }));
        
        console.log('\n🍔 Creando productos para la empresa...');
        const result = await collection.insertMany(productsToCreate);
        
        console.log(`✅ ${result.insertedCount} productos creados exitosamente`);
        console.log('\n📋 Productos creados:');
        
        productsToCreate.forEach((product, index) => {
            const insertedId = Object.values(result.insertedIds)[index];
            console.log(`   🍽️  ${product.name}`);
            console.log(`      ID: ${insertedId}`);
            console.log(`      Precio: $${product.price}`);
            console.log(`      Categoría: ${product.category}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error al crear productos:', error);
    } finally {
        await client.close();
        console.log('🔌 Conexión cerrada');
    }
}

createProducts();