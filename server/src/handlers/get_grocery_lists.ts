
import { db } from '../db';
import { groceryListsTable } from '../db/schema';
import { type GroceryList } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getGroceryLists = async (coupleId: number): Promise<GroceryList[]> => {
  try {
    const results = await db.select()
      .from(groceryListsTable)
      .where(eq(groceryListsTable.couple_id, coupleId))
      .orderBy(desc(groceryListsTable.week_start))
      .execute();

    // Convert week_start from string to Date object
    return results.map(list => ({
      ...list,
      week_start: new Date(list.week_start)
    }));
  } catch (error) {
    console.error('Failed to retrieve grocery lists:', error);
    throw error;
  }
};
