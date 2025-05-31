
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, couplesTable, groceryListsTable } from '../db/schema';
import { getGroceryLists } from '../handlers/get_grocery_lists';

describe('getGroceryLists', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve grocery lists for a couple', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' }
      ])
      .returning()
      .execute();

    const couple = await db.insert(couplesTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    // Create grocery lists
    await db.insert(groceryListsTable)
      .values([
        {
          couple_id: couple[0].id,
          week_start: '2024-01-01'
        },
        {
          couple_id: couple[0].id,
          week_start: '2024-01-08'
        }
      ])
      .execute();

    const result = await getGroceryLists(couple[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].couple_id).toEqual(couple[0].id);
    expect(result[0].week_start).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
  });

  it('should return lists ordered by week_start descending', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' }
      ])
      .returning()
      .execute();

    const couple = await db.insert(couplesTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    // Create lists with different week_start dates
    await db.insert(groceryListsTable)
      .values([
        {
          couple_id: couple[0].id,
          week_start: '2024-01-01' // Earlier date
        },
        {
          couple_id: couple[0].id,
          week_start: '2024-01-15' // Later date
        },
        {
          couple_id: couple[0].id,
          week_start: '2024-01-08' // Middle date
        }
      ])
      .execute();

    const result = await getGroceryLists(couple[0].id);

    expect(result).toHaveLength(3);
    // Should be ordered by week_start descending (latest first)
    expect(result[0].week_start.getTime()).toBeGreaterThan(result[1].week_start.getTime());
    expect(result[1].week_start.getTime()).toBeGreaterThan(result[2].week_start.getTime());
    
    // Verify specific order
    expect(result[0].week_start).toEqual(new Date('2024-01-15'));
    expect(result[1].week_start).toEqual(new Date('2024-01-08'));
    expect(result[2].week_start).toEqual(new Date('2024-01-01'));
  });

  it('should return empty array for couple with no lists', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' }
      ])
      .returning()
      .execute();

    const couple = await db.insert(couplesTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    const result = await getGroceryLists(couple[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return lists for specified couple', async () => {
    // Create prerequisite data for two couples
    const users = await db.insert(usersTable)
      .values([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' },
        { name: 'User 4', email: 'user4@example.com' }
      ])
      .returning()
      .execute();

    const couples = await db.insert(couplesTable)
      .values([
        {
          user1_id: users[0].id,
          user2_id: users[1].id
        },
        {
          user1_id: users[2].id,
          user2_id: users[3].id
        }
      ])
      .returning()
      .execute();

    // Create lists for both couples
    await db.insert(groceryListsTable)
      .values([
        {
          couple_id: couples[0].id,
          week_start: '2024-01-01'
        },
        {
          couple_id: couples[0].id,
          week_start: '2024-01-08'
        },
        {
          couple_id: couples[1].id,
          week_start: '2024-01-01'
        }
      ])
      .execute();

    const result = await getGroceryLists(couples[0].id);

    expect(result).toHaveLength(2);
    result.forEach(list => {
      expect(list.couple_id).toEqual(couples[0].id);
    });
  });

  it('should convert week_start to Date objects', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' }
      ])
      .returning()
      .execute();

    const couple = await db.insert(couplesTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    await db.insert(groceryListsTable)
      .values({
        couple_id: couple[0].id,
        week_start: '2024-01-01'
      })
      .execute();

    const result = await getGroceryLists(couple[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].week_start).toBeInstanceOf(Date);
    expect(result[0].week_start.getFullYear()).toEqual(2024);
    expect(result[0].week_start.getMonth()).toEqual(0); // January is 0
    expect(result[0].week_start.getDate()).toEqual(1);
  });
});
