
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, couplesTable } from '../db/schema';
import { type CreateCoupleInput } from '../schema';
import { createCouple } from '../handlers/create_couple';
import { eq } from 'drizzle-orm';

describe('createCouple', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a couple with valid user IDs', async () => {
    // Create prerequisite users first
    const user1 = await db.insert(usersTable)
      .values({
        name: 'Alice',
        email: 'alice@example.com'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        name: 'Bob',
        email: 'bob@example.com'
      })
      .returning()
      .execute();

    const testInput: CreateCoupleInput = {
      user1_id: user1[0].id,
      user2_id: user2[0].id
    };

    const result = await createCouple(testInput);

    // Basic field validation
    expect(result.user1_id).toEqual(user1[0].id);
    expect(result.user2_id).toEqual(user2[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save couple to database', async () => {
    // Create prerequisite users
    const user1 = await db.insert(usersTable)
      .values({
        name: 'Charlie',
        email: 'charlie@example.com'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        name: 'Diana',
        email: 'diana@example.com'
      })
      .returning()
      .execute();

    const testInput: CreateCoupleInput = {
      user1_id: user1[0].id,
      user2_id: user2[0].id
    };

    const result = await createCouple(testInput);

    // Query database to verify couple was saved
    const couples = await db.select()
      .from(couplesTable)
      .where(eq(couplesTable.id, result.id))
      .execute();

    expect(couples).toHaveLength(1);
    expect(couples[0].user1_id).toEqual(user1[0].id);
    expect(couples[0].user2_id).toEqual(user2[0].id);
    expect(couples[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user1_id does not exist', async () => {
    // Create only user2
    const user2 = await db.insert(usersTable)
      .values({
        name: 'Eve',
        email: 'eve@example.com'
      })
      .returning()
      .execute();

    const testInput: CreateCoupleInput = {
      user1_id: 999, // Non-existent user ID
      user2_id: user2[0].id
    };

    await expect(createCouple(testInput)).rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should throw error when user2_id does not exist', async () => {
    // Create only user1
    const user1 = await db.insert(usersTable)
      .values({
        name: 'Frank',
        email: 'frank@example.com'
      })
      .returning()
      .execute();

    const testInput: CreateCoupleInput = {
      user1_id: user1[0].id,
      user2_id: 888 // Non-existent user ID
    };

    await expect(createCouple(testInput)).rejects.toThrow(/User with id 888 does not exist/i);
  });

  it('should throw error when both users do not exist', async () => {
    const testInput: CreateCoupleInput = {
      user1_id: 777, // Non-existent user ID
      user2_id: 666  // Non-existent user ID
    };

    await expect(createCouple(testInput)).rejects.toThrow(/User with id 777 does not exist/i);
  });
});
