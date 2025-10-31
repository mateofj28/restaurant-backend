# Ejemplo de Integración - Edición de Órdenes

## Frontend Integration Example

### 1. Componente de Edición de Orden

```javascript
// EditOrderModal.jsx
import React, { useState, useEffect } from 'react';

const EditOrderModal = ({ orderId, isOpen, onClose, onSuccess }) => {
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder();
    }
  }, [isOpen, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
        setProducts(orderData.requestedProducts.map(p => ({
          ...p,
          originalQuantity: p.requestedQuantity
        })));
      }
    } catch (err) {
      setError('Error al cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId, newQuantity) => {
    setProducts(prev => prev.map(p => 
      p.productId === productId 
        ? { ...p, requestedQuantity: Math.max(0, newQuantity) }
        : p
    ));
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestedProducts = products
        .filter(p => p.requestedQuantity > 0)
        .map(p => ({
          productId: p.productId,
          requestedQuantity: p.requestedQuantity,
          message: p.message || ''
        }));

      const response = await fetch(`/api/orders/${orderId}/edit-products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          requestedProducts,
          editedBy: getCurrentUserId()
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setError(result.error);
        // Mostrar detalles específicos de los errores
        if (result.details) {
          setError(result.details.join('\n'));
        }
      }
    } catch (err) {
      setError('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const getQuantityValidation = (product) => {
    const pendingUnits = product.statusByQuantity.filter(u => u.status === 'pendiente').length;
    const nonPendingUnits = product.statusByQuantity.length - pendingUnits;
    
    return {
      canIncrease: true, // Siempre se puede aumentar
      canDecrease: product.requestedQuantity > nonPendingUnits,
      canDelete: nonPendingUnits === 0,
      minQuantity: nonPendingUnits,
      pendingUnits,
      nonPendingUnits
    };
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Editar Orden #{orderId}</h2>
        
        {loading && <div>Cargando...</div>}
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong>
            <pre>{error}</pre>
          </div>
        )}

        {order && (
          <div className="order-edit-form">
            <div className="products-list">
              {products.map(product => {
                const validation = getQuantityValidation(product);
                
                return (
                  <div key={product.productId} className="product-item">
                    <div className="product-info">
                      <h4>{product.productSnapshot.name}</h4>
                      <p>${product.productSnapshot.price}</p>
                    </div>
                    
                    <div className="quantity-controls">
                      <button 
                        onClick={() => handleQuantityChange(product.productId, product.requestedQuantity - 1)}
                        disabled={!validation.canDecrease || product.requestedQuantity <= validation.minQuantity}
                        title={!validation.canDecrease ? 
                          `No se puede reducir: ${validation.nonPendingUnits} unidades no están pendientes` : 
                          ''
                        }
                      >
                        -
                      </button>
                      
                      <input 
                        type="number" 
                        value={product.requestedQuantity}
                        min={validation.minQuantity}
                        onChange={(e) => handleQuantityChange(product.productId, parseInt(e.target.value) || 0)}
                      />
                      
                      <button 
                        onClick={() => handleQuantityChange(product.productId, product.requestedQuantity + 1)}
                      >
                        +
                      </button>
                      
                      <button 
                        onClick={() => handleQuantityChange(product.productId, 0)}
                        disabled={!validation.canDelete}
                        className="delete-btn"
                        title={!validation.canDelete ? 
                          `No se puede eliminar: ${validation.nonPendingUnits} unidades no están pendientes` : 
                          'Eliminar producto'
                        }
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="status-info">
                      <small>
                        Pendientes: {validation.pendingUnits} | 
                        En proceso: {validation.nonPendingUnits}
                      </small>
                    </div>
                    
                    {product.requestedQuantity !== product.originalQuantity && (
                      <div className="change-indicator">
                        {product.requestedQuantity > product.originalQuantity ? 
                          `+${product.requestedQuantity - product.originalQuantity}` :
                          `${product.requestedQuantity - product.originalQuantity}`
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="modal-actions">
              <button onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button onClick={handleSaveChanges} disabled={loading}>
                Guardar Cambios
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditOrderModal;
```

### 2. Hook para Gestión de Estado

```javascript
// useOrderEditing.js
import { useState, useCallback } from 'react';

export const useOrderEditing = () => {
  const [editingOrder, setEditingOrder] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);

  const editOrder = useCallback(async (orderId, requestedProducts) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/edit-products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          requestedProducts,
          editedBy: getCurrentUserId()
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión'
      };
    }
  }, []);

  const fetchAuditHistory = useCallback(async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/audit-history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuditHistory(data.auditHistory);
        return data;
      }
    } catch (error) {
      console.error('Error fetching audit history:', error);
    }
  }, []);

  return {
    editingOrder,
    setEditingOrder,
    auditHistory,
    editOrder,
    fetchAuditHistory
  };
};
```

### 3. Componente de Historial de Auditoría

```javascript
// AuditHistoryModal.jsx
import React, { useEffect, useState } from 'react';

const AuditHistoryModal = ({ orderId, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchHistory();
    }
  }, [isOpen, orderId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}/audit-history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.auditHistory);
      }
    } catch (err) {
      console.error('Error fetching audit history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeIcon = (type) => {
    const icons = {
      'ORDEN_CREADA': '🆕',
      'PRODUCTO_AGREGADO': '➕',
      'PRODUCTO_ELIMINADO': '🗑️',
      'CANTIDAD_AUMENTADA': '📈',
      'CANTIDAD_REDUCIDA': '📉'
    };
    return icons[type] || '📝';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content audit-modal">
        <h2>Historial de Auditoría - Orden #{orderId}</h2>
        
        {loading && <div>Cargando historial...</div>}
        
        <div className="audit-timeline">
          {history.map((entry, index) => (
            <div key={index} className="audit-entry">
              <div className="audit-header">
                <span className="audit-date">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span className="audit-user">
                  {entry.userName} ({entry.userRole})
                </span>
              </div>
              
              <div className="audit-changes">
                {entry.changes.map((change, changeIndex) => (
                  <div key={changeIndex} className="audit-change">
                    <span className="change-icon">
                      {getChangeTypeIcon(change.type)}
                    </span>
                    <span className="change-details">
                      {change.details}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default AuditHistoryModal;
```

### 4. CSS Styles

```css
/* EditOrder.css */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
}

.product-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  position: relative;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quantity-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.quantity-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity-controls input {
  width: 60px;
  text-align: center;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.delete-btn {
  background: #ff4444 !important;
  color: white;
}

.change-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #007bff;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.error-message {
  background: #ffe6e6;
  border: 1px solid #ff4444;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.error-message pre {
  white-space: pre-wrap;
  margin: 0.5rem 0 0 0;
  font-family: inherit;
}

.status-info {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.audit-timeline {
  max-height: 400px;
  overflow-y: auto;
}

.audit-entry {
  border-left: 3px solid #007bff;
  padding-left: 1rem;
  margin-bottom: 1.5rem;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.audit-changes {
  margin-left: 1rem;
}

.audit-change {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.change-icon {
  font-size: 1.2rem;
}
```

## Uso en el Componente Principal

```javascript
// OrdersPage.jsx
import React, { useState } from 'react';
import EditOrderModal from './EditOrderModal';
import AuditHistoryModal from './AuditHistoryModal';

const OrdersPage = () => {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const handleEditOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setShowEditModal(true);
  };

  const handleViewAudit = (orderId) => {
    setSelectedOrderId(orderId);
    setShowAuditModal(true);
  };

  const handleEditSuccess = (result) => {
    // Actualizar la lista de órdenes
    console.log('Orden editada:', result);
    // Refrescar datos...
  };

  return (
    <div>
      {/* Lista de órdenes */}
      <div className="orders-list">
        {orders.map(order => (
          <div key={order._id} className="order-card">
            {/* Contenido de la orden */}
            <div className="order-actions">
              <button onClick={() => handleEditOrder(order._id)}>
                Editar Productos
              </button>
              <button onClick={() => handleViewAudit(order._id)}>
                Ver Historial
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modales */}
      <EditOrderModal
        orderId={selectedOrderId}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
      />

      <AuditHistoryModal
        orderId={selectedOrderId}
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
};

export default OrdersPage;
```

Este ejemplo muestra una integración completa que:

1. **Valida en tiempo real** qué cambios son posibles
2. **Muestra feedback visual** sobre las restricciones
3. **Maneja errores** de forma clara y específica
4. **Proporciona auditoría** completa de cambios
5. **Mantiene UX fluida** con indicadores de carga y estado