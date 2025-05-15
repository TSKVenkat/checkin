import { PrismaClient } from '../generated/prisma';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Check if we're in Edge Runtime
const isEdgeRuntime = 
  typeof process !== 'undefined' &&
  process.env.NEXT_RUNTIME === 'edge';

// Mock PrismaClient for Edge Runtime
class MockPrismaClient {
  constructor() {
    return new Proxy({}, {
      get: () => {
        return () => {
          throw new Error('PrismaClient is not available in Edge Runtime');
        };
      }
    });
  }
}

// Only instantiate PrismaClient if not in edge runtime
const prismaClientSingleton = () => {
  if (isEdgeRuntime) {
    console.warn('Edge Runtime detected, using mocked PrismaClient');
    return new MockPrismaClient() as unknown as PrismaClient;
  }
  
  return new PrismaClient();
};

// Declare a global variable type
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

// Use singleton when not in production
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma; 