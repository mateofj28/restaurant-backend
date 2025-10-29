# 🍽️ Gestión de Productos del Menú

## Descripción
Sistema completo para la gestión de productos del menú del restaurante, incluyendo subida de imágenes, categorización, información nutricional y gestión de disponibilidad.

## Características Principales

### ✨ Funcionalidades
- **CRUD completo** de productos
- **Subida de imágenes** con validación y optimización
- **Categorización** por tipo (entradas, platos, postres, bebidas)
- **Información nutricional** detallada
- **Gestión de alérgenos** y etiquetas
- **Control de disponibilidad** en tiempo real
- **Menú público** para clientes
- **Búsqueda y filtros** avanzados
- **Estadísticas** por categoría

### 🏗️ Arquitectura
```
src/
├── models/Product.js           # Modelo de datos
├── controllers/products.controller.js  # Lógica de negocio
├── routes/products.routes.js   # Endpoints API
└── config/swagger-simple.js    # Documentación API
```

## 📊 Modelo de Datos

### Campos Principales
- **name**: Nombre del producto
- **price**: Precio en moneda local
- **preparationTime**: Tiempo de preparación en minutos
- **category**: Categoría (entradas, platos, postres, bebidas)
- **description**: Descripción detallada
- **observations**: Notas adicionales

### Gestión de Imágenes
- **image.url**: URL de la imagen
- **image.filename**: Nombre del archivo
- **image.publicId**: ID para servicios externos (Cloudinary)
- **imageUrl**: URL completa (virtual)

### Información Adicional
- **nutritionalInfo**: Calorías, proteínas, carbohidratos, grasas
- **allergens**: Lista de alérgenos
- **tags**: Etiquetas personalizadas
- **isActive**: Estado del producto
- **isAvailable**: Disponibilidad actual

## 🚀 Endpoints API

### Gestión Interna (Requiere Autenticación)

#### Listar Productos
```http
GET /api/products
```
**Parámetros de consulta:**
- `category`: Filtrar por categoría
- `isActive`: Filtrar por estado (true/false/all)
- `isAvailable`: Filtrar por disponibilidad
- `search`: Búsqueda en nombre y descripción
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20)
- `sortBy`: Campo para ordenar (default: name)
- `sortOrder`: Orden (asc/desc)

#### Crear Producto
```http
POST /api/products
Content-Type: multipart/form-data
```
**Permisos:** Admin, Manager

#### Actualizar Producto
```http
PUT /api/products/{id}
Content-Type: multipart/form-data
```

#### Cambiar Disponibilidad
```http
PATCH /api/products/{id}/availability
Content-Type: application/json

{
  "isAvailable": false
}
```

### Menú Público (Sin Autenticación)

#### Obtener Menú por Empresa
```http
GET /api/products/menu/{companyId}
```
Retorna productos agrupados por categoría, solo los activos y disponibles.

## 🖼️ Gestión de Imágenes

### Configuración
- **Formatos permitidos**: JPEG, JPG, PNG, WebP
- **Tamaño máximo**: 5MB
- **Almacenamiento**: Local en `/uploads/products/`
- **Imagen por defecto**: `/images/default-product.jpg`

### Mejores Prácticas
1. **Optimización**: Redimensionar imágenes antes de subir
2. **Nombres únicos**: Timestamp + random para evitar conflictos
3. **Validación**: Verificar tipo MIME y extensión
4. **Limpieza**: Eliminar imágenes huérfanas automáticamente

## 📈 Estadísticas y Analytics

### Métricas Disponibles
- Productos por categoría
- Precio promedio por categoría
- Tiempo de preparación promedio
- Productos disponibles vs total
- Productos más populares (futuro)

## 🔧 Configuración y Uso

### Variables de Entorno
```env
BASE_URL=http://localhost:3000
UPLOAD_PATH=uploads/products
MAX_FILE_SIZE=5242880  # 5MB
```

### Poblar Base de Datos
```bash
npm run seed:products
```

### Estructura de Directorios
```
uploads/
└── products/           # Imágenes subidas
public/
└── images/
    └── default-product.jpg  # Imagen por defecto
```

## 🎯 Casos de Uso

### Para Administradores
1. **Crear menú completo** con imágenes y descripciones
2. **Gestionar precios** y tiempos de preparación
3. **Controlar disponibilidad** en tiempo real
4. **Analizar estadísticas** de productos

### Para Meseros
1. **Consultar disponibilidad** antes de tomar pedidos
2. **Cambiar estado** de productos agotados
3. **Ver información completa** para asesorar clientes

### Para Clientes (Futuro)
1. **Ver menú público** con imágenes
2. **Filtrar por categorías** y alérgenos
3. **Consultar información nutricional**

## 🔒 Seguridad

### Validaciones
- **Autenticación** requerida para gestión
- **Autorización** por roles (admin/manager/waiter)
- **Validación de archivos** estricta
- **Sanitización** de datos de entrada

### Protecciones
- **Rate limiting** en subida de archivos
- **Validación de tipos MIME**
- **Límites de tamaño** de archivo
- **Prevención de path traversal**

## 🧪 Testing

### Datos de Prueba
El script `seed:products` incluye productos de ejemplo:
- Pizza Margherita (platos)
- Ensalada César (entradas)
- Tiramisú (postres)
- Coca Cola (bebidas)

### Endpoints de Testing
```bash
# Crear productos de prueba
npm run seed:products

# Ver menú público
curl http://localhost:3000/api/products/menu/{companyId}

# Listar productos (requiere token)
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/products
```

## 🚀 Próximas Funcionalidades

### En Desarrollo
- [ ] **Integración con Cloudinary** para imágenes
- [ ] **Variantes de productos** (tamaños, extras)
- [ ] **Control de inventario** básico
- [ ] **Productos combinados** (menús)

### Futuro
- [ ] **Analytics avanzados** de popularidad
- [ ] **Recomendaciones** automáticas
- [ ] **Gestión de promociones**
- [ ] **API para aplicación móvil**

## 📚 Documentación API

La documentación completa está disponible en:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **JSON Spec**: `http://localhost:3000/api/swagger.json`

---

**Desarrollado con ❤️ para optimizar la gestión de menús de restaurantes**