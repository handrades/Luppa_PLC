import type { EntityManager, QueryRunner } from 'typeorm';
import type { JwtPayload } from '../src/config/jwt';

declare global {
  namespace Express {
    interface Request {
      id: string;
      rawBody?: Buffer;
      auditEntityManager?: EntityManager;
      auditQueryRunner?: QueryRunner;
      user?: JwtPayload;
    }
  }
}

export {};
