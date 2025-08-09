import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Site } from './Site';
import { Equipment } from './Equipment';

@Entity('cells')
@Index(['siteId', 'lineNumber'], { unique: true })
export class Cell extends BaseEntity {
  @Column({
    type: 'uuid',
    name: 'site_id',
  })
  siteId!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'line_number',
  })
  lineNumber!: string;

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

  @ManyToOne(() => Site, site => site.cells, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'site_id' })
  site!: Site;

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

  @OneToMany(() => Equipment, equipment => equipment.cell)
  equipment!: Equipment[];
}
