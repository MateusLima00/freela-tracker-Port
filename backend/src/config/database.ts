import { PrismaClient } from '@prisma/client';

const isDev = process.env.NODE_ENV === 'development';

const prisma = new PrismaClient({
  log: isDev ? ['error'] : ['error'],
  errorFormat: isDev ? 'pretty' : 'minimal',
});

export default prisma;
