import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Cell } from './Cell';
import { PLC } from './PLC';

/* eslint-disable no-unused-vars */
export enum EquipmentType {
  PRESS = 'PRESS',
  ROBOT = 'ROBOT',
  OVEN = 'OVEN',
  CONVEYOR = 'CONVEYOR',
  ASSEMBLY_TABLE = 'ASSEMBLY_TABLE',
  OTHER = 'OTHER',
}
/* eslint-enable no-unused-vars */

@Entity('equipment')
export class Equipment extends BaseEntity {
  @Column({
    type: 'uuid',
    name: 'cell_id',
  })
  cellId!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  name!: string;

  @Column({
    type: 'enum',
    enum: EquipmentType,
    name: 'equipment_type',
  })
  equipmentType!: EquipmentType;

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

  @ManyToOne(() => Cell, cell => cell.equipment, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cell_id' })
  cell!: Cell;

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

  @OneToMany(() => PLC, plc => plc.equipment)
  plcs!: PLC[];
}
