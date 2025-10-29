// src/config/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant API',
      version: '1.0.0',
      description: 'API para sistema de restaurante con autenticación y gestión de órdenes',
      contact: {
        name: 'Restaurant API Support',
        email: 'support@restaurant.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa tu token JWT en el formato: Bearer {token}'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único del usuario'
            },
            username: {
              type: 'string',
              description: 'Nombre de usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario'
            },
            role: {
              type: 'string',
              enum: ['admin', 'cocinero', 'mesero'],
              description: 'Rol del usuario'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único de la orden'
            },
            orderType: {
              type: 'string',
              enum: ['table', 'delivery', 'pickup'],
              description: 'Tipo de orden'
            },
            table: {
              type: 'number',
              description: 'Número de mesa (solo para orderType: table)'
            },
            peopleCount: {
              type: 'number',
              description: 'Cantidad de personas'
            },
            customerId: {
              type: 'string',
              description: 'ID del cliente (requerido para delivery)'
            },
            status: {
              type: 'string',
              enum: ['received', 'preparing', 'ready', 'delivered', 'closed'],
              description: 'Estado de la orden'
            },
            requestedProducts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'string',
                    description: 'ID del producto'
                  },
                  productName: {
                    type: 'string',
                    description: 'Nombre del producto'
                  },
                  price: {
                    type: 'number',
                    description: 'Precio del producto'
                  },
                  requestedQuantity: {
                    type: 'number',
                    description: 'Cantidad solicitada'
                  },
                  message: {
                    type: 'string',
                    description: 'Mensaje especial para el producto'
                  },
                  statusByQuantity: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        status: {
                          type: 'string',
                          enum: ['pendiente', 'en preparación', 'listo para entregar', 'entregado'],
                          description: 'Estado individual del producto'
                        }
                      }
                    }
                  }
                }
              }
            },
            itemCount: {
              type: 'number',
              description: 'Cantidad total de items'
            },
            total: {
              type: 'number',
              description: 'Total de la orden'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            closedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de cierre (opcional)'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js'], // Rutas donde están las anotaciones de Swagger
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };