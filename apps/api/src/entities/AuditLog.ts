import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';

/* eslint-disable no-unused-vars */
export enum AuditAction {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
/* eslint-enable no-unused-vars */

@Entity('audit_logs')
@Index(['tableName', 'recordId'])
@Index(['userId', 'timestamp'])
@Index(['timestamp'])
@Index(['action'])
@Index(['riskLevel'], { where: "risk_level IN ('HIGH', 'CRITICAL')" })
export class AuditLog extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 50,
    name: 'table_name',
  })
  tableName!: string;

  @Column({
    type: 'uuid',
    name: 'record_id',
  })
  recordId!: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'old_values',
  })
  oldValues!: Record<string, unknown> | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'new_values',
  })
  newValues!: Record<string, unknown> | null;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
    name: 'changed_fields',
  })
  changedFields!: string[] | null;

  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  userId!: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp!: Date;

  @Column({
    type: 'inet',
    nullable: true,
    name: 'ip_address',
  })
  ipAddress!: string | null;

  @Column({
    type: 'text',
    nullable: true,
    name: 'user_agent',
  })
  userAgent!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'session_id',
  })
  sessionId!: string | null;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
    name: 'risk_level',
  })
  riskLevel!: RiskLevel;

  @Column({
    type: 'text',
    nullable: true,
    name: 'compliance_notes',
  })
  complianceNotes!: string | null;

  @ManyToOne(() => User, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
