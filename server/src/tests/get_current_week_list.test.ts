
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, couplesTable, categoriesTable, groceryListsTable, groceryItemsTable } from '../db/schema';
import { type GetCurrentWeekListInput } from '../schema';
import { getCurrentWeekList } from '../handlers/get_current_week_list';

// Test data setup
const createTestData = async () => {
  // Create users
  const users = await db.insert(usersTable)
    .values([
      { name: 'User 1', email: 'user1@test.com' },
      { name: 'User 2', email: 'user2@test.com' }
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

  // Create categories
  const categories = await db.insert(categoriesTable)
    .values([
      { name: 'Fruits' },
      { name: 'Vegetables' }
    ])
    .returning()
    .execute();

  return { users, couple: couples[0], categories };
};

const getCurrentWeekStart = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - daysToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  return currentWeekStart.toISOString().split('T')[0];
};

describe('getCurrentWeekList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no lists exist for couple', async () => {
    const { couple } = await createTestData();
    
    const input: GetCurrentWeekListInput = {
      couple_id: couple.id
    };

    const result = await getCurrentWeekList(input);
    expect(result).toEqual([]);
  });

  it('should return grocery items for current week list', async () => {
    const { users, couple, categories } = await createTestData();
    
    // Create current week list
    const currentWeekStart = getCurrentWeekStart();
    const lists = await db.insert(groceryListsTable)
      .values({
        couple_id: couple.id,
        week_start: currentWeekStart
      })
      .returning()
      .execute();

    // Add items to the list
    await db.insert(groceryItemsTable)
      .values([
        {
          list_id: lists[0].id,
          category_id: categories[0].id,
          name: 'Apples',
          quantity: '5',
          added_by_user_id: users[0].id,
          is_completed: false
        },
        {
          list_id: lists[0].id,
          category_id: categories[1].id,
          name: 'Carrots',
          quantity: '1 bag',
          added_by_user_id: users[1].id,
          is_completed: true,
          completed_by_user_id: users[1].id,
          completed_at: new Date()
        }
      ])
      .execute();

    const input: GetCurrentWeekListInput = {
      couple_id: couple.id
    };

    const result = await getCurrentWeekList(input);
    
    expect(result).toHaveLength(2);
    
    // Check first item (Apples)
    const applesItem = result.find(item => item.name === 'Apples');
    expect(applesItem).toBeDefined();
    expect(applesItem!.list_id).toEqual(lists[0].id);
    expect(applesItem!.category_id).toEqual(categories[0].id);
    expect(applesItem!.quantity).toEqual('5');
    expect(applesItem!.is_completed).toBe(false);
    expect(applesItem!.added_by_user_id).toEqual(users[0].id);
    expect(applesItem!.completed_by_user_id).toBeNull();
    expect(applesItem!.category.name).toEqual('Fruits');
    expect(applesItem!.category.id).toEqual(categories[0].id);

    // Check second item (Carrots)
    const carrotsItem = result.find(item => item.name === 'Carrots');
    expect(carrotsItem).toBeDefined();
    expect(carrotsItem!.list_id).toEqual(lists[0].id);
    expect(carrotsItem!.category_id).toEqual(categories[1].id);
    expect(carrotsItem!.quantity).toEqual('1 bag');
    expect(carrotsItem!.is_completed).toBe(true);
    expect(carrotsItem!.added_by_user_id).toEqual(users[1].id);
    expect(carrotsItem!.completed_by_user_id).toEqual(users[1].id);
    expect(carrotsItem!.completed_at).toBeInstanceOf(Date);
    expect(carrotsItem!.category.name).toEqual('Vegetables');
    expect(carrotsItem!.category.id).toEqual(categories[1].id);
  });

  it('should not return items from previous week lists', async () => {
    const { users, couple, categories } = await createTestData();
    
    // Create previous week list (7 days ago)
    const previousWeekStart = new Date();
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const prevWeekDay = previousWeekStart.getDay();
    const daysToPrevMonday = prevWeekDay === 0 ? 6 : prevWeekDay - 1;
    previousWeekStart.setDate(previousWeekStart.getDate() - daysToPrevMonday);
    previousWeekStart.setHours(0, 0, 0, 0);

    const prevLists = await db.insert(groceryListsTable)
      .values({
        couple_id: couple.id,
        week_start: previousWeekStart.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    // Add item to previous week list
    await db.insert(groceryItemsTable)
      .values({
        list_id: prevLists[0].id,
        category_id: categories[0].id,
        name: 'Old Apples',
        added_by_user_id: users[0].id
      })
      .execute();

    // Create current week list
    const currentWeekStart = getCurrentWeekStart();
    const currentLists = await db.insert(groceryListsTable)
      .values({
        couple_id: couple.id,
        week_start: currentWeekStart
      })
      .returning()
      .execute();

    // Add item to current week list
    await db.insert(groceryItemsTable)
      .values({
        list_id: currentLists[0].id,
        category_id: categories[0].id,
        name: 'Fresh Apples',
        added_by_user_id: users[0].id
      })
      .execute();

    const input: GetCurrentWeekListInput = {
      couple_id: couple.id
    };

    const result = await getCurrentWeekList(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Fresh Apples');
    expect(result.some(item => item.name === 'Old Apples')).toBe(false);
  });

  it('should not return items from different couple', async () => {
    const { users, couple, categories } = await createTestData();
    
    // Create another couple
    const otherUsers = await db.insert(usersTable)
      .values([
        { name: 'User 3', email: 'user3@test.com' },
        { name: 'User 4', email: 'user4@test.com' }
      ])
      .returning()
      .execute();

    const otherCouples = await db.insert(couplesTable)
      .values({
        user1_id: otherUsers[0].id,
        user2_id: otherUsers[1].id
      })
      .returning()
      .execute();

    const currentWeekStart = getCurrentWeekStart();
    
    // Create lists for both couples
    const lists = await db.insert(groceryListsTable)
      .values([
        {
          couple_id: couple.id,
          week_start: currentWeekStart
        },
        {
          couple_id: otherCouples[0].id,
          week_start: currentWeekStart
        }
      ])
      .returning()
      .execute();

    // Add items to both lists
    await db.insert(groceryItemsTable)
      .values([
        {
          list_id: lists[0].id,
          category_id: categories[0].id,
          name: 'Couple 1 Apples',
          added_by_user_id: users[0].id
        },
        {
          list_id: lists[1].id,
          category_id: categories[0].id,
          name: 'Couple 2 Apples',
          added_by_user_id: otherUsers[0].id
        }
      ])
      .execute();

    const input: GetCurrentWeekListInput = {
      couple_id: couple.id
    };

    const result = await getCurrentWeekList(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Couple 1 Apples');
    expect(result.some(item => item.name === 'Couple 2 Apples')).toBe(false);
  });

  it('should handle items with null quantity and completion fields', async () => {
    const { users, couple, categories } = await createTestData();
    
    const currentWeekStart = getCurrentWeekStart();
    const lists = await db.insert(groceryListsTable)
      .values({
        couple_id: couple.id,
        week_start: currentWeekStart
      })
      .returning()
      .execute();

    // Add item with null quantity
    await db.insert(groceryItemsTable)
      .values({
        list_id: lists[0].id,
        category_id: categories[0].id,
        name: 'Bananas',
        quantity: null,
        added_by_user_id: users[0].id,
        is_completed: false
      })
      .execute();

    const input: GetCurrentWeekListInput = {
      couple_id: couple.id
    };

    const result = await getCurrentWeekList(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Bananas');
    expect(result[0].quantity).toBeNull();
    expect(result[0].completed_by_user_id).toBeNull();
    expect(result[0].completed_at).toBeNull();
    expect(result[0].is_completed).toBe(false);
  });
});
