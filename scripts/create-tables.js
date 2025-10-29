// Script para crear 5 mesas para la empresa específica
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const COMPANY_ID = '6901b96a2412a976618fb34a';

const tables = [
    {
        number: 1,
        capacity: 2,
        location: 'Terraza',
        description: 'Mesa pequeña junto a la ventana'
    },
    {
        number: 2,
        capacity: 4,
        location: 'Salón principal',
        description: 'Mesa familiar en el centro del salón'
    },
    {
        number: 3,
        capacity: 6,
        location: 'Salón principal',
        description: 'Mesa grande para grupos'
    },
    {
        number: 4,
        capacity: 2,
        location: 'Área VIP',
        description: 'Mesa íntima en zona reservada'
    },
    {
        number: 5,
        capacity: 8,
        location: 'Salón de eventos',
        description: 'Mesa grande para celebraciones'
    }
];

async function createTables() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Conectado a MongoDB');
        
        const db = client.db(process.env.DB_NAME);
        const collection = db.collection('tables');
        
        // Verificar si ya existen mesas para esta empresa
        const existingTables = await collection.find({ 
            companyId: COMPANY_ID 
        }).toArray();
        
        if (existingTables.length > 0) {
            console.log(`⚠️  Ya existen ${existingTables.length} mesas para esta empresa:`);
            existingTables.forEach(table => {
                console.log(`   Mesa ${table.number} - Capacidad: ${table.capacity} - ${table.location}`);
            });
            console.log('\n¿Deseas continuar creando más mesas? (Las nuevas tendrán números consecutivos)');
        }
        
        // Obtener el número más alto existente
        const highestNumber = existingTables.length > 0 
            ? Math.max(...existingTables.map(t => t.number))
            : 0;
        
        const tablesToCreate = tables.map((table, index) => ({
            number: highestNumber + index + 1, // Números consecutivos
            capacity: table.capacity,
            status: 'available',
            companyId: COMPANY_ID,
            location: table.location,
            description: table.description,
            isActive: true,
            currentOrder: null,
            occupiedAt: null,
            occupiedBy: null,
            createdAt: new Date(),
            createdBy: 'system-script',
            updatedAt: new Date()
        }));
        
        console.log('\n🏗️  Creando las siguientes mesas:');
        tablesToCreate.forEach(table => {
            console.log(`   Mesa ${table.number} - Capacidad: ${table.capacity} personas - ${table.location}`);
        });
        
        const result = await collection.insertMany(tablesToCreate);
        
        console.log(`\n✅ ${result.insertedCount} mesas creadas exitosamente para la empresa ${COMPANY_ID}`);
        console.log('\n📋 Resumen de mesas creadas:');
        
        tablesToCreate.forEach((table, index) => {
            const insertedId = Object.values(result.insertedIds)[index];
            console.log(`   🪑 Mesa ${table.number}`);
            console.log(`      ID: ${insertedId}`);
            console.log(`      Capacidad: ${table.capacity} personas`);
            console.log(`      Ubicación: ${table.location}`);
            console.log(`      Descripción: ${table.description}`);
            console.log(`      Estado: ${table.status}`);
            console.log('');
        });
        
        // Mostrar estadísticas finales
        const allTables = await collection.find({ companyId: COMPANY_ID }).toArray();
        console.log(`📊 Total de mesas para esta empresa: ${allTables.length}`);
        console.log(`   Capacidad total: ${allTables.reduce((sum, t) => sum + t.capacity, 0)} personas`);
        
    } catch (error) {
        console.error('❌ Error al crear las mesas:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada');
    }
}

// Ejecutar el script
createTables();