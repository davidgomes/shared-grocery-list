
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { groceryListsTable, usersTable, couplesTable } from '../db/schema';
import { type CreateGroceryListInput } from '../schema';
import { createGroceryList } from '../handlers/create_grocery_list';
import { eq } from 'drizzle-orm';

// Helper function to create test users and couple
const createTestCouple = async () => {
  // Create two users
  const users = await db.insert(usersTable)
    .values([
      { name: 'User One', email: 'user1@test.com' },
      { name: 'User Two', email: 'user2@test.com' }
    ])
    .returning()
    .execute();

  // Create couple
  const couples = await db.insert(couplesTable)
    .values({
      user1_id: users[0].id,
      user2_id: users[1].id
    })
    .returning()
    .execute();

  return couples[0];
};

const testInput: CreateGroceryListInput = {
  couple_id: 1, // Will be overridden in tests
  week_start: new Date('2024-01-01')
};

describe('createGroceryList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a grocery list', async () => {
    const couple = await createTestCouple();
    const input = { ...testInput, couple_id: couple.id };

    const result = await createGroceryList(input);

    // Basic field validation
    expect(result.couple_id).toEqual(couple.id);
    expect(result.week_start).toEqual(new Date('2024-01-01'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save grocery list to database', async () => {
    const couple = await createTestCouple();
    const input = { ...testInput, couple_id: couple.id };

    const result = await createGroceryList(input);

    // Query database to verify list was saved
    const groceryLists = await db.select()
      .from(groceryListsTable)
      .where(eq(groceryListsTable.id, result.id))
      .execute();

    expect(groceryLists).toHaveLength(1);
    expect(groceryLists[0].couple_id).toEqual(couple.id);
    expect(groceryLists[0].week_start).toEqual('2024-01-01'); // Date stored as string
    expect(groceryLists[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle date conversion correctly', async () => {
    const couple = await createTestCouple();
    const weekStart = new Date('2024-03-15');
    const input = { couple_id: couple.id, week_start: weekStart };

    const result = await createGroceryList(input);

    // Verify date is returned as Date object
    expect(result.week_start).toBeInstanceOf(Date);
    expect(result.week_start.getTime()).toEqual(weekStart.getTime());

    // Verify date is stored correctly in database
    const groceryLists = await db.select()
      .from(groceryListsTable)
      .where(eq(groceryListsTable.id, result.id))
      .execute();

    expect(groceryLists[0].week_start).toEqual('2024-03-15');
  });

  it('should throw error when couple does not exist', async () => {
    const input = { ...testInput, couple_id: 999 }; // Non-existent couple

    await expect(createGroceryList(input)).rejects.toThrow(/couple with id 999 does not exist/i);
  });

  it('should create multiple grocery lists for the same couple', async () => {
    const couple = await createTestCouple();

    // Create first list
    const input1 = { couple_id: couple.id, week_start: new Date('2024-01-01') };
    const result1 = await createGroceryList(input1);

    // Create second list
    const input2 = { couple_id: couple.id, week_start: new Date('2024-01-08') };
    const result2 = await createGroceryList(input2);

    // Verify both lists exist
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.couple_id).toEqual(couple.id);
    expect(result2.couple_id).toEqual(couple.id);

    // Verify both are in database
    const groceryLists = await db.select()
      .from(groceryListsTable)
      .where(eq(groceryListsTable.couple_id, couple.id))
      .execute();

    expect(groceryLists).toHaveLength(2);
  });

  it('should handle different date formats correctly', async () => {
    const couple = await createTestCouple();
    
    // Test with different date input
    const dateInput = new Date(2024, 5, 15); // June 15, 2024 (month is 0-indexed)
    const input = { couple_id: couple.id, week_start: dateInput };

    const result = await createGroceryList(input);

    expect(result.week_start).toBeInstanceOf(Date);
    expect(result.week_start.getFullYear()).toEqual(2024);
    expect(result.week_start.getMonth()).toEqual(5); // June (0-indexed)
    expect(result.week_start.getDate()).toEqual(15);
  });
});
