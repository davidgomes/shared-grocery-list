
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Couple schema (represents a partnership between two users)
export const coupleSchema = z.object({
  id: z.number(),
  user1_id: z.number(),
  user2_id: z.number(),
  created_at: z.coerce.date()
});

export type Couple = z.infer<typeof coupleSchema>;

// Category schema for organizing grocery items
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Grocery list schema (weekly lists)
export const groceryListSchema = z.object({
  id: z.number(),
  couple_id: z.number(),
  week_start: z.coerce.date(),
  created_at: z.coerce.date()
});

export type GroceryList = z.infer<typeof groceryListSchema>;

// Grocery item schema
export const groceryItemSchema = z.object({
  id: z.number(),
  list_id: z.number(),
  category_id: z.number(),
  name: z.string(),
  quantity: z.string().nullable(),
  is_completed: z.boolean(),
  added_by_user_id: z.number(),
  completed_by_user_id: z.number().nullable(),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type GroceryItem = z.infer<typeof groceryItemSchema>;

// Input schemas for creating/updating data
export const createUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCoupleInputSchema = z.object({
  user1_id: z.number(),
  user2_id: z.number()
});

export type CreateCoupleInput = z.infer<typeof createCoupleInputSchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(1)
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createGroceryListInputSchema = z.object({
  couple_id: z.number(),
  week_start: z.coerce.date()
});

export type CreateGroceryListInput = z.infer<typeof createGroceryListInputSchema>;

export const addGroceryItemInputSchema = z.object({
  list_id: z.number(),
  category_id: z.number(),
  name: z.string().min(1),
  quantity: z.string().nullable().optional(),
  added_by_user_id: z.number()
});

export type AddGroceryItemInput = z.infer<typeof addGroceryItemInputSchema>;

export const toggleItemCompletionInputSchema = z.object({
  item_id: z.number(),
  user_id: z.number()
});

export type ToggleItemCompletionInput = z.infer<typeof toggleItemCompletionInputSchema>;

export const removeGroceryItemInputSchema = z.object({
  item_id: z.number()
});

export type RemoveGroceryItemInput = z.infer<typeof removeGroceryItemInputSchema>;

export const getCurrentWeekListInputSchema = z.object({
  couple_id: z.number()
});

export type GetCurrentWeekListInput = z.infer<typeof getCurrentWeekListInputSchema>;
