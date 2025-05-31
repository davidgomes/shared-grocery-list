
import { db } from '../db';
import { groceryListsTable, couplesTable } from '../db/schema';
import { type CreateGroceryListInput, type GroceryList } from '../schema';
import { eq } from 'drizzle-orm';

export const createGroceryList = async (input: CreateGroceryListInput): Promise<GroceryList> => {
  try {
    // Verify couple exists first to prevent foreign key constraint violation
    const existingCouple = await db.select()
      .from(couplesTable)
      .where(eq(couplesTable.id, input.couple_id))
      .execute();

    if (existingCouple.length === 0) {
      throw new Error(`Couple with id ${input.couple_id} does not exist`);
    }

    // Insert grocery list record - convert Date to string for date column
    const result = await db.insert(groceryListsTable)
      .values({
        couple_id: input.couple_id,
        week_start: input.week_start.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Convert string back to Date before returning
    const groceryList = result[0];
    return {
      ...groceryList,
      week_start: new Date(groceryList.week_start) // Convert string back to Date
    };
  } catch (error) {
    console.error('Grocery list creation failed:', error);
    throw error;
  }
};
