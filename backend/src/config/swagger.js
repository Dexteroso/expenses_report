const swaggerJSDoc = require('swagger-jsdoc');

const serverUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expenses Report API',
      version: '1.0.0',
      description: 'API documentation for Expenses Report app'
    },
    tags: [
      { name: 'Auth', description: 'Registration, login, and password recovery' },
      { name: 'Users', description: 'Admin-only user management' },
      { name: 'Expenses', description: 'Movement creation, updates, filters, and deletion' },
      { name: 'Accounts', description: 'User account management' },
      { name: 'Budgets', description: 'Monthly budget planning' },
      { name: 'Reports', description: 'Financial reports and variance analysis' },
      { name: 'Activity', description: 'MongoDB-backed audit/activity logs' },
      { name: 'Favorite Movements', description: 'Reusable movement presets' },
      { name: 'Categories', description: 'Category catalog' },
      { name: 'Concepts', description: 'Concept catalog' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    servers: [
      {
        url: serverUrl
      }
    ]
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
