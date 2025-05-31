
import { serial, text, pgTable, timestamp, integer, boolean, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const couplesTable = pgTable('couples', {
  id: serial('id').primaryKey(),
  user1_id: integer('user1_id').notNull().references(() => usersTable.id),
  user2_id: integer('user2_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const groceryListsTable = pgTable('grocery_lists', {
  id: serial('id').primaryKey(),
  couple_id: integer('couple_id').notNull().references(() => couplesTable.id),
  week_start: date('week_start').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const groceryItemsTable = pgTable('grocery_items', {
  id: serial('id').primaryKey(),
  list_id: integer('list_id').notNull().references(() => groceryListsTable.id),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  name: text('name').notNull(),
  quantity: text('quantity'),
  is_completed: boolean('is_completed').notNull().default(false),
  added_by_user_id: integer('added_by_user_id').notNull().references(() => usersTable.id),
  completed_by_user_id: integer('completed_by_user_id').references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  couplesAsUser1: many(couplesTable, { relationName: 'user1' }),
  couplesAsUser2: many(couplesTable, { relationName: 'user2' }),
  addedItems: many(groceryItemsTable, { relationName: 'addedBy' }),
  completedItems: many(groceryItemsTable, { relationName: 'completedBy' }),
}));

export const couplesRelations = relations(couplesTable, ({ one, many }) => ({
  user1: one(usersTable, {
    fields: [couplesTable.user1_id],
    references: [usersTable.id],
    relationName: 'user1',
  }),
  user2: one(usersTable, {
    fields: [couplesTable.user2_id],
    references: [usersTable.id],
    relationName: 'user2',
  }),
  groceryLists: many(groceryListsTable),
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  items: many(groceryItemsTable),
}));

export const groceryListsRelations = relations(groceryListsTable, ({ one, many }) => ({
  couple: one(couplesTable, {
    fields: [groceryListsTable.couple_id],
    references: [couplesTable.id],
  }),
  items: many(groceryItemsTable),
}));

export const groceryItemsRelations = relations(groceryItemsTable, ({ one }) => ({
  list: one(groceryListsTable, {
    fields: [groceryItemsTable.list_id],
    references: [groceryListsTable.id],
  }),
  category: one(categoriesTable, {
    fields: [groceryItemsTable.category_id],
    references: [categoriesTable.id],
  }),
  addedBy: one(usersTable, {
    fields: [groceryItemsTable.added_by_user_id],
    references: [usersTable.id],
    relationName: 'addedBy',
  }),
  completedBy: one(usersTable, {
    fields: [groceryItemsTable.completed_by_user_id],
    references: [usersTable.id],
    relationName: 'completedBy',
  }),
}));

// Export all tables for proper query building
export const tables = { 
  users: usersTable,
  couples: couplesTable,
  categories: categoriesTable,
  groceryLists: groceryListsTable,
  groceryItems: groceryItemsTable
};
