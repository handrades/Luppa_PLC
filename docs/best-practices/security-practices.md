# Security Practices

## Input Sanitization

Always sanitize inputs for industrial environments:

```typescript
import DOMPurify from 'dompurify';
import { escape } from 'html-escaper';

// Sanitize user inputs
const sanitizePlcDescription = (description: string): string => {
  // Remove any HTML tags and encode special characters
  const cleaned = DOMPurify.sanitize(description, { ALLOWED_TAGS: [] });
  return escape(cleaned).substring(0, 255); // Limit length
};

// Validate IP addresses
const isValidPlcIpAddress = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

// Rate limiting for API endpoints
const createPlcRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many PLC creation requests',
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Audit Logging for Compliance

Implement comprehensive audit trails:

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  entityType: 'plc' | 'user' | 'system';
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

class AuditService {
  async logPlcChange(
    action: 'create' | 'update' | 'delete',
    plcId: string,
    userId: string,
    oldValues?: Partial<PLCRecord>,
    newValues?: Partial<PLCRecord>,
    request?: Request
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: generateId(),
      timestamp: new Date(),
      userId,
      action: `plc.${action}`,
      entityType: 'plc',
      entityId: plcId,
      oldValues,
      newValues,
      ipAddress: request?.ip || 'unknown',
      userAgent: request?.headers['user-agent'] || 'unknown',
    };

    await this.repository.createAuditLog(auditEntry);

    // Also log to Winston for external monitoring
    logger.info('PLC audit event', {
      auditId: auditEntry.id,
      action: auditEntry.action,
      entityId: auditEntry.entityId,
      userId: auditEntry.userId,
    });
  }
}
```
