import { EntityManager } from 'typeorm';

declare global {
  namespace Express {
    interface Request {
      id: string;
      rawBody?: Buffer;
      auditEntityManager?: EntityManager;
    }
  }
}

export {};
