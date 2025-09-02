const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'IncomeExpense API', version: '1.0.0' },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // JSDoc annotations are scanned from these files
  apis: ['src/routes/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
const swaggerUiMiddleware = swaggerUi.serve;
const swaggerUiHandler = swaggerUi.setup(swaggerSpec, { explorer: true });

module.exports = { swaggerSpec, swaggerUiMiddleware, swaggerUiHandler };


