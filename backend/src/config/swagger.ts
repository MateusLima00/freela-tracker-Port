import swaggerJsDoc from 'swagger-jsdoc';
import { env } from './env';

const serverUrl =
  env.NODE_ENV === 'production'
    ? `${process.env.API_URL ?? ''}/api`
    : `http://localhost:${env.PORT}/api`;

const options: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FreelaTracker API',
      version: '1.0.0',
      description: 'API para gerenciamento de projetos freelancer',
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        // Access token de curta duração no header Authorization: Bearer <token>
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsDoc(options);
