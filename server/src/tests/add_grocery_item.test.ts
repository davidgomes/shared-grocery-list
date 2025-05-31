
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, couplesTable, categoriesTable, groceryListsTable, groceryItemsTable } from '../db/schema';
import { type AddGroceryItemInput } from '../schema';
import { addGroceryItem } from '../handlers/add_grocery_item';
import { eq, and } from 'drizzle-orm';

describe('addGroceryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let user2Id: number;
  let coupleId: number;
  let categoryId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    userId = user[0].id;

    // Create second user for couple
    const user2 = await db.insert(usersTable)
      .values({
        name: 'Test User 2',
        email: 'test2@example.com'
      })
      .returning()
      .execute();
    user2Id = user2[0].id;

    // Create test couple
    const couple = await db.insert(couplesTable)
      .values({
        user1_id: userId,
        user2_id: user2Id
      })
      .returning()
      .execute();
    coupleId = couple[0].id;

    // Create test category
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Produce'
      })
      .returning()
      .execute();
    categoryId = category[0].id;
  });

  const baseTestInput: AddGroceryItemInput = {
    list_id: 1, // Will be overridden in tests
    category_id: 0, // Will be set in tests
    name: 'Bananas',
    quantity: '2 bunches',
    added_by_user_id: 0 // Will be set in tests
  };

  it('should create a grocery item and auto-create current week list when no list_id provided', async () => {
    const input = {
      ...baseTestInput,
      list_id: undefined as any, // Remove list_id to trigger auto-creation
      category_id: categoryId,
      added_by_user_id: userId
    };
    delete input.list_id; // Remove the property entirely

    const result = await addGroceryItem(input);

    // Basic field validation
    expect(result.name).toEqual('Bananas');
    expect(result.quantity).toEqual('2 bunches');
    expect(result.category_id).toEqual(categoryId);
    expect(result.added_by_user_id).toEqual(userId);
    expect(result.is_completed).toEqual(false);
    expect(result.completed_by_user_id).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.list_id).toBeDefined();
  });

  it('should create grocery list for current week automatically', async () => {
    const input = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: categoryId,
      added_by_user_id: userId
    };
    delete input.list_id;

    const result = await addGroceryItem(input);

    // Verify grocery list was created
    const groceryLists = await db.select()
      .from(groceryListsTable)
      .where(eq(groceryListsTable.id, result.list_id))
      .execute();

    expect(groceryLists).toHaveLength(1);
    expect(groceryLists[0].couple_id).toEqual(coupleId);
    expect(groceryLists[0].week_start).toBeDefined();
    expect(groceryLists[0].created_at).toBeInstanceOf(Date);
  });

  it('should reuse existing grocery list for current week', async () => {
    // Create first item (creates the list)
    const input1 = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: categoryId,
      added_by_user_id: userId,
      name: 'Apples'
    };
    delete input1.list_id;

    const result1 = await addGroceryItem(input1);

    // Create second item (should reuse the list)
    const input2 = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: categoryId,
      added_by_user_id: userId,
      name: 'Oranges'
    };
    delete input2.list_id;

    const result2 = await addGroceryItem(input2);

    // Both items should be in the same list
    expect(result1.list_id).toEqual(result2.list_id);

    // Verify only one list exists for this couple
    const groceryLists = await db.select()
      .from(groceryListsTable)
      .where(eq(groceryListsTable.couple_id, coupleId))
      .execute();

    expect(groceryLists).toHaveLength(1);
  });

  it('should work with explicit list_id when provided', async () => {
    // Create a grocery list first
    const groceryList = await db.insert(groceryListsTable)
      .values({
        couple_id: coupleId,
        week_start: new Date().toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const input = {
      ...baseTestInput,
      list_id: groceryList[0].id,
      category_id: categoryId,
      added_by_user_id: userId
    };

    const result = await addGroceryItem(input);

    expect(result.list_id).toEqual(groceryList[0].id);
    expect(result.name).toEqual('Bananas');
  });

  it('should save grocery item to database', async () => {
    const input = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: categoryId,
      added_by_user_id: userId
    };
    delete input.list_id;

    const result = await addGroceryItem(input);

    // Query database to verify item was saved
    const items = await db.select()
      .from(groceryItemsTable)
      .where(eq(groceryItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Bananas');
    expect(items[0].quantity).toEqual('2 bunches');
    expect(items[0].category_id).toEqual(categoryId);
    expect(items[0].added_by_user_id).toEqual(userId);
    expect(items[0].is_completed).toEqual(false);
    expect(items[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle optional quantity field', async () => {
    const input = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: categoryId,
      added_by_user_id: userId,
      quantity: undefined
    };
    delete input.list_id;

    const result = await addGroceryItem(input);

    expect(result.quantity).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const input = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: categoryId,
      added_by_user_id: 9999 // Non-existent user
    };
    delete input.list_id;

    expect(addGroceryItem(input)).rejects.toThrow(/User with id 9999 does not exist/i);
  });

  it('should throw error for non-existent category', async () => {
    const input = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: 9999, // Non-existent category
      added_by_user_id: userId
    };
    delete input.list_id;

    expect(addGroceryItem(input)).rejects.toThrow(/Category with id 9999 does not exist/i);
  });

  it('should throw error for non-existent list_id', async () => {
    const input = {
      ...baseTestInput,
      list_id: 9999, // Non-existent list
      category_id: categoryId,
      added_by_user_id: userId
    };

    expect(addGroceryItem(input)).rejects.toThrow(/Grocery list with id 9999 does not exist/i);
  });

  it('should throw error when user is not part of any couple', async () => {
    // Create a user not in any couple
    const loneUser = await db.insert(usersTable)
      .values({
        name: 'Lone User',
        email: 'lone@example.com'
      })
      .returning()
      .execute();

    const input = {
      ...baseTestInput,
      list_id: undefined as any,
      category_id: categoryId,
      added_by_user_id: loneUser[0].id
    };
    delete input.list_id;

    expect(addGroceryItem(input)).rejects.toThrow(/User with id .* is not part of any couple/i);
  });
});
