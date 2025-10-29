import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'El nombre completo es requerido'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    deliveryAddress: {
        type: String,
        required: [true, 'La dirección de entrega es requerida'],
        trim: true,
        maxlength: [200, 'La dirección no puede exceder 200 caracteres']
    },
    city: {
        type: String,
        required: [true, 'La ciudad es requerida'],
        trim: true,
        maxlength: [50, 'La ciudad no puede exceder 50 caracteres']
    },
    state: {
        type: String,
        required: [true, 'El departamento es requerido'],
        trim: true,
        maxlength: [50, 'El departamento no puede exceder 50 caracteres']
    },
    phoneNumber: {
        type: String,
        required: [true, 'El número de celular es requerido'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^(\+57|57)?[0-9]{10}$/.test(v.replace(/\s/g, ''));
            },
            message: 'Número de celular inválido. Formato: +57XXXXXXXXXX o 57XXXXXXXXXX o XXXXXXXXXX'
        }
    },
    email: {
        type: String,
        required: [true, 'El correo electrónico es requerido'],
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Formato de correo electrónico inválido'
        }
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'El ID de la empresa es requerido']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    orderHistory: [{
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        orderDate: {
            type: Date,
            default: Date.now
        },
        totalAmount: {
            type: Number,
            min: 0
        }
    }],
    preferences: {
        preferredDeliveryTime: {
            type: String,
            enum: ['morning', 'afternoon', 'evening', 'night'],
            default: 'afternoon'
        },
        specialInstructions: {
            type: String,
            maxlength: [300, 'Las instrucciones especiales no pueden exceder 300 caracteres'],
            default: ''
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices para optimizar consultas
customerSchema.index({ companyId: 1, email: 1 }, { unique: true });
customerSchema.index({ companyId: 1, phoneNumber: 1 });
customerSchema.index({ companyId: 1, isActive: 1 });
customerSchema.index({ fullName: 'text', email: 'text' });

// Virtual para obtener el número total de órdenes
customerSchema.virtual('totalOrders').get(function() {
    return this.orderHistory ? this.orderHistory.length : 0;
});

// Virtual para obtener el valor total gastado
customerSchema.virtual('totalSpent').get(function() {
    if (!this.orderHistory || this.orderHistory.length === 0) return 0;
    return this.orderHistory.reduce((total, order) => total + (order.totalAmount || 0), 0);
});

// Virtual para formatear el número de teléfono
customerSchema.virtual('formattedPhone').get(function() {
    if (!this.phoneNumber) return '';
    const phone = this.phoneNumber.replace(/\D/g, '');
    if (phone.length === 10) {
        return `+57 ${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6)}`;
    }
    return this.phoneNumber;
});

// Middleware para validar email único por empresa
customerSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('email')) {
        const existingCustomer = await this.constructor.findOne({
            companyId: this.companyId,
            email: this.email,
            _id: { $ne: this._id }
        });
        
        if (existingCustomer) {
            const error = new Error('Ya existe un cliente con este correo electrónico en la empresa');
            error.code = 'DUPLICATE_EMAIL';
            return next(error);
        }
    }
    next();
});

export default mongoose.model('Customer', customerSchema);