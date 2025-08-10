import type { EntityManager, QueryRunner } from 'typeorm';

declare global {
  namespace Express {
    interface Request {
      id: string;
      rawBody?: Buffer;
      auditEntityManager?: EntityManager;
      auditQueryRunner?: QueryRunner;
    }
  }
}

export {};
