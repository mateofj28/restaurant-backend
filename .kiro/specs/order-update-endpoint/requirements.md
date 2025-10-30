# Requirements Document - Endpoint PUT /orders/:id Completo

## Introduction

El endpoint PUT /orders/:id debe ser capaz de manejar CUALQUIER modificación de una orden existente, manteniendo la consistencia de datos, preservando estados de cocina cuando sea apropiado, y devolviendo siempre una estructura enriquecida completa.

## Glossary

- **Order**: Entidad que representa un pedido en el sistema
- **ProductSnapshot**: Datos históricos del producto al momento de la orden
- **StatusByQuantity**: Estados individuales por cada unidad de producto
- **EnrichedOrder**: Orden con información completa de referencias (mesa, empresa, usuario)
- **Frontend**: Aplicación cliente que consume la API
- **Backend**: Servidor que procesa las peticiones

## Requirements

### Requirement 1

**User Story:** Como desarrollador frontend, quiero poder modificar cualquier aspecto de una orden existente, para que los usuarios puedan hacer cambios flexibles a sus pedidos.

#### Acceptance Criteria

1. WHEN el frontend envía una petición PUT con productos modificados, THE Order_System SHALL preservar los estados de cocina existentes cuando la cantidad no cambie
2. WHEN el frontend aumenta la cantidad de un producto existente, THE Order_System SHALL mantener los estados existentes y agregar nuevos estados como 'pendiente'
3. WHEN el frontend disminuye la cantidad de un producto existente, THE Order_System SHALL mantener solo los primeros N estados existentes
4. WHEN el frontend elimina un producto de la lista, THE Order_System SHALL remover completamente ese producto de la orden
5. WHEN el frontend agrega un producto nuevo, THE Order_System SHALL crear el producto con todos los estados como 'pendiente'

### Requirement 2

**User Story:** Como desarrollador frontend, quiero poder cambiar el tipo de orden y mesa, para que los usuarios puedan modificar dónde y cómo reciben su pedido.

#### Acceptance Criteria

1. WHEN el frontend cambia orderType de 'table' a 'delivery', THE Order_System SHALL actualizar el tipo y establecer tableId como null
2. WHEN el frontend cambia orderType de 'delivery' a 'table', THE Order_System SHALL actualizar el tipo y requerir un tableId válido
3. WHEN el frontend cambia tableId en una orden de mesa, THE Order_System SHALL validar que la nueva mesa esté disponible
4. WHEN el frontend cambia peopleCount, THE Order_System SHALL actualizar la cantidad de personas
5. WHERE el orderType es 'table', THE Order_System SHALL incluir tableInfo en la respuesta

### Requirement 3

**User Story:** Como desarrollador frontend, quiero recibir siempre la misma estructura enriquecida, para que mi código sea consistente sin importar qué modificación haga.

#### Acceptance Criteria

1. THE Order_System SHALL devolver siempre la estructura enriquecida con tableInfo, companyInfo y createdByInfo
2. THE Order_System SHALL calcular automáticamente itemCount y total basado en los productos actualizados
3. THE Order_System SHALL preservar todos los campos originales (createdAt, companyId, etc.)
4. THE Order_System SHALL agregar updatedAt con la fecha actual de modificación
5. THE Order_System SHALL mantener la estructura de productSnapshot intacta

### Requirement 4

**User Story:** Como desarrollador frontend, quiero que el sistema maneje automáticamente la decisión entre actualizar o eliminar la orden, para que no tenga que implementar lógica compleja en el cliente.

#### Acceptance Criteria

1. WHEN el frontend envía una lista vacía de productos, THE Order_System SHALL eliminar automáticamente la orden completa
2. WHEN el frontend envía productos válidos, THE Order_System SHALL actualizar la orden normalmente
3. THE Order_System SHALL devolver una respuesta diferenciada indicando si la orden fue actualizada o eliminada
4. IF la orden fue eliminada por falta de productos, THEN THE Order_System SHALL liberar automáticamente la mesa asociada
5. THE Order_System SHALL manejar esta decisión de forma transparente sin requerir endpoints separados

### Requirement 5

**User Story:** Como desarrollador frontend, quiero que el sistema maneje casos especiales automáticamente, para que no tenga que implementar lógica compleja en el cliente.

#### Acceptance Criteria

1. WHEN se actualiza una orden de mesa, THE Order_System SHALL manejar automáticamente la ocupación/liberación de mesas
2. THE Order_System SHALL validar que todos los productId enviados existan y pertenezcan a la empresa
3. THE Order_System SHALL recalcular el total basado en los productSnapshot.price actuales
4. THE Order_System SHALL mantener la integridad referencial con mesas, productos y empresa
5. THE Order_System SHALL devolver respuestas consistentes tanto para actualizaciones como eliminaciones

### Requirement 6

**User Story:** Como desarrollador frontend, quiero poder enviar la estructura completa deseada, para que el backend sea inteligente en procesar solo lo que cambió.

#### Acceptance Criteria

1. THE Order_System SHALL aceptar la estructura completa de la orden como entrada
2. THE Order_System SHALL comparar inteligentemente con la orden existente para preservar estados
3. THE Order_System SHALL manejar modificaciones de observaciones (message) en productos
4. THE Order_System SHALL procesar cambios múltiples en una sola operación atómica
5. THE Order_System SHALL devolver error 404 si la orden no existe

### Requirement 7

**User Story:** Como sistema, quiero mantener la consistencia de datos, para que nunca se corrompan las órdenes ni se pierda información crítica.

#### Acceptance Criteria

1. THE Order_System SHALL ejecutar todas las modificaciones en una transacción atómica
2. THE Order_System SHALL validar la estructura de entrada antes de procesar
3. THE Order_System SHALL preservar campos críticos como _id, createdAt, companyId
4. THE Order_System SHALL mantener la consistencia entre itemCount, total y requestedProducts
5. IF ocurre un error durante la actualización, THEN THE Order_System SHALL revertir todos los cambios

### Requirement 8

**User Story:** Como desarrollador frontend, quiero recibir respuestas claras sobre qué acción tomó el backend, para poder actualizar mi interfaz correctamente.

#### Acceptance Criteria

1. WHEN la orden es actualizada, THE Order_System SHALL devolver la orden enriquecida con status 200
2. WHEN la orden es eliminada por falta de productos, THE Order_System SHALL devolver un objeto con flag "deleted: true" y status 200
3. THE Order_System SHALL incluir un mensaje descriptivo explicando la acción tomada
4. THE Order_System SHALL mantener el mismo formato de respuesta para ambos casos
5. THE Order_System SHALL incluir el orderId en ambos tipos de respuesta