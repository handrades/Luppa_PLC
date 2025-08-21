import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Role } from './Role';

@Entity('users', { schema: 'core' })
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  email!: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'first_name',
  })
  firstName!: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'last_name',
  })
  lastName!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'password_hash',
  })
  passwordHash!: string;

  @Column({
    type: 'uuid',
    name: 'role_id',
  })
  roleId!: string;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
  })
  isActive!: boolean;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'last_login',
  })
  lastLogin!: Date | null;

  @ManyToOne(() => Role, role => role.users, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
