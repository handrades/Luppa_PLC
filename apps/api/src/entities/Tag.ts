import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { PLC } from './PLC';

/* eslint-disable no-unused-vars */
export enum TagDataType {
  BOOL = 'BOOL',
  INT = 'INT',
  DINT = 'DINT',
  REAL = 'REAL',
  STRING = 'STRING',
  TIMER = 'TIMER',
  COUNTER = 'COUNTER',
}
/* eslint-enable no-unused-vars */

@Entity('tags')
@Index(['plcId', 'name'], { unique: true })
export class Tag extends BaseEntity {
  @Column({
    type: 'uuid',
    name: 'plc_id',
  })
  plcId!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  name!: string;

  @Column({
    type: 'enum',
    enum: TagDataType,
    name: 'data_type',
  })
  dataType!: TagDataType;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  address!: string | null;

  @Column({
    type: 'uuid',
    name: 'created_by',
  })
  createdBy!: string;

  @Column({
    type: 'uuid',
    name: 'updated_by',
  })
  updatedBy!: string;

  @ManyToOne(() => PLC, plc => plc.tags, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'plc_id' })
  plc!: PLC;

  @ManyToOne(() => User, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @ManyToOne(() => User, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'updated_by' })
  updater!: User;
}
