import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  doublePrecision,
  timestamp,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const REPEAT_RULES = ["none", "daily", "weekly", "monthly", "every_n_days"] as const;
export type RepeatRule = (typeof REPEAT_RULES)[number];

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    status: text("status", { enum: ["open", "done"] }).notNull().default("open"),
    dueDate: date("due_date"),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    // priority signals
    urgent: boolean("urgent").notNull().default(false),
    important: boolean("important").notNull().default(false),
    level: integer("level").notNull().default(2), // 1 = P1 (highest) .. 3 = P3
    impact: integer("impact").notNull().default(3), // 1-5
    effort: integer("effort").notNull().default(3), // 1-5
    manualRank: doublePrecision("manual_rank").notNull().default(0),
    // recurrence
    repeatRule: text("repeat_rule", { enum: REPEAT_RULES }).notNull().default("none"),
    repeatInterval: integer("repeat_interval").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Google Calendar event backing this task (null when not synced)
    googleEventId: text("google_event_id"),
  },
  (t) => [index("tasks_status_idx").on(t.status), index("tasks_due_idx").on(t.dueDate)],
);

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  subtasks: many(subtasks),
  taskTags: many(taskTags),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  taskTags: many(taskTags),
}));

export type Project = typeof projects.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Subtask = typeof subtasks.$inferSelect;

export type TaskWithRelations = Task & {
  project: Project | null;
  subtasks: Subtask[];
  taskTags: { tagId: number; tag: Tag }[];
};

/** Single-row table holding the connected Google account (this is a single-user app). */
export const googleAccount = pgTable("google_account", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  refreshToken: text("refresh_token").notNull(),
  calendarId: text("calendar_id"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GoogleAccount = typeof googleAccount.$inferSelect;
