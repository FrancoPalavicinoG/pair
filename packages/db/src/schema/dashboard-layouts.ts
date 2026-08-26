import { pgTable, timestamp, uuid, jsonb, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export type DashboardWidgetConfig = { key: string; visible: boolean };
export type DashboardWidgets = DashboardWidgetConfig[];

export const dashboardLayouts = pgTable(
  "dashboard_layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    widgets: jsonb("widgets").notNull().$type<DashboardWidgets>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId)],
);