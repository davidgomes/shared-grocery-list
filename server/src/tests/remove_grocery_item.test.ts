
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, couplesTable, categoriesTable, groceryListsTable, groceryItemsTable } from '../db/schema';
import { type RemoveGroceryItemInput } from '../schema';
import { removeGroceryItem } from '../handlers/remove_grocery_item';
import { eq } from 'drizzle-orm';

describe('removeGroceryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove an existing grocery item', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const coupleResult = await db.insert(couplesTable)
      .values({
        user1_id: userId,
        user2_id: userId
      })
      .returning()
      .execute();
    const coupleId = coupleResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    const listResult = await db.insert(groceryListsTable)
      .values({
        couple_id: coupleId,
        week_start: '2024-01-01'
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    const itemResult = await db.insert(groceryItemsTable)
      .values({
        list_id: listId,
        category_id: categoryId,
        name: 'Test Item',
        quantity: '1',
        is_completed: false,
        added_by_user_id: userId
      })
      .returning()
      .execute();
    const itemId = itemResult[0].id;

    const input: RemoveGroceryItemInput = {
      item_id: itemId
    };

    // Remove the item
    const result = await removeGroceryItem(input);

    // Verify the response
    expect(result.success).toBe(true);

    // Verify the item was actually deleted from the database
    const remainingItems = await db.select()
      .from(groceryItemsTable)
      .where(eq(groceryItemsTable.id, itemId))
      .execute();

    expect(remainingItems).toHaveLength(0);
  });

  it('should return false when trying to remove non-existent item', async () => {
    const input: RemoveGroceryItemInput = {
      item_id: 999999 // Non-existent ID
    };

    const result = await removeGroceryItem(input);

    // Should return false since no rows were affected
    expect(result.success).toBe(false);
  });

  it('should not affect other grocery items when removing one', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const coupleResult = await db.insert(couplesTable)
      .values({
        user1_id: userId,
        user2_id: userId
      })
      .returning()
      .execute();
    const coupleId = coupleResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    const listResult = await db.insert(groceryListsTable)
      .values({
        couple_id: coupleId,
        week_start: '2024-01-01'
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Create two items
    const item1Result = await db.insert(groceryItemsTable)
      .values({
        list_id: listId,
        category_id: categoryId,
        name: 'Item 1',
        quantity: '1',
        is_completed: false,
        added_by_user_id: userId
      })
      .returning()
      .execute();
    const item1Id = item1Result[0].id;

    const item2Result = await db.insert(groceryItemsTable)
      .values({
        list_id: listId,
        category_id: categoryId,
        name: 'Item 2',
        quantity: '2',
        is_completed: false,
        added_by_user_id: userId
      })
      .returning()
      .execute();
    const item2Id = item2Result[0].id;

    const input: RemoveGroceryItemInput = {
      item_id: item1Id
    };

    // Remove first item
    const result = await removeGroceryItem(input);

    // Verify the response
    expect(result.success).toBe(true);

    // Verify first item was deleted
    const deletedItems = await db.select()
      .from(groceryItemsTable)
      .where(eq(groceryItemsTable.id, item1Id))
      .execute();
    expect(deletedItems).toHaveLength(0);

    // Verify second item still exists
    const remainingItems = await db.select()
      .from(groceryItemsTable)
      .where(eq(groceryItemsTable.id, item2Id))
      .execute();
    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].name).toEqual('Item 2');
  });
});
