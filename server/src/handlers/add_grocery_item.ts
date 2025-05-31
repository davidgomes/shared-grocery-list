
import { db } from '../db';
import { groceryItemsTable, groceryListsTable, usersTable, categoriesTable, couplesTable } from '../db/schema';
import { type AddGroceryItemInput, type GroceryItem } from '../schema';
import { eq, and } from 'drizzle-orm';

// Helper function to get the start of the current week (Monday)
const getCurrentWeekStart = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so -6 to get to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const addGroceryItem = async (input: AddGroceryItemInput): Promise<GroceryItem> => {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.added_by_user_id))
      .execute();
    
    if (user.length === 0) {
      throw new Error(`User with id ${input.added_by_user_id} does not exist`);
    }

    // Validate that the category exists
    const category = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();
    
    if (category.length === 0) {
      throw new Error(`Category with id ${input.category_id} does not exist`);
    }

    // If list_id is provided, validate it exists and get the couple_id from it
    let listId: number;
    let coupleId: number;

    if (input.list_id) {
      const existingList = await db.select()
        .from(groceryListsTable)
        .where(eq(groceryListsTable.id, input.list_id))
        .execute();
      
      if (existingList.length === 0) {
        throw new Error(`Grocery list with id ${input.list_id} does not exist`);
      }
      
      listId = input.list_id;
      coupleId = existingList[0].couple_id;
    } else {
      // If no list_id provided, we need to find the user's couple and create/find current week list
      // Find which couple this user belongs to
      const userCouples = await db.select()
        .from(couplesTable)
        .where(
          eq(couplesTable.user1_id, input.added_by_user_id)
        )
        .execute();
      
      const userCouples2 = await db.select()
        .from(couplesTable)
        .where(
          eq(couplesTable.user2_id, input.added_by_user_id)
        )
        .execute();

      const allUserCouples = [...userCouples, ...userCouples2];
      
      if (allUserCouples.length === 0) {
        throw new Error(`User with id ${input.added_by_user_id} is not part of any couple`);
      }

      // Use the first couple (assuming user is only in one couple for simplicity)
      coupleId = allUserCouples[0].id;

      // Get current week start
      const weekStart = getCurrentWeekStart();

      // Find or create the current week's grocery list for the couple
      let groceryList = await db.select()
        .from(groceryListsTable)
        .where(and(
          eq(groceryListsTable.couple_id, coupleId),
          eq(groceryListsTable.week_start, weekStart.toISOString().split('T')[0]) // Convert to YYYY-MM-DD format
        ))
        .execute();

      if (groceryList.length === 0) {
        // Create new grocery list for current week
        const newList = await db.insert(groceryListsTable)
          .values({
            couple_id: coupleId,
            week_start: weekStart.toISOString().split('T')[0]
          })
          .returning()
          .execute();
        
        listId = newList[0].id;
      } else {
        listId = groceryList[0].id;
      }
    }

    // Insert grocery item record
    const result = await db.insert(groceryItemsTable)
      .values({
        list_id: listId,
        category_id: input.category_id,
        name: input.name,
        quantity: input.quantity || null,
        added_by_user_id: input.added_by_user_id,
        is_completed: false,
        completed_by_user_id: null,
        completed_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Grocery item creation failed:', error);
    throw error;
  }
};
