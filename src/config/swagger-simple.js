// src/config/swagger-simple.js - Swagger básico sin dependencias externas

export function createSwaggerHTML() {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restaurant API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
        .swagger-ui .topbar { display: none; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`;
}

export const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "Restaurant API",
        version: "1.0.0",
        description: "API para sistema de restaurante con autenticación y gestión de órdenes"
    },
    servers: [
        {
            url: "http://localhost:3000",
            description: "Servidor de desarrollo"
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        },
        schemas: {
            Company: {
                type: "object",
                properties: {
                    _id: {
                        type: "string",
                        description: "ID único de la empresa"
                    },
                    name: {
                        type: "string",
                        description: "Nombre de la empresa",
                        example: "Restaurante El Buen Sabor"
                    },
                    businessType: {
                        type: "string",
                        enum: ["restaurant", "cafe", "bakery", "food_truck", "bar", "pizzeria"],
                        description: "Tipo de negocio"
                    },
                    description: {
                        type: "string",
                        description: "Descripción del negocio"
                    },
                    logo: {
                        type: "string",
                        description: "URL del logo"
                    },
                    website: {
                        type: "string",
                        description: "Sitio web"
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "Email principal"
                    },
                    phone: {
                        type: "string",
                        description: "Teléfono principal"
                    },
                    address: {
                        type: "object",
                        properties: {
                            street: { type: "string", description: "Dirección" },
                            city: { type: "string", description: "Ciudad" },
                            country: { type: "string", description: "País" },
                            postalCode: { type: "string", description: "Código postal" }
                        }
                    },
                    timezone: {
                        type: "string",
                        description: "Zona horaria",
                        example: "America/Bogota"
                    },
                    currency: {
                        type: "string",
                        description: "Moneda",
                        example: "COP"
                    },
                    language: {
                        type: "string",
                        description: "Idioma por defecto",
                        example: "es"
                    },
                    operatingHours: {
                        type: "object",
                        description: "Horarios de operación",
                        properties: {
                            monday: {
                                type: "object",
                                properties: {
                                    open: { type: "string", example: "08:00" },
                                    close: { type: "string", example: "22:00" },
                                    isOpen: { type: "boolean", example: true }
                                }
                            },
                            tuesday: {
                                type: "object",
                                properties: {
                                    open: { type: "string" },
                                    close: { type: "string" },
                                    isOpen: { type: "boolean" }
                                }
                            }
                        }
                    },
                    settings: {
                        type: "object",
                        properties: {
                            allowedOrderTypes: {
                                type: "array",
                                items: { type: "string" },
                                description: "Tipos de orden permitidos"
                            },
                            maxTablesCount: {
                                type: "integer",
                                description: "Número máximo de mesas"
                            },
                            enableDelivery: {
                                type: "boolean",
                                description: "Habilitar delivery"
                            },
                            enablePickup: {
                                type: "boolean",
                                description: "Habilitar pickup"
                            },
                            taxRate: {
                                type: "number",
                                description: "Tasa de impuesto",
                                example: 0.19
                            },
                            serviceCharge: {
                                type: "number",
                                description: "Cargo por servicio",
                                example: 0.10
                            }
                        }
                    },
                    subscription: {
                        type: "object",
                        properties: {
                            plan: {
                                type: "string",
                                enum: ["basic", "premium", "enterprise"],
                                description: "Plan de suscripción"
                            },
                            startDate: {
                                type: "string",
                                format: "date-time",
                                description: "Fecha de inicio"
                            },
                            endDate: {
                                type: "string",
                                format: "date-time",
                                description: "Fecha de fin"
                            },
                            isActive: {
                                type: "boolean",
                                description: "Suscripción activa"
                            }
                        }
                    },
                    features: {
                        type: "object",
                        properties: {
                            multiLocation: { type: "boolean", description: "Múltiples ubicaciones" },
                            inventory: { type: "boolean", description: "Gestión de inventario" },
                            analytics: { type: "boolean", description: "Análisis avanzados" },
                            integrations: { type: "boolean", description: "Integraciones" }
                        }
                    },
                    isActive: {
                        type: "boolean",
                        description: "Estado de la empresa"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Fecha de creación"
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Fecha de última actualización"
                    }
                }
            },
            User: {
                type: "object",
                properties: {
                    _id: { type: "string", description: "ID único del usuario" },
                    username: { type: "string", description: "Nombre de usuario" },
                    email: { type: "string", format: "email", description: "Email del usuario" },
                    role: {
                        type: "string",
                        enum: ["admin", "cocinero", "mesero"],
                        description: "Rol del usuario"
                    },
                    companyId: { type: "string", description: "ID de la empresa" },
                    isActive: { type: "boolean", description: "Usuario activo" },
                    createdAt: { type: "string", format: "date-time", description: "Fecha de creación" }
                }
            },
            Order: {
                type: "object",
                properties: {
                    _id: { type: "string", description: "ID único de la orden" },
                    orderType: {
                        type: "string",
                        enum: ["table", "delivery", "pickup"],
                        description: "Tipo de orden"
                    },
                    companyId: { type: "string", description: "ID de la empresa" },
                    table: { type: "number", description: "Número de mesa" },
                    peopleCount: { type: "number", description: "Cantidad de personas" },
                    customerId: { type: "string", description: "ID del cliente" },
                    status: {
                        type: "string",
                        enum: ["received", "preparing", "ready", "delivered", "closed"],
                        description: "Estado de la orden"
                    },
                    requestedProducts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                productId: { type: "string" },
                                productName: { type: "string" },
                                price: { type: "number" },
                                requestedQuantity: { type: "number" },
                                message: { type: "string" },
                                statusByQuantity: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            status: {
                                                type: "string",
                                                enum: ["pendiente", "en preparación", "listo para entregar", "entregado"]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    itemCount: { type: "number", description: "Cantidad total de items" },
                    total: { type: "number", description: "Total de la orden" },
                    createdAt: { type: "string", format: "date-time", description: "Fecha de creación" },
                    createdBy: { type: "string", description: "Usuario que creó la orden" }
                }
            },
            Product: {
                type: "object",
                properties: {
                    _id: {
                        type: "string",
                        description: "ID único del producto"
                    },
                    name: {
                        type: "string",
                        description: "Nombre del producto",
                        example: "Pizza Margherita"
                    },
                    price: {
                        type: "number",
                        description: "Precio del producto",
                        example: 15.99
                    },
                    preparationTime: {
                        type: "integer",
                        description: "Tiempo de preparación en minutos",
                        example: 20
                    },
                    image: {
                        type: "object",
                        properties: {
                            url: { type: "string", description: "URL de la imagen" },
                            filename: { type: "string", description: "Nombre del archivo" },
                            publicId: { type: "string", description: "ID público (para servicios como Cloudinary)" }
                        }
                    },
                    imageUrl: {
                        type: "string",
                        description: "URL completa de la imagen (virtual)",
                        example: "http://localhost:3000/uploads/products/product-123456.jpg"
                    },
                    category: {
                        type: "string",
                        enum: ["entradas", "platos", "postres", "bebidas"],
                        description: "Categoría del producto"
                    },
                    description: {
                        type: "string",
                        description: "Descripción del producto",
                        example: "Pizza clásica con tomate, mozzarella y albahaca fresca"
                    },
                    observations: {
                        type: "string",
                        description: "Observaciones adicionales",
                        example: "Disponible en masa fina o gruesa"
                    },
                    companyId: {
                        type: "string",
                        description: "ID de la empresa a la que pertenece"
                    },
                    isActive: {
                        type: "boolean",
                        description: "Si el producto está activo"
                    },
                    isAvailable: {
                        type: "boolean",
                        description: "Si el producto está disponible"
                    },
                    nutritionalInfo: {
                        type: "object",
                        properties: {
                            calories: { type: "number", description: "Calorías" },
                            proteins: { type: "number", description: "Proteínas (g)" },
                            carbs: { type: "number", description: "Carbohidratos (g)" },
                            fats: { type: "number", description: "Grasas (g)" }
                        }
                    },
                    allergens: {
                        type: "array",
                        items: {
                            type: "string",
                            enum: ["gluten", "lactosa", "frutos_secos", "mariscos", "huevos", "soja", "pescado"]
                        },
                        description: "Lista de alérgenos"
                    },
                    tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "Etiquetas del producto"
                    },
                    createdBy: {
                        type: "string",
                        description: "ID del usuario que creó el producto"
                    },
                    updatedBy: {
                        type: "string",
                        description: "ID del usuario que actualizó el producto"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time",
                        description: "Fecha de creación"
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time",
                        description: "Fecha de última actualización"
                    }
                }
            },
            ProductPublic: {
                type: "object",
                description: "Producto para menú público (sin información sensible)",
                properties: {
                    _id: { type: "string" },
                    name: { type: "string", example: "Pizza Margherita" },
                    price: { type: "number", example: 15.99 },
                    preparationTime: { type: "integer", example: 20 },
                    imageUrl: { type: "string", example: "http://localhost:3000/uploads/products/product-123456.jpg" },
                    category: { type: "string", enum: ["entradas", "platos", "postres", "bebidas"] },
                    description: { type: "string", example: "Pizza clásica con tomate, mozzarella y albahaca fresca" },
                    observations: { type: "string", example: "Disponible en masa fina o gruesa" },
                    allergens: {
                        type: "array",
                        items: { type: "string" }
                    },
                    tags: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            },
            ProductUpdate: {
                type: "object",
                description: "Esquema para actualizar producto",
                properties: {
                    name: { type: "string", example: "Pizza Margherita Especial" },
                    price: { type: "number", example: 17.99 },
                    preparationTime: { type: "integer", example: 25 },
                    category: { type: "string", enum: ["entradas", "platos", "postres", "bebidas"] },
                    description: { type: "string" },
                    observations: { type: "string" },
                    image: { type: "string", format: "binary", description: "Nueva imagen (opcional)" },
                    allergens: { type: "array", items: { type: "string" } },
                    nutritionalInfo: {
                        type: "object",
                        properties: {
                            calories: { type: "number" },
                            proteins: { type: "number" },
                            carbs: { type: "number" },
                            fats: { type: "number" }
                        }
                    },
                    tags: { type: "array", items: { type: "string" } }
                }
            },
            Pagination: {
                type: "object",
                properties: {
                    current: { type: "integer", description: "Página actual" },
                    pages: { type: "integer", description: "Total de páginas" },
                    total: { type: "integer", description: "Total de elementos" },
                    limit: { type: "integer", description: "Elementos por página" }
                }
            },
            Error: {
                type: "object",
                properties: {
                    error: { type: "string", description: "Mensaje de error" }
                }
            }
        }
    },
    paths: {
        "/api/auth/register": {
            post: {
                tags: ["Autenticación"],
                summary: "Registrar un nuevo usuario",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["username", "email", "password"],
                                properties: {
                                    username: {
                                        type: "string",
                                        example: "juan_mesero"
                                    },
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "juan@restaurant.com"
                                    },
                                    password: {
                                        type: "string",
                                        example: "password123"
                                    },
                                    role: {
                                        type: "string",
                                        enum: ["admin", "cocinero", "mesero"],
                                        example: "mesero"
                                    },
                                    companyId: {
                                        type: "string",
                                        description: "ID de la empresa a la que pertenece el usuario",
                                        example: "507f1f77bcf86cd799439011"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Usuario registrado exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        user: { type: "object" },
                                        token: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/auth/login": {
            post: {
                tags: ["Autenticación"],
                summary: "Iniciar sesión",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "juan@restaurant.com"
                                    },
                                    password: {
                                        type: "string",
                                        example: "password123"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Login exitoso"
                    }
                }
            }
        },
        "/api/auth/profile": {
            get: {
                tags: ["Autenticación"],
                summary: "Obtener perfil del usuario",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Perfil del usuario"
                    }
                }
            }
        },
        "/api/orders": {
            get: {
                tags: ["Órdenes"],
                summary: "Listar todas las órdenes",
                responses: {
                    "200": {
                        description: "Lista de órdenes"
                    }
                }
            },
            post: {
                tags: ["Órdenes"],
                summary: "Crear una nueva orden",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    orderType: {
                                        type: "string",
                                        enum: ["table", "delivery", "pickup"],
                                        example: "table"
                                    },
                                    table: {
                                        type: "number",
                                        example: 5
                                    },
                                    peopleCount: {
                                        type: "number",
                                        example: 4
                                    },
                                    requestedProducts: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                productId: { type: "string" },
                                                productName: { type: "string" },
                                                price: { type: "number" },
                                                requestedQuantity: { type: "number" },
                                                message: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Orden creada exitosamente"
                    }
                }
            }
        },
        "/api/orders/{id}": {
            get: {
                tags: ["Órdenes"],
                summary: "Obtener orden por ID",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Orden encontrada"
                    }
                }
            },
            put: {
                tags: ["Órdenes"],
                summary: "Actualizar orden",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Orden actualizada"
                    }
                }
            }
        },
        "/api/orders/{id}/close": {
            patch: {
                tags: ["Órdenes"],
                summary: "Cerrar cocina",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Cocina cerrada exitosamente"
                    }
                }
            }
        },
        "/api/companies": {
            get: {
                tags: ["Empresas"],
                summary: "Listar todas las empresas",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        schema: { type: "integer", default: 1 },
                        description: "Número de página"
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 10 },
                        description: "Elementos por página"
                    },
                    {
                        name: "isActive",
                        in: "query",
                        schema: { type: "boolean" },
                        description: "Filtrar por estado activo"
                    }
                ],
                responses: {
                    "200": {
                        description: "Lista de empresas con paginación",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        companies: {
                                            type: "array",
                                            items: { "$ref": "#/components/schemas/Company" }
                                        },
                                        pagination: {
                                            type: "object",
                                            properties: {
                                                page: { type: "integer" },
                                                limit: { type: "integer" },
                                                total: { type: "integer" },
                                                pages: { type: "integer" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ["Empresas"],
                summary: "Crear una nueva empresa",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "email", "businessType"],
                                properties: {
                                    name: {
                                        type: "string",
                                        example: "Restaurante El Buen Sabor"
                                    },
                                    businessType: {
                                        type: "string",
                                        enum: ["restaurant", "cafe", "bakery", "food_truck", "bar", "pizzeria"],
                                        example: "restaurant"
                                    },
                                    description: {
                                        type: "string",
                                        example: "Restaurante especializado en comida tradicional"
                                    },
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "contacto@elbuensabor.com"
                                    },
                                    phone: {
                                        type: "string",
                                        example: "+57 300 123 4567"
                                    },
                                    website: {
                                        type: "string",
                                        example: "https://elbuensabor.com"
                                    },
                                    address: {
                                        type: "object",
                                        properties: {
                                            street: { type: "string", example: "Calle 123 #45-67" },
                                            city: { type: "string", example: "Bogotá" },
                                            country: { type: "string", example: "Colombia" },
                                            postalCode: { type: "string", example: "110111" }
                                        }
                                    },
                                    timezone: {
                                        type: "string",
                                        example: "America/Bogota"
                                    },
                                    currency: {
                                        type: "string",
                                        example: "COP"
                                    },
                                    settings: {
                                        type: "object",
                                        properties: {
                                            allowedOrderTypes: {
                                                type: "array",
                                                items: { type: "string" },
                                                example: ["table", "delivery", "pickup"]
                                            },
                                            maxTablesCount: { type: "integer", example: 30 },
                                            enableDelivery: { type: "boolean", example: true },
                                            taxRate: { type: "number", example: 0.19 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Empresa creada exitosamente"
                    },
                    "400": {
                        description: "Error de validación"
                    }
                }
            }
        },
        "/api/companies/{id}": {
            get: {
                tags: ["Empresas"],
                summary: "Obtener empresa por ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "ID de la empresa"
                    }
                ],
                responses: {
                    "200": {
                        description: "Empresa encontrada",
                        content: {
                            "application/json": {
                                schema: { "$ref": "#/components/schemas/Company" }
                            }
                        }
                    },
                    "404": {
                        description: "Empresa no encontrada"
                    }
                }
            },
            put: {
                tags: ["Empresas"],
                summary: "Actualizar empresa",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    phone: { type: "string" },
                                    website: { type: "string" },
                                    address: {
                                        type: "object",
                                        properties: {
                                            street: { type: "string" },
                                            city: { type: "string" },
                                            country: { type: "string" },
                                            postalCode: { type: "string" }
                                        }
                                    },
                                    operatingHours: {
                                        type: "object",
                                        properties: {
                                            monday: {
                                                type: "object",
                                                properties: {
                                                    open: { type: "string", example: "08:00" },
                                                    close: { type: "string", example: "22:00" },
                                                    isOpen: { type: "boolean", example: true }
                                                }
                                            }
                                        }
                                    },
                                    settings: {
                                        type: "object",
                                        properties: {
                                            allowedOrderTypes: { type: "array", items: { type: "string" } },
                                            maxTablesCount: { type: "integer" },
                                            enableDelivery: { type: "boolean" },
                                            taxRate: { type: "number" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Empresa actualizada exitosamente"
                    }
                }
            },
            delete: {
                tags: ["Empresas"],
                summary: "Desactivar empresa (soft delete)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Empresa desactivada exitosamente"
                    }
                }
            }
        },
        "/api/companies/{id}/toggle-status": {
            patch: {
                tags: ["Empresas"],
                summary: "Activar/Desactivar empresa",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Estado de empresa cambiado exitosamente"
                    }
                }
            }
        },
        "/api/tables": {
            get: {
                tags: ["Mesas"],
                summary: "Listar todas las mesas de la empresa",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "status",
                        in: "query",
                        schema: { 
                            type: "string",
                            enum: ["available", "occupied", "reserved", "cleaning", "out_of_service"]
                        },
                        description: "Filtrar por estado de mesa"
                    },
                    {
                        name: "isActive",
                        in: "query",
                        schema: { type: "boolean", default: true },
                        description: "Filtrar por mesas activas"
                    }
                ],
                responses: {
                    "200": {
                        description: "Lista de mesas con estadísticas",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        tables: {
                                            type: "array",
                                            items: { "$ref": "#/components/schemas/Table" }
                                        },
                                        stats: {
                                            type: "object",
                                            properties: {
                                                total: { type: "integer" },
                                                available: { type: "integer" },
                                                occupied: { type: "integer" },
                                                reserved: { type: "integer" },
                                                cleaning: { type: "integer" },
                                                outOfService: { type: "integer" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ["Mesas"],
                summary: "Crear una nueva mesa",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["number", "capacity"],
                                properties: {
                                    number: {
                                        type: "integer",
                                        description: "Número de la mesa",
                                        example: 5
                                    },
                                    capacity: {
                                        type: "integer",
                                        description: "Capacidad de personas",
                                        example: 4
                                    },
                                    location: {
                                        type: "string",
                                        description: "Ubicación de la mesa",
                                        example: "Terraza"
                                    },
                                    description: {
                                        type: "string",
                                        description: "Descripción adicional",
                                        example: "Mesa junto a la ventana"
                                    },
                                    status: {
                                        type: "string",
                                        enum: ["available", "occupied", "reserved", "cleaning", "out_of_service"],
                                        default: "available",
                                        example: "available"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Mesa creada exitosamente"
                    },
                    "400": {
                        description: "Error de validación o mesa duplicada"
                    }
                }
            }
        },
        "/api/tables/{id}": {
            get: {
                tags: ["Mesas"],
                summary: "Obtener mesa por ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Mesa encontrada con detalles de orden actual si está ocupada",
                        content: {
                            "application/json": {
                                schema: { "$ref": "#/components/schemas/Table" }
                            }
                        }
                    },
                    "404": {
                        description: "Mesa no encontrada"
                    }
                }
            },
            put: {
                tags: ["Mesas"],
                summary: "Actualizar mesa",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    number: { type: "integer" },
                                    capacity: { type: "integer" },
                                    location: { type: "string" },
                                    description: { type: "string" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Mesa actualizada exitosamente"
                    }
                }
            },
            delete: {
                tags: ["Mesas"],
                summary: "Desactivar mesa (soft delete)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Mesa desactivada exitosamente"
                    },
                    "400": {
                        description: "No se puede eliminar mesa ocupada"
                    }
                }
            }
        },
        "/api/tables/{id}/status": {
            patch: {
                tags: ["Mesas"],
                summary: "Cambiar estado de mesa",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: {
                                        type: "string",
                                        enum: ["available", "occupied", "reserved", "cleaning", "out_of_service"],
                                        description: "Nuevo estado de la mesa"
                                    },
                                    orderId: {
                                        type: "string",
                                        description: "ID de la orden (requerido para status 'occupied')"
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Estado de mesa cambiado exitosamente"
                    }
                }
            }
        },
        "/api/tables/check-availability/{number}": {
            get: {
                tags: ["Mesas"],
                summary: "Verificar disponibilidad de mesa",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "number",
                        in: "path",
                        required: true,
                        schema: { type: "integer" },
                        description: "Número de la mesa"
                    },
                    {
                        name: "peopleCount",
                        in: "query",
                        schema: { type: "integer" },
                        description: "Cantidad de personas para verificar capacidad"
                    }
                ],
                responses: {
                    "200": {
                        description: "Información de disponibilidad",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        available: {
                                            type: "boolean",
                                            description: "Si la mesa está disponible"
                                        },
                                        table: {
                                            type: "object",
                                            properties: {
                                                number: { type: "integer" },
                                                capacity: { type: "integer" },
                                                status: { type: "string" },
                                                location: { type: "string" }
                                            }
                                        },
                                        reasons: {
                                            type: "object",
                                            properties: {
                                                notAvailable: { type: "string" },
                                                insufficientCapacity: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Mesa no encontrada"
                    }
                }
            }
        },

        "/api/orders/complete": {
            post: {
                tags: ["Órdenes"],
                summary: "Completar múltiples órdenes",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["orderIds"],
                                properties: {
                                    orderIds: {
                                        type: "array",
                                        items: { type: "string" },
                                        example: ["order1", "order2"]
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Órdenes completadas exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        completedOrders: { type: "array", items: { "$ref": "#/components/schemas/Order" } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/orders/stats": {
            get: {
                tags: ["Órdenes"],
                summary: "Obtener estadísticas de órdenes",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "query",
                        name: "startDate",
                        schema: { type: "string", format: "date" },
                        description: "Fecha de inicio"
                    },
                    {
                        in: "query",
                        name: "endDate",
                        schema: { type: "string", format: "date" },
                        description: "Fecha de fin"
                    }
                ],
                responses: {
                    "200": {
                        description: "Estadísticas obtenidas exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        totalOrders: { type: "integer" },
                                        completedOrders: { type: "integer" },
                                        pendingOrders: { type: "integer" },
                                        totalRevenue: { type: "number" },
                                        averageOrderValue: { type: "number" },
                                        ordersByStatus: { type: "object" },
                                        ordersByTable: { type: "object" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/tables/stats": {
            get: {
                tags: ["Mesas"],
                summary: "Obtener estadísticas de mesas",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Estadísticas de mesas obtenidas exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        totalTables: { type: "integer" },
                                        availableTables: { type: "integer" },
                                        occupiedTables: { type: "integer" },
                                        reservedTables: { type: "integer" },
                                        outOfServiceTables: { type: "integer" },
                                        occupancyRate: { type: "number" },
                                        averageOccupancyTime: { type: "number" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/companies/stats": {
            get: {
                tags: ["Empresas"],
                summary: "Obtener estadísticas generales de empresas",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Estadísticas generales obtenidas exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        totalCompanies: { type: "integer" },
                                        activeCompanies: { type: "integer" },
                                        companiesByPlan: { type: "object" },
                                        totalUsers: { type: "integer" },
                                        totalTables: { type: "integer" },
                                        totalProducts: { type: "integer" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/products": {
            get: {
                tags: ["Products"],
                summary: "Obtener todos los productos con filtros",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "query",
                        name: "category",
                        schema: {
                            type: "string",
                            enum: ["entradas", "platos", "postres", "bebidas"]
                        },
                        description: "Filtrar por categoría"
                    },
                    {
                        in: "query",
                        name: "isActive",
                        schema: {
                            type: "string",
                            enum: ["true", "false", "all"],
                            default: "true"
                        },
                        description: "Filtrar por estado activo"
                    },
                    {
                        in: "query",
                        name: "isAvailable",
                        schema: {
                            type: "string",
                            enum: ["true", "false", "all"],
                            default: "true"
                        },
                        description: "Filtrar por disponibilidad"
                    },
                    {
                        in: "query",
                        name: "search",
                        schema: { type: "string" },
                        description: "Buscar en nombre y descripción"
                    },
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", default: 1 },
                        description: "Número de página"
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", default: 20 },
                        description: "Elementos por página"
                    },
                    {
                        in: "query",
                        name: "sortBy",
                        schema: { type: "string", default: "name" },
                        description: "Campo para ordenar"
                    },
                    {
                        in: "query",
                        name: "sortOrder",
                        schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
                        description: "Orden de clasificación"
                    }
                ],
                responses: {
                    "200": {
                        description: "Lista de productos obtenida exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        products: {
                                            type: "array",
                                            items: { "$ref": "#/components/schemas/Product" }
                                        },
                                        pagination: { "$ref": "#/components/schemas/Pagination" },
                                        stats: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    _id: { type: "string", description: "Categoría" },
                                                    count: { type: "integer", description: "Total de productos" },
                                                    available: { type: "integer", description: "Productos disponibles" },
                                                    avgPrice: { type: "number", description: "Precio promedio" },
                                                    avgPrepTime: { type: "number", description: "Tiempo promedio de preparación" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ["Products"],
                summary: "Crear nuevo producto",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["name", "price", "preparationTime", "category", "description"],
                                properties: {
                                    name: { type: "string", example: "Pizza Margherita" },
                                    price: { type: "number", example: 15.99 },
                                    preparationTime: { type: "integer", example: 20 },
                                    category: {
                                        type: "string",
                                        enum: ["entradas", "platos", "postres", "bebidas"],
                                        example: "platos"
                                    },
                                    description: {
                                        type: "string",
                                        example: "Pizza clásica con tomate, mozzarella y albahaca fresca"
                                    },
                                    observations: {
                                        type: "string",
                                        example: "Disponible en masa fina o gruesa"
                                    },
                                    image: {
                                        type: "string",
                                        format: "binary",
                                        description: "Imagen del producto (max 5MB)"
                                    },
                                    allergens: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                            enum: ["gluten", "lactosa", "frutos_secos", "mariscos", "huevos", "soja", "pescado"]
                                        }
                                    },
                                    nutritionalInfo: {
                                        type: "object",
                                        properties: {
                                            calories: { type: "number" },
                                            proteins: { type: "number" },
                                            carbs: { type: "number" },
                                            fats: { type: "number" }
                                        }
                                    },
                                    tags: {
                                        type: "array",
                                        items: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Producto creado exitosamente",
                        content: {
                            "application/json": {
                                schema: { "$ref": "#/components/schemas/Product" }
                            }
                        }
                    },
                    "400": { description: "Datos inválidos" }
                }
            }
        },
        "/api/products/{id}": {
            get: {
                tags: ["Products"],
                summary: "Obtener producto por ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                        description: "ID del producto"
                    }
                ],
                responses: {
                    "200": {
                        description: "Producto obtenido exitosamente",
                        content: {
                            "application/json": {
                                schema: { "$ref": "#/components/schemas/Product" }
                            }
                        }
                    },
                    "404": { description: "Producto no encontrado" }
                }
            },
            put: {
                tags: ["Products"],
                summary: "Actualizar producto",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                        description: "ID del producto"
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: { "$ref": "#/components/schemas/ProductUpdate" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Producto actualizado exitosamente",
                        content: {
                            "application/json": {
                                schema: { "$ref": "#/components/schemas/Product" }
                            }
                        }
                    },
                    "404": { description: "Producto no encontrado" }
                }
            },
            delete: {
                tags: ["Products"],
                summary: "Desactivar producto (soft delete)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                        description: "ID del producto"
                    }
                ],
                responses: {
                    "200": {
                        description: "Producto desactivado exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string", example: "Producto desactivado correctamente" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/products/{id}/availability": {
            patch: {
                tags: ["Products"],
                summary: "Cambiar disponibilidad del producto",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                        description: "ID del producto"
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["isAvailable"],
                                properties: {
                                    isAvailable: { type: "boolean", example: false }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Disponibilidad actualizada exitosamente",
                        content: {
                            "application/json": {
                                schema: { "$ref": "#/components/schemas/Product" }
                            }
                        }
                    }
                }
            }
        },
        "/api/products/menu/{companyId}": {
            get: {
                tags: ["Products - Public"],
                summary: "Obtener menú público de productos por empresa",
                parameters: [
                    {
                        in: "path",
                        name: "companyId",
                        required: true,
                        schema: { type: "string" },
                        description: "ID de la empresa"
                    }
                ],
                responses: {
                    "200": {
                        description: "Menú obtenido exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        entradas: {
                                            type: "array",
                                            items: { "$ref": "#/components/schemas/ProductPublic" }
                                        },
                                        platos: {
                                            type: "array",
                                            items: { "$ref": "#/components/schemas/ProductPublic" }
                                        },
                                        postres: {
                                            type: "array",
                                            items: { "$ref": "#/components/schemas/ProductPublic" }
                                        },
                                        bebidas: {
                                            type: "array",
                                            items: { "$ref": "#/components/schemas/ProductPublic" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/products/stats": {
            get: {
                tags: ["Products"],
                summary: "Obtener estadísticas de productos",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Estadísticas de productos obtenidas exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        totalProducts: { type: "integer" },
                                        availableProducts: { type: "integer" },
                                        productsByCategory: { type: "object" },
                                        averagePrice: { type: "number" },
                                        averagePreparationTime: { type: "number" },
                                        mostPopularProducts: { type: "array", items: { "$ref": "#/components/schemas/Product" } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/dashboard": {
            get: {
                tags: ["Dashboard"],
                summary: "Obtener datos del dashboard principal",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Datos del dashboard obtenidos exitosamente",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        todayOrders: { type: "integer" },
                                        todayRevenue: { type: "number" },
                                        activeTables: { type: "integer" },
                                        availableProducts: { type: "integer" },
                                        recentOrders: { type: "array", items: { "$ref": "#/components/schemas/Order" } },
                                        tableStatus: { type: "object" },
                                        popularProducts: { type: "array", items: { "$ref": "#/components/schemas/Product" } },
                                        hourlyStats: { type: "array", items: { type: "object" } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};