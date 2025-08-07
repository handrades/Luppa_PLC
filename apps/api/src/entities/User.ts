import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Role } from './Role';

@Entity('users')
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
  })
  firstName!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  lastName!: string;

  @Column({
    type: 'varchar',
    length: 255,
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
  })
  isActive!: boolean;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastLogin!: Date | null;

  @ManyToOne(() => Role, role => role.users, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
