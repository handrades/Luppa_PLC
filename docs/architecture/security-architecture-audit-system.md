# Security Architecture & Audit System

## JWT Authentication & Authorization Architecture

### JWT Implementation Strategy

```typescript
// Required imports and interfaces
import { Repository, getRepository } from 'typeorm';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';
import { NotificationService } from '@/services/NotificationService';

interface CacheService {
  storeSession(sessionId: string, data: SessionData): Promise<void>;
  getSession(sessionId: string): Promise<SessionData | null>;
  invalidateSession(sessionId: string): Promise<void>;
}

interface SessionData {
  userId: string;
  loginTime: Date;
  ipAddress: string;
  userAgent: string;
}

interface Request {
  ip?: string;
  headers: Record<string, string | string[]>;
}

// JWT service with enhanced security
export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRES_IN = '24h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  constructor(
    private readonly cacheService: CacheService,
    private readonly userRepository: Repository<User>,
    private readonly request?: Request // For accessing IP and User-Agent
  ) {}

  private getCurrentIP(): string {
    // Extract IP from request headers, handling proxies
    return this.request?.ip || 
           this.request?.headers['x-forwarded-for'] as string ||
           this.request?.headers['x-real-ip'] as string ||
           'unknown';
  }

  private getCurrentUserAgent(): string {
    return this.request?.headers['user-agent'] || 'unknown';
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions: user.role.permissions,
      sessionId: uuidv4(),
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'inventory-framework',
      audience: 'inventory-users',
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId: payload.sessionId },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    // Store session in Redis for validation
    await this.cacheService.storeSession(payload.sessionId, {
      userId: user.id,
      loginTime: new Date(),
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
    });

    return { accessToken, refreshToken };
  }

  // Enhanced token validation with session checking
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      
      // Validate session still exists
      const session = await this.cacheService.getSession(payload.sessionId);
      if (!session) {
        throw new UnauthorizedError('Session expired or invalid');
      }

      // Check if user is still active
      const user = await this.userRepository.findOne({
        where: { id: payload.userId, isActive: true },
        relations: ['role'],
      });

      if (!user) {
        throw new UnauthorizedError('User no longer active');
      }

      return { ...payload, user };
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
```

### RBAC Implementation

```typescript
// Audit service interface
interface IAuditService {
  logSecurityEvent(event: SecurityEvent): Promise<void>;
}

interface SecurityEvent {
  userId: string;
  action: string;
  resource: string;
  requestedAction: string;
  ipAddress: string;
  userAgent: string;
}

// Role-based access control middleware
export class RBACMiddleware {
  constructor(private readonly auditService: IAuditService) {}

  authorize(resource: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user; // Set by JWT middleware
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const hasPermission = this.checkPermission(user.role.permissions, resource, action);
        if (!hasPermission) {
          // Log security event
          await this.auditService.logSecurityEvent({
            userId: user.id,
            action: 'ACCESS_DENIED',
            resource,
            requestedAction: action,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          });

          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: `${resource}:${action}`,
          });
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private checkPermission(
    permissions: RolePermissions, 
    resource: string, 
    action: string
  ): boolean {
    const resourcePermissions = permissions[resource];
    return resourcePermissions?.[action] === true;
  }
}

// Create middleware instances with dependencies
// Note: These would typically be injected via dependency injection container
const auditRepository = getRepository(AuditLog); // Or your preferred DI method
const notificationService = new NotificationService(); // Or inject from container

const auditServiceInstance = new AuditService(auditRepository, notificationService);
const rbacMiddleware = new RBACMiddleware(auditServiceInstance);

// Usage in routes
router.get('/plcs', 
  authMiddleware.authenticate,
  rbacMiddleware.authorize('plcs', 'read'),
  PLCController.list
);

router.post('/plcs',
  authMiddleware.authenticate,
  rbacMiddleware.authorize('plcs', 'create'),
  validationMiddleware.validate(plcCreateSchema),
  PLCController.create
);
```

## Comprehensive Audit System

### Database-Level Audit Triggers

