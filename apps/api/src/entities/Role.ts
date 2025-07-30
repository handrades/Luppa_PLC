import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity.js';
import { User } from './User.js';

export interface RolePermissions {
  [key: string]: boolean | string[] | { [action: string]: boolean } | ActionPermissions;
}

export interface ActionPermissions {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  export?: boolean;
  configure?: boolean;
  maintenance?: boolean;
  purge?: boolean;
  backup?: boolean;
  restore?: boolean;
  monitoring?: boolean;
}

@Entity('roles')
export class Role extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name!: string;

  @Column({
    type: 'jsonb',
    default: {},
  })
  permissions!: RolePermissions;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  isSystem!: boolean;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
