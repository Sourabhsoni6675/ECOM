const swaggerAutogen = require('swagger-autogen')();

const isProd = process.env.NODE_ENV === 'production';

const doc = {
  swagger: "2.0",
  info: {
    title: 'ECOM Auth API',
    description: 'Authentication API Documentation',
    version: '1.0.0'
  },

  host: isProd
    ? 'ecom-he6e.onrender.com'
    : `localhost:${process.env.PORT || 3001}`,

  schemes: isProd
    ? ['https']
    : ['http'],

  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Enter JWT token like: Bearer {token}"
    }
  }
};

const outputFile = './src/utils/swagger-output.json';
const routes = ['./src/app.js'];

swaggerAutogen(outputFile, routes, doc);