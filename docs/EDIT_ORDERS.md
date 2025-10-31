# Edición de Órdenes - Documentación

## Descripción General

La funcionalidad de edición de órdenes permite modificar cantidades y eliminar productos de órdenes existentes, aplicando reglas estrictas de validación basadas en el estado actual de los productos en la base de datos.

## Reglas de Negocio

### 1. Validación contra Estado Actual
- **Siempre** se valida la petición contra el estado actual guardado en la base de datos
- No se confía en el estado enviado desde el frontend

### 2. Reglas de Cantidad

#### Aumentar Cantidad
- ✅ **Siempre permitido**
- Las nuevas unidades se agregan con estado "pendiente"
- No requiere validaciones adicionales

#### Disminuir Cantidad
- ✅ **Permitido solo si** hay suficientes unidades en estado "pendiente" para eliminar
- ❌ **Rechazado si** no hay suficientes unidades "pendiente" disponibles
- **Lógica selectiva**: Elimina específicamente las unidades "pendiente", preservando todas las unidades con otros estados
- **No es LIFO**: No elimina desde el final, sino que busca y elimina solo las unidades "pendiente"

#### Eliminar Producto Completamente
- ✅ **Permitido solo si** todas las unidades del producto están en estado "pendiente"
- ❌ **Rechazado si** alguna unidad tiene estado diferente a "pendiente"

### 3. Respuestas del Sistema
- **Éxito**: Devuelve el estado actualizado de la orden
- **Rechazo**: Devuelve error explicativo con detalles específicos
- **Auditoría**: Registra quién, cuándo y qué cambió para trazabilidad

## Endpoints

### PATCH /api/orders/:id/edit-products

Edita los productos de una orden específica.

#### Request Body
```json
{
  "requestedProducts": [
    {
      "productId": "507f1f77bcf86cd799439012",
      "requestedQuantity": 3,
      "message": "Sin cebolla"
    }
  ],
  "editedBy": "507f1f77bcf86cd799439014"
}
```

#### Response - Éxito (200)
```json
{
  "success": true,
  "message": "Orden editada exitosamente",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "requestedProducts": [...],
    "total": 45000,
    "itemCount": 2,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "audit": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "editedBy": "507f1f77bcf86cd799439014",
    "userName": "Juan Pérez",
    "changes": [
      {
        "type": "CANTIDAD_AUMENTADA",
        "productId": "507f1f77bcf86cd799439012",
        "productName": "Hamburguesa Clásica",
        "previousQuantity": 2,
        "newQuantity": 3,
        "details": "Agregadas 1 unidades (2 → 3)"
      }
    ]
  },
  "summary": {
    "totalChanges": 1,
    "changeTypes": ["CANTIDAD_AUMENTADA"],
    "newTotal": 45000,
    "newItemCount": 2
  }
}
```

#### Response - Error (400)
```json
{
  "success": false,
  "error": "Edición rechazada por las siguientes razones:",
  "details": [
    "No se puede reducir Papas Fritas a 1 unidades: 2 de las unidades a eliminar no están en estado \"pendiente\"",
    "No se puede eliminar Hamburguesa Clásica: tiene 1 unidades que no están en estado \"pendiente\""
  ],
  "currentOrder": {
    "_id": "507f1f77bcf86cd799439011",
    "requestedProducts": [...]
  }
}
```

### GET /api/orders/:id/audit-history

Obtiene el historial completo de auditoría de una orden.

#### Response (200)
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "auditHistory": [
    {
      "timestamp": "2024-01-15T09:00:00.000Z",
      "editedBy": "507f1f77bcf86cd799439014",
      "userName": "Juan Pérez",
      "userEmail": "juan@restaurant.com",
      "userRole": "mesero",
      "changes": [
        {
          "type": "ORDEN_CREADA",
          "details": "Orden creada inicialmente"
        }
      ]
    },
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "editedBy": "507f1f77bcf86cd799439015",
      "userName": "María García",
      "changes": [
        {
          "type": "CANTIDAD_AUMENTADA",
          "productId": "507f1f77bcf86cd799439012",
          "productName": "Hamburguesa Clásica",
          "previousQuantity": 2,
          "newQuantity": 3,
          "details": "Agregadas 1 unidades (2 → 3)"
        }
      ]
    }
  ],
  "totalEdits": 1
}
```

## Tipos de Cambios en Auditoría

| Tipo | Descripción |
|------|-------------|
| `ORDEN_CREADA` | Orden creada inicialmente |
| `PRODUCTO_AGREGADO` | Nuevo producto agregado a la orden |
| `PRODUCTO_ELIMINADO` | Producto eliminado completamente |
| `CANTIDAD_AUMENTADA` | Cantidad de un producto aumentada |
| `CANTIDAD_REDUCIDA` | Cantidad de un producto reducida |

## Estados de Productos

| Estado | Descripción | Editable |
|--------|-------------|----------|
| `pendiente` | Producto solicitado, no iniciado | ✅ Sí |
| `en_preparacion` | Producto en cocina | ❌ No |
| `listo` | Producto terminado, listo para servir | ❌ No |
| `entregado` | Producto entregado al cliente | ❌ No |

## Ejemplos de Uso

### Caso 1: Aumentar Cantidad (Siempre Permitido)
```javascript
// Estado actual: 2 hamburguesas (ambas pendientes)
// Solicitud: 4 hamburguesas
// Resultado: ✅ Éxito - Se agregan 2 hamburguesas más como "pendiente"
```

### Caso 2: Reducir Cantidad (Validación Selectiva)
```javascript
// Estado actual: 5 hamburguesas [entregado, pendiente, en_preparacion, pendiente, pendiente]
// Solicitud: 3 hamburguesas (eliminar 2)
// Análisis: Hay 3 unidades "pendiente", se pueden eliminar 2
// Resultado: ✅ Éxito - Quedan [entregado, pendiente, en_preparacion]

// Estado actual: 3 hamburguesas [entregado, pendiente, en_preparacion]  
// Solicitud: 1 hamburguesa (eliminar 2)
// Análisis: Solo hay 1 unidad "pendiente", pero se necesitan eliminar 2
// Resultado: ❌ Error - No hay suficientes unidades pendientes
```

### Caso 3: Eliminar Producto (Validación Estricta)
```javascript
// Estado actual: 2 bebidas [pendiente, entregado]
// Solicitud: eliminar bebidas (no incluir en requestedProducts)
// Resultado: ❌ Error - La bebida 2 está "entregado"
```

### Caso 4: Edición Mixta Válida
```javascript
// Solicitud:
// - Hamburguesas: 2 → 4 (aumentar)
// - Papas: mantener 3
// - Bebidas: agregar 2 nuevas
// Resultado: ✅ Éxito - Solo aumentos y agregados
```

## Consideraciones Técnicas

### Validación de Seguridad
- Verificación de permisos de usuario (admin, manager, mesero)
- Validación de companyId para aislamiento de datos
- Verificación de ObjectId válidos

### Transaccionalidad
- Las validaciones se realizan antes de cualquier modificación
- Si cualquier validación falla, no se aplica ningún cambio
- Respuesta atómica: todo éxito o todo fallo

### Performance
- Una sola consulta para obtener el estado actual
- Validaciones en memoria antes de escribir a BD
- Actualización atómica con una sola operación de escritura

### Auditoría Completa
- Registro de todos los cambios con timestamp
- Información del usuario que realizó el cambio
- Detalles específicos de cada modificación
- Historial persistente para compliance y debugging