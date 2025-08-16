import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Equipment } from './Equipment';
import { Tag } from './Tag';

@Entity('plcs')
@Index(['tagId'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['ipAddress'], {
  unique: true,
  where: 'ip_address IS NOT NULL AND deleted_at IS NULL',
})
@Index(['make', 'model'])
export class PLC extends BaseEntity {
  @Column({
    type: 'uuid',
    name: 'equipment_id',
  })
  equipmentId!: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'tag_id',
  })
  tagId!: string;

  @Column({
    type: 'text',
  })
  description!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  make!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  model!: string;

  @Column({
    type: 'inet',
    nullable: true,
    name: 'ip_address',
  })
  ipAddress!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'firmware_version',
  })
  firmwareVersion!: string | null;

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

  @ManyToOne(() => Equipment, equipment => equipment.plcs, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipment_id' })
  equipment!: Equipment;

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

  @OneToMany(() => Tag, tag => tag.plc)
  tags!: Tag[];
}
