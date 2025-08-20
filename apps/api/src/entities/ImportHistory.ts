import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import {
  CreatedEntitySummary,
  ImportOptions,
  ValidationError,
} from "../services/ImportExportService";

export type ImportStatus = "pending" | "processing" | "completed" | "failed";

@Entity("import_history")
export class ImportHistory extends BaseEntity {
  @Column({
    type: "uuid",
    name: "user_id",
  })
  userId!: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  filename!: string;

  @Column({
    type: "int",
    name: "total_rows",
  })
  totalRows!: number;

  @Column({
    type: "int",
    name: "successful_rows",
  })
  successfulRows!: number;

  @Column({
    type: "int",
    name: "failed_rows",
  })
  failedRows!: number;

  @Column({
    type: "jsonb",
  })
  options!: ImportOptions;

  @Column({
    type: "jsonb",
    nullable: true,
  })
  errors?: ValidationError[];

  @Column({
    type: "jsonb",
    nullable: true,
    name: "created_entities",
  })
  createdEntities?: CreatedEntitySummary;

  @Column({
    type: "varchar",
    length: 50,
  })
  status!: ImportStatus;

  @Column({
    type: "timestamp",
    name: "started_at",
    default: () => "CURRENT_TIMESTAMP",
  })
  startedAt!: Date;

  @Column({
    type: "timestamp",
    name: "completed_at",
    nullable: true,
  })
  completedAt?: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
