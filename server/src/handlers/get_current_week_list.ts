
import { db } from '../db';
import { groceryItemsTable, groceryListsTable, categoriesTable } from '../db/schema';
import { type GetCurrentWeekListInput, type GroceryItem, type Category } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export type GroceryItemWithCategory = GroceryItem & {
  category: Category;
};

export const getCurrentWeekList = async (input: GetCurrentWeekListInput): Promise<GroceryItemWithCategory[]> => {
  try {
    // Calculate current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, Monday is 1
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Convert dates to YYYY-MM-DD format for date column comparison
    const weekStartStr = currentWeekStart.toISOString().split('T')[0];
    const weekEndStr = currentWeekEnd.toISOString().split('T')[0];

    // Join grocery items with their lists and categories
    const results = await db.select()
      .from(groceryItemsTable)
      .innerJoin(groceryListsTable, eq(groceryItemsTable.list_id, groceryListsTable.id))
      .innerJoin(categoriesTable, eq(groceryItemsTable.category_id, categoriesTable.id))
      .where(
        and(
          eq(groceryListsTable.couple_id, input.couple_id),
          gte(groceryListsTable.week_start, weekStartStr),
          lte(groceryListsTable.week_start, weekEndStr)
        )
      )
      .execute();

    // Transform results to match expected structure
    return results.map(result => ({
      id: result.grocery_items.id,
      list_id: result.grocery_items.list_id,
      category_id: result.grocery_items.category_id,
      name: result.grocery_items.name,
      quantity: result.grocery_items.quantity,
      is_completed: result.grocery_items.is_completed,
      added_by_user_id: result.grocery_items.added_by_user_id,
      completed_by_user_id: result.grocery_items.completed_by_user_id,
      created_at: result.grocery_items.created_at,
      completed_at: result.grocery_items.completed_at,
      category: {
        id: result.categories.id,
        name: result.categories.name,
        created_at: result.categories.created_at
      }
    }));
  } catch (error) {
    console.error('Get current week list failed:', error);
    throw error;
  }
};
