
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, couplesTable, categoriesTable, groceryListsTable, groceryItemsTable } from '../db/schema';
import { type ToggleItemCompletionInput } from '../schema';
import { toggleItemCompletion } from '../handlers/toggle_item_completion';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async (name: string, email: string) => {
  const result = await db.insert(usersTable)
    .values({ name, email })
    .returning()
    .execute();
  return result[0];
};

const createTestCouple = async (user1_id: number, user2_id: number) => {
  const result = await db.insert(couplesTable)
    .values({ user1_id, user2_id })
    .returning()
    .execute();
  return result[0];
};

const createTestCategory = async (name: string) => {
  const result = await db.insert(categoriesTable)
    .values({ name })
    .returning()
    .execute();
  return result[0];
};

const createTestGroceryList = async (couple_id: number) => {
  const result = await db.insert(groceryListsTable)
    .values({ 
      couple_id, 
      week_start: '2024-01-01' // Use string format for date column
    })
    .returning()
    .execute();
  return result[0];
};

const createTestGroceryItem = async (list_id: number, category_id: number, added_by_user_id: number, isCompleted = false, completed_by_user_id?: number) => {
  const result = await db.insert(groceryItemsTable)
    .values({
      list_id,
      category_id,
      name: 'Test Item',
      quantity: '1 unit',
      is_completed: isCompleted,
      added_by_user_id,
      completed_by_user_id: completed_by_user_id || null,
      completed_at: isCompleted ? new Date() : null
    })
    .returning()
    .execute();
  return result[0];
};

describe('toggleItemCompletion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark incomplete item as completed', async () => {
    // Setup test data
    const user1 = await createTestUser('John Doe', 'john@example.com');
    const user2 = await createTestUser('Jane Doe', 'jane@example.com');
    const couple = await createTestCouple(user1.id, user2.id);
    const category = await createTestCategory('Produce');
    const groceryList = await createTestGroceryList(couple.id);
    const groceryItem = await createTestGroceryItem(groceryList.id, category.id, user1.id, false);

    const input: ToggleItemCompletionInput = {
      item_id: groceryItem.id,
      user_id: user2.id
    };

    const result = await toggleItemCompletion(input);

    // Verify completion status
    expect(result.is_completed).toBe(true);
    expect(result.completed_by_user_id).toBe(user2.id);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.id).toBe(groceryItem.id);
    expect(result.name).toBe('Test Item');
  });

  it('should mark completed item as incomplete', async () => {
    // Setup test data
    const user1 = await createTestUser('John Doe', 'john@example.com');
    const user2 = await createTestUser('Jane Doe', 'jane@example.com');
    const couple = await createTestCouple(user1.id, user2.id);
    const category = await createTestCategory('Produce');
    const groceryList = await createTestGroceryList(couple.id);
    const groceryItem = await createTestGroceryItem(groceryList.id, category.id, user1.id, true, user1.id);

    const input: ToggleItemCompletionInput = {
      item_id: groceryItem.id,
      user_id: user2.id
    };

    const result = await toggleItemCompletion(input);

    // Verify completion status reset
    expect(result.is_completed).toBe(false);
    expect(result.completed_by_user_id).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.id).toBe(groceryItem.id);
  });

  it('should update database record correctly', async () => {
    // Setup test data
    const user1 = await createTestUser('John Doe', 'john@example.com');
    const user2 = await createTestUser('Jane Doe', 'jane@example.com');
    const couple = await createTestCouple(user1.id, user2.id);
    const category = await createTestCategory('Produce');
    const groceryList = await createTestGroceryList(couple.id);
    const groceryItem = await createTestGroceryItem(groceryList.id, category.id, user1.id, false);

    const input: ToggleItemCompletionInput = {
      item_id: groceryItem.id,
      user_id: user2.id
    };

    await toggleItemCompletion(input);

    // Verify database was updated
    const updatedItems = await db.select()
      .from(groceryItemsTable)
      .where(eq(groceryItemsTable.id, groceryItem.id))
      .execute();

    expect(updatedItems).toHaveLength(1);
    const updatedItem = updatedItems[0];
    expect(updatedItem.is_completed).toBe(true);
    expect(updatedItem.completed_by_user_id).toBe(user2.id);
    expect(updatedItem.completed_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent item', async () => {
    const input: ToggleItemCompletionInput = {
      item_id: 999,
      user_id: 1
    };

    await expect(toggleItemCompletion(input)).rejects.toThrow(/not found/i);
  });

  it('should handle multiple toggles correctly', async () => {
    // Setup test data
    const user1 = await createTestUser('John Doe', 'john@example.com');
    const user2 = await createTestUser('Jane Doe', 'jane@example.com');
    const couple = await createTestCouple(user1.id, user2.id);
    const category = await createTestCategory('Produce');
    const groceryList = await createTestGroceryList(couple.id);
    const groceryItem = await createTestGroceryItem(groceryList.id, category.id, user1.id, false);

    const input: ToggleItemCompletionInput = {
      item_id: groceryItem.id,
      user_id: user2.id
    };

    // First toggle: incomplete -> complete
    const result1 = await toggleItemCompletion(input);
    expect(result1.is_completed).toBe(true);
    expect(result1.completed_by_user_id).toBe(user2.id);
    expect(result1.completed_at).toBeInstanceOf(Date);

    // Second toggle: complete -> incomplete
    const result2 = await toggleItemCompletion(input);
    expect(result2.is_completed).toBe(false);
    expect(result2.completed_by_user_id).toBeNull();
    expect(result2.completed_at).toBeNull();

    // Third toggle: incomplete -> complete (with different user)
    const inputUser1: ToggleItemCompletionInput = {
      item_id: groceryItem.id,
      user_id: user1.id
    };
    const result3 = await toggleItemCompletion(inputUser1);
    expect(result3.is_completed).toBe(true);
    expect(result3.completed_by_user_id).toBe(user1.id);
    expect(result3.completed_at).toBeInstanceOf(Date);
  });

  it('should preserve other item fields during toggle', async () => {
    // Setup test data
    const user1 = await createTestUser('John Doe', 'john@example.com');
    const user2 = await createTestUser('Jane Doe', 'jane@example.com');
    const couple = await createTestCouple(user1.id, user2.id);
    const category = await createTestCategory('Produce');
    const groceryList = await createTestGroceryList(couple.id);
    const groceryItem = await createTestGroceryItem(groceryList.id, category.id, user1.id, false);

    const input: ToggleItemCompletionInput = {
      item_id: groceryItem.id,
      user_id: user2.id
    };

    const result = await toggleItemCompletion(input);

    // Verify other fields are preserved
    expect(result.name).toBe('Test Item');
    expect(result.quantity).toBe('1 unit');
    expect(result.list_id).toBe(groceryList.id);
    expect(result.category_id).toBe(category.id);
    expect(result.added_by_user_id).toBe(user1.id);
    expect(result.created_at).toBeInstanceOf(Date);
  });
});
