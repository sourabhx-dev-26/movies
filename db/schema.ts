import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const movies = sqliteTable("movies", {
  id: text("id").primaryKey(), title: text("title").notNull(),
  watchUrl: text("watch_url").notNull(), driveFileId: text("drive_file_id").notNull(),
  published: integer("published").notNull().default(1),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, table => [index("movies_published_created").on(table.published, table.createdAt)]);
export const dailyVisits = sqliteTable("daily_visits", {
  day: text("day").primaryKey(), visits: integer("visits").notNull().default(0),
});
export const visitSessions = sqliteTable("visit_sessions", {
  id: text("id").primaryKey(), day: text("day").notNull(),
}, table => [index("visit_sessions_day").on(table.day)]);
