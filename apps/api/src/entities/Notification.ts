import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  title!: string;

  @Column({
    type: 'text',
  })
  message!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'info',
  })
  type!: string;

  @Column({
    type: 'boolean',
    default: false,
    name: 'is_read',
  })
  isRead!: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  data!: Record<string, unknown> | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'read_at',
  })
  readAt!: Date | null;

  @ManyToOne(() => User, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
