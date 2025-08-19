/**
 * Express Request Type Augmentation
 *
 * Extends the Express Request interface to include custom properties
 * added by authentication middleware and audit context.
 */

import { EntityManager, QueryRunner } from 'typeorm';
import { TokenType } from '../src/config/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email?: string;
        roleId: string;
        permissions: string[] | Record<string, unknown>;
        type: TokenType;
        jti?: string;
      };
      auditEntityManager?: EntityManager;
      auditQueryRunner?: QueryRunner;
      id?: string;
    }
  }
}
