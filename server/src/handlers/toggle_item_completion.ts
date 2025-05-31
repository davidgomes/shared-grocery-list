
import { db } from '../db';
import { groceryItemsTable } from '../db/schema';
import { type ToggleItemCompletionInput, type GroceryItem } from '../schema';
import { eq } from 'drizzle-orm';

export const toggleItemCompletion = async (input: ToggleItemCompletionInput): Promise<GroceryItem> => {
  try {
    // First, get the current item to check its completion status
    const currentItems = await db.select()
      .from(groceryItemsTable)
      .where(eq(groceryItemsTable.id, input.item_id))
      .execute();

    if (currentItems.length === 0) {
      throw new Error(`Grocery item with id ${input.item_id} not found`);
    }

    const currentItem = currentItems[0];
    const isCurrentlyCompleted = currentItem.is_completed;

    // Toggle the completion status
    const result = await db.update(groceryItemsTable)
      .set({
        is_completed: !isCurrentlyCompleted,
        completed_by_user_id: !isCurrentlyCompleted ? input.user_id : null,
        completed_at: !isCurrentlyCompleted ? new Date() : null
      })
      .where(eq(groceryItemsTable.id, input.item_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Toggle item completion failed:', error);
    throw error;
  }
};
