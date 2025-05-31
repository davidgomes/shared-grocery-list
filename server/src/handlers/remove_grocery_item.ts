
import { db } from '../db';
import { groceryItemsTable } from '../db/schema';
import { type RemoveGroceryItemInput } from '../schema';
import { eq } from 'drizzle-orm';

export const removeGroceryItem = async (input: RemoveGroceryItemInput): Promise<{ success: boolean }> => {
  try {
    // Delete the grocery item
    const result = await db.delete(groceryItemsTable)
      .where(eq(groceryItemsTable.id, input.item_id))
      .execute();

    // Check if any rows were affected (item existed and was deleted)
    return { success: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    console.error('Removing grocery item failed:', error);
    throw error;
  }
};
