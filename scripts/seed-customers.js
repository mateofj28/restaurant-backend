import mongoose from 'mongoose';
import Customer from '../src/models/Customer.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleCustomers = [
    {
        fullName: "María González Rodríguez",
        deliveryAddress: "Carrera 15 #32-45, Apartamento 502, Torre B",
        city: "Bogotá",
        state: "Cundinamarca",
        phoneNumber: "+573001234567",
        email: "maria.gonzalez@email.com",
        preferences: {
            preferredDeliveryTime: "evening",
            specialInstructions: "Tocar el timbre dos veces. Apartamento en el quinto piso."
        }
    },
    {
        fullName: "Carlos Alberto Martínez",
        deliveryAddress: "Calle 80 #11-20, Casa 15, Conjunto Residencial Los Pinos",
        city: "Bogotá",
        state: "Cundinamarca",
        phoneNumber: "+573109876543",
        email: "carlos.martinez@gmail.com",
        preferences: {
            preferredDeliveryTime: "afternoon",
            specialInstructions: "Entregar en portería. Preguntar por Carlos en el apartamento 302."
        }
    },
    {
        fullName: "Ana Sofía Ramírez",
        deliveryAddress: "Avenida 68 #45-67, Oficina 201, Edificio Empresarial",
        city: "Bogotá",
        state: "Cundinamarca",
        phoneNumber: "+573201122334",
        email: "ana.ramirez@empresa.com",
        preferences: {
            preferredDeliveryTime: "morning",
            specialInstructions: "Entregar en recepción del edificio entre 12:00 PM y 2:00 PM."
        }
    },
    {
        fullName: "Luis Fernando Herrera",
        deliveryAddress: "Transversal 25 #18-30, Casa 8, Barrio La Esperanza",
        city: "Medellín",
        state: "Antioquia",
        phoneNumber: "+573445566778",
        email: "luis.herrera@hotmail.com",
        preferences: {
            preferredDeliveryTime: "night",
            specialInstructions: "Casa de color azul con portón blanco. Hay un perro, tocar suavemente."
        }
    },
    {
        fullName: "Patricia Elena Vargas",
        deliveryAddress: "Calle 100 #15-25, Apartamento 1204, Edificio Panorama",
        city: "Cali",
        state: "Valle del Cauca",
        phoneNumber: "+573556677889",
        email: "patricia.vargas@yahoo.com",
        preferences: {
            preferredDeliveryTime: "afternoon",
            specialInstructions: "Apartamento en el piso 12. Ascensor disponible hasta las 10 PM."
        }
    },
    {
        fullName: "Roberto José Castillo",
        deliveryAddress: "Carrera 7 #85-40, Local 3, Centro Comercial Plaza Norte",
        city: "Barranquilla",
        state: "Atlántico",
        phoneNumber: "+573667788990",
        email: "roberto.castillo@outlook.com",
        preferences: {
            preferredDeliveryTime: "morning",
            specialInstructions: "Entregar en el local de tecnología, primer piso del centro comercial."
        }
    }
];

async function seedCustomers() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant');
        console.log('✅ Conectado a MongoDB');

        // Obtener Smart-Fit company
        const company = await mongoose.connection.db.collection('companies').findOne({ name: "Smart-Fit Restaurant" });
        if (!company) {
            console.log('❌ No se encontró la empresa Smart-Fit');
            return;
        }

        // Obtener admin user
        const admin = await mongoose.connection.db.collection('users').findOne({ email: "admin@smart-fit.com" });
        if (!admin) {
            console.log('❌ No se encontró el usuario admin');
            return;
        }

        console.log(`📍 Empresa: ${company.name} (${company._id})`);
        console.log(`👤 Admin: ${admin.name} (${admin._id})`);

        // Limpiar clientes existentes
        await Customer.deleteMany({ companyId: company._id });
        console.log('🧹 Clientes existentes eliminados');

        // Agregar companyId y createdBy
        const customersWithCompany = sampleCustomers.map(customer => ({
            ...customer,
            companyId: company._id,
            createdBy: admin._id
        }));

        // Crear clientes
        const insertedCustomers = await Customer.insertMany(customersWithCompany);
        console.log(`✅ ${insertedCustomers.length} clientes creados exitosamente`);

        // Mostrar estadísticas
        const stats = await Customer.aggregate([
            { $match: { companyId: company._id } },
            {
                $group: {
                    _id: '$city',
                    count: { $sum: 1 },
                    avgDeliveryTime: { $push: '$preferences.preferredDeliveryTime' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        console.log('\n📊 Resumen por ciudad:');
        stats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} clientes`);
        });

        // Mostrar algunos ejemplos
        console.log('\n👥 Clientes de ejemplo:');
        insertedCustomers.slice(0, 3).forEach(customer => {
            console.log(`  - ${customer.fullName} (${customer.city}) - ${customer.email}`);
        });

        console.log('\n🎉 ¡Clientes de Smart-Fit creados exitosamente!');
        console.log(`💡 Buscar clientes: GET /api/customers/search?query=maria`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    seedCustomers();
}

export default seedCustomers;