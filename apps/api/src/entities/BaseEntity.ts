import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  BaseEntity as TypeORMBaseEntity,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity extends TypeORMBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
