// Mock @prisma/client before any imports
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
  AiReviewSeverity: {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
  },
  AiReviewFindingCategory: {
    SECURITY: 'SECURITY',
    BUG: 'BUG',
    ARCHITECTURE: 'ARCHITECTURE',
    VALIDATION: 'VALIDATION',
    PERFORMANCE: 'PERFORMANCE',
    MAINTAINABILITY: 'MAINTAINABILITY',
    TESTING: 'TESTING',
  },
  AiReviewJobStatus: {
    QUEUED: 'QUEUED',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
  },
  AiReviewReviewMode: {
    DIFF_ONLY: 'DIFF_ONLY',
    FULL_FILE: 'FULL_FILE',
  },
  AiReviewProvider: {
    GITLAB: 'GITLAB',
  },
}));

// Mock @prisma/adapter-mariadb
jest.mock('@prisma/adapter-mariadb', () => ({
  PrismaMariaDb: jest.fn(),
}));

// Set a dummy DATABASE_URL for tests
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
