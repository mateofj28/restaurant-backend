import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre del producto es requerido'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    price: {
        type: Number,
        required: [true, 'El precio es requerido'],
        min: [0, 'El precio debe ser mayor a 0']
    },
    preparationTime: {
        type: Number,
        required: [true, 'El tiempo de preparación es requerido'],
        min: [1, 'El tiempo de preparación debe ser al menos 1 minuto']
    },
    image: {
        url: {
            type: String,
            default: null
        },
        publicId: {
            type: String,
            default: null
        },
        filename: {
            type: String,
            default: null
        }
    },
    category: {
        type: String,
        required: [true, 'La categoría es requerida'],
        enum: {
            values: ['entradas', 'platos', 'postres', 'bebidas'],
            message: 'La categoría debe ser: entradas, platos, postres o bebidas'
        }
    },
    description: {
        type: String,
        required: [true, 'La descripción es requerida'],
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },
    observations: {
        type: String,
        trim: true,
        maxlength: [300, 'Las observaciones no pueden exceder 300 caracteres'],
        default: ''
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
    isAvailable: {
        type: Boolean,
        default: true
    },
    nutritionalInfo: {
        calories: { type: Number, min: 0 },
        proteins: { type: Number, min: 0 },
        carbs: { type: Number, min: 0 },
        fats: { type: Number, min: 0 }
    },
    allergens: [{
        type: String,
        enum: ['gluten', 'lactosa', 'frutos_secos', 'mariscos', 'huevos', 'soja', 'pescado']
    }],
    tags: [String],
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
productSchema.index({ companyId: 1, category: 1 });
productSchema.index({ companyId: 1, isActive: 1, isAvailable: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtual para URL completa de imagen
productSchema.virtual('imageUrl').get(function() {
    if (this.image && this.image.url) {
        return this.image.url.startsWith('http') ? this.image.url : `${process.env.BASE_URL}/uploads/${this.image.filename}`;
    }
    return `${process.env.BASE_URL}/images/default-product.jpg`;
});

// Middleware para eliminar imagen al borrar producto
productSchema.pre('findOneAndDelete', async function() {
    const product = await this.model.findOne(this.getQuery());
    if (product && product.image && product.image.filename) {
        // Aquí se podría implementar la eliminación de la imagen del storage
        console.log(`Eliminar imagen: ${product.image.filename}`);
    }
});

export default mongoose.model('Product', productSchema);