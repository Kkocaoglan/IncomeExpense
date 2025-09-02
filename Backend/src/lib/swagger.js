const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const specPath = path.join(__dirname, '..', '..', 'openapi.yaml');
const swaggerSpec = YAML.load(specPath);

const swaggerUiMiddleware = swaggerUi.serve;
const swaggerUiHandler = swaggerUi.setup(swaggerSpec, { explorer: true });

module.exports = { swaggerSpec, swaggerUiMiddleware, swaggerUiHandler };