```sql
-- Enhanced audit trigger with risk assessment
CREATE OR REPLACE FUNCTION enhanced_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id UUID;
    audit_ip INET;
    audit_user_agent TEXT;
    audit_session_id VARCHAR(255);
    changed_fields TEXT[];
    risk_level risk_level;
    sensitive_fields TEXT[] := ARRAY['password_hash', 'ip_address', 'permissions'];
BEGIN
    -- Extract audit context
    audit_user_id := current_setting('app.current_user_id', true)::UUID;
    audit_ip := current_setting('app.client_ip', true)::INET;
    audit_user_agent := current_setting('app.user_agent', true);
    audit_session_id := current_setting('app.session_id', true);
    
    -- Calculate changed fields for UPDATE operations first
    IF (TG_OP = 'UPDATE') THEN
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
        AND key NOT IN ('updated_at', 'updated_by'); -- Exclude automatic fields
    END IF;
    
    -- Enhanced risk assessment (now changed_fields is available)
    risk_level := CASE 
        -- Critical: System tables, user management
        WHEN TG_TABLE_NAME IN ('users', 'roles') AND TG_OP = 'DELETE' THEN 'CRITICAL'
        WHEN TG_TABLE_NAME = 'users' AND OLD.is_active = true AND NEW.is_active = false THEN 'CRITICAL'
        
        -- High: Sensitive field changes, equipment deletion
        WHEN TG_TABLE_NAME = 'plcs' AND TG_OP = 'DELETE' THEN 'HIGH'
        WHEN TG_TABLE_NAME = 'users' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN 'HIGH'
        WHEN TG_OP = 'UPDATE' AND EXISTS(
            SELECT 1 FROM unnest(sensitive_fields) AS sf 
            WHERE to_jsonb(OLD) ? sf AND to_jsonb(OLD)->sf IS DISTINCT FROM to_jsonb(NEW)->sf
        ) THEN 'HIGH'
        
        -- Medium: IP changes, equipment modifications
        WHEN TG_TABLE_NAME = 'plcs' AND OLD.ip_address IS DISTINCT FROM NEW.ip_address THEN 'MEDIUM'
        WHEN TG_OP = 'DELETE' THEN 'MEDIUM'
        WHEN TG_OP = 'UPDATE' AND array_length(changed_fields, 1) > 5 THEN 'MEDIUM'
        
        ELSE 'LOW'
    END;
    
    -- Insert comprehensive audit record
    INSERT INTO audit_logs (
        table_name, record_id, action, old_values, new_values,
        changed_fields, user_id, ip_address, user_agent, session_id, 
        risk_level, compliance_notes, timestamp
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP::audit_action,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        changed_fields,
        audit_user_id,
        audit_ip,
        audit_user_agent,
        audit_session_id,
        risk_level,
        CASE 
            WHEN risk_level IN ('HIGH', 'CRITICAL') THEN 'Review required for compliance'
            ELSE NULL 
        END,
        CURRENT_TIMESTAMP
    );
    
    -- Return appropriate record
    RETURN CASE TG_OP 
        WHEN 'DELETE' THEN OLD 
        ELSE NEW 
    END;
END;
$$ LANGUAGE plpgsql;
```

### Application-Level Audit Service

```typescript
// Comprehensive audit service
export class AuditService {
  constructor(
    private auditRepository: Repository<AuditLog>,
    private notificationService: NotificationService
  ) {}

  async logChange(changeData: AuditChangeData): Promise<void> {
    const auditLog = this.auditRepository.create({
      tableName: changeData.tableName,
      recordId: changeData.recordId,
      action: changeData.action,
      oldValues: changeData.oldValues,
      newValues: changeData.newValues,
      userId: changeData.userId,
      ipAddress: changeData.ipAddress,
      userAgent: changeData.userAgent,
      sessionId: changeData.sessionId,
      riskLevel: this.assessRiskLevel(changeData),
    });

    await this.auditRepository.save(auditLog);

    // Trigger notifications for high-risk events
    if (auditLog.riskLevel === 'HIGH' || auditLog.riskLevel === 'CRITICAL') {
      await this.notificationService.notifySecurityTeam({
        type: 'SECURITY_EVENT',
        severity: auditLog.riskLevel,
        message: `${changeData.action} on ${changeData.tableName}`,
        auditLogId: auditLog.id,
      });
    }
  }

  // Compliance reporting
  async generateComplianceReport(
    startDate: Date, 
    endDate: Date
  ): Promise<ComplianceReport> {
    const auditLogs = await this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.timestamp BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .orderBy('audit.timestamp', 'DESC')
      .getMany();

    return {
      period: { startDate, endDate },
      totalChanges: auditLogs.length,
      riskBreakdown: this.calculateRiskBreakdown(auditLogs),
      userActivity: this.calculateUserActivity(auditLogs),
      systemChanges: auditLogs.filter(log => 
        ['users', 'roles', 'permissions'].includes(log.tableName)
      ),
      equipmentChanges: auditLogs.filter(log => 
        ['plcs', 'equipment', 'sites', 'cells'].includes(log.tableName)
      ),
    };
  }

  private assessRiskLevel(changeData: AuditChangeData): RiskLevel {
    // Business logic for risk assessment
    if (changeData.tableName === 'users' && changeData.action === 'DELETE') {
      return 'CRITICAL';
    }
    
    if (changeData.tableName === 'plcs' && 
        changeData.oldValues?.ip_address !== changeData.newValues?.ip_address) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }
}
```
