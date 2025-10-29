import mongoose from 'mongoose';
import Product from '../src/models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleProducts = [
    {
        name: "Pizza Margherita",
        price: 15.99,
        preparationTime: 20,
        category: "platos",
        description: "Pizza clásica italiana con salsa de tomate, mozzarella fresca y albahaca. Horneada en horno de leña para un sabor auténtico.",
        observations: "Disponible en masa fina o gruesa. Sin gluten disponible bajo pedido.",
        image: {
            url: "/uploads/products/pizza-margherita.svg",
            filename: "pizza-margherita.svg"
        },
        allergens: ["gluten", "lactosa"],
        nutritionalInfo: {
            calories: 280,
            proteins: 12,
            carbs: 35,
            fats: 10
        },
        tags: ["italiana", "vegetariana", "popular"],
        isActive: true,
        isAvailable: true
    },
    {
        name: "Ensalada César",
        price: 12.50,
        preparationTime: 10,
        category: "entradas",
        description: "Ensalada fresca con lechuga romana, crutones caseros, queso parmesano y nuestra salsa César especial.",
        observations: "Se puede agregar pollo a la plancha por $3 adicionales.",
        image: {
            url: "/uploads/products/ensalada-cesar.svg",
            filename: "ensalada-cesar.svg"
        },
        allergens: ["huevos", "lactosa"],
        nutritionalInfo: {
            calories: 180,
            proteins: 8,
            carbs: 12,
            fats: 12
        },
        tags: ["saludable", "fresca", "clásica"],
        isActive: true,
        isAvailable: true
    },
    {
        name: "Tiramisú",
        price: 8.99,
        preparationTime: 5,
        category: "postres",
        description: "Postre italiano tradicional con capas de bizcocho empapado en café, crema de mascarpone y cacao en polvo.",
        observations: "Contiene alcohol (licor de café). Preparado diariamente en casa.",
        image: {
            url: "/uploads/products/tiramisu.svg",
            filename: "tiramisu.svg"
        },
        allergens: ["huevos", "lactosa", "gluten"],
        nutritionalInfo: {
            calories: 320,
            proteins: 6,
            carbs: 28,
            fats: 20
        },
        tags: ["italiano", "café", "cremoso"],
        isActive: true,
        isAvailable: true
    },
    {
        name: "Coca Cola",
        price: 3.50,
        preparationTime: 1,
        category: "bebidas",
        description: "Bebida gaseosa refrescante servida bien fría con hielo y limón.",
        observations: "Disponible en versión regular, zero y light. Tamaño 350ml.",
        image: {
            url: "/uploads/products/coca-cola.svg",
            filename: "coca-cola.svg"
        },
        allergens: [],
        nutritionalInfo: {
            calories: 140,
            proteins: 0,
            carbs: 39,
            fats: 0
        },
        tags: ["refrescante", "gaseosa", "clásica"],
        isActive: true,
        isAvailable: true
    },
    {
        name: "Pasta Carbonara",
        price: 16.99,
        preparationTime: 15,
        category: "platos",
        description: "Pasta italiana con salsa cremosa de huevo, queso pecorino, panceta y pimienta negra recién molida.",
        observations: "Preparada al momento. No contiene crema, receta tradicional romana.",
        allergens: ["gluten", "huevos", "lactosa"],
        nutritionalInfo: {
            calories: 420,
            proteins: 18,
            carbs: 45,
            fats: 18
        },
        tags: ["italiana", "cremosa", "tradicional"],
        isActive: true,
        isAvailable: true
    },
    {
        name: "Bruschetta Italiana",
        price: 9.99,
        preparationTime: 8,
        category: "entradas",
        description: "Pan tostado con tomate fresco, albahaca, ajo y aceite de oliva extra virgen.",
        observations: "Se sirve en porción de 4 unidades. Pan artesanal horneado en casa.",
        allergens: ["gluten"],
        nutritionalInfo: {
            calories: 160,
            proteins: 5,
            carbs: 25,
            fats: 6
        },
        tags: ["italiana", "vegetariana", "fresca"],
        isActive: true,
        isAvailable: true
    },
    {
        name: "Panna Cotta de Frutos Rojos",
        price: 7.50,
        preparationTime: 3,
        category: "postres",
        description: "Postre cremoso italiano con coulis de frutos rojos y decoración de menta fresca.",
        observations: "Sin gluten. Preparado con gelatina, no apto para veganos.",
        allergens: ["lactosa"],
        nutritionalInfo: {
            calories: 220,
            proteins: 4,
            carbs: 24,
            fats: 12
        },
        tags: ["cremoso", "sin gluten", "frutal"],
        isActive: true,
        isAvailable: true
    },
    {
        name: "Agua Mineral",
        price: 2.50,
        preparationTime: 1,
        category: "bebidas",
        description: "Agua mineral natural sin gas, servida fría. Botella de 500ml.",
        observations: "También disponible con gas. Marca premium importada.",
        allergens: [],
        nutritionalInfo: {
            calories: 0,
            proteins: 0,
            carbs: 0,
            fats: 0
        },
        tags: ["natural", "saludable", "hidratante"],
        isActive: true,
        isAvailable: true
    }
];

async function seedProducts() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant');
        console.log('✅ Conectado a MongoDB');

        // Obtener el primer companyId disponible (para el ejemplo)
        // En un caso real, deberías especificar el companyId correcto
        const companies = await mongoose.connection.db.collection('companies').find({}).limit(1).toArray();
        
        if (companies.length === 0) {
            console.log('❌ No se encontraron empresas. Crea una empresa primero.');
            process.exit(1);
        }

        const companyId = companies[0]._id;
        console.log(`📍 Usando empresa: ${companies[0].name} (${companyId})`);

        // Obtener el primer usuario admin para createdBy
        const users = await mongoose.connection.db.collection('users').find({ role: 'admin' }).limit(1).toArray();
        
        if (users.length === 0) {
            console.log('❌ No se encontraron usuarios admin. Crea un usuario admin primero.');
            process.exit(1);
        }

        const createdBy = users[0]._id;
        console.log(`👤 Creado por: ${users[0].name} (${createdBy})`);

        // Limpiar productos existentes de esta empresa
        await Product.deleteMany({ companyId });
        console.log('🧹 Productos existentes eliminados');

        // Agregar companyId y createdBy a todos los productos
        const productsWithCompany = sampleProducts.map(product => ({
            ...product,
            companyId,
            createdBy
        }));

        // Insertar productos de muestra
        const insertedProducts = await Product.insertMany(productsWithCompany);
        console.log(`✅ ${insertedProducts.length} productos creados exitosamente`);

        // Mostrar resumen por categoría
        const stats = await Product.aggregate([
            { $match: { companyId } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$price' },
                    avgPrepTime: { $avg: '$preparationTime' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n📊 Resumen por categoría:');
        stats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} productos, precio promedio: $${stat.avgPrice.toFixed(2)}, tiempo promedio: ${stat.avgPrepTime.toFixed(0)} min`);
        });

        console.log('\n🎉 ¡Productos de muestra creados exitosamente!');
        console.log('💡 Puedes ver el menú en: GET /api/products/menu/' + companyId);
        
    } catch (error) {
        console.error('❌ Error al crear productos:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    seedProducts();
}

export default seedProducts;