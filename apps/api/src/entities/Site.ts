import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Cell } from './Cell';

@Entity('sites')
@Index(['name'], { unique: true })
export class Site extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name!: string;

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

  @OneToMany(() => Cell, cell => cell.site)
  cells!: Cell[];
}
