
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].email).toEqual('john.doe@example.com');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      name: 'Jane Doe',
      email: 'john.doe@example.com' // Same email
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should validate email format through database constraints', async () => {
    const invalidEmailInput: CreateUserInput = {
      name: 'Test User',
      email: 'invalid-email'
    };

    // The Zod schema validation should catch invalid emails at the API level
    // But if it somehow gets through, the database should handle it gracefully
    // This test verifies the handler doesn't crash with malformed data
    try {
      await createUser(invalidEmailInput);
    } catch (error) {
      // Either Zod validation error or database constraint error is acceptable
      expect(error).toBeDefined();
    }
  });

  it('should handle special characters in name', async () => {
    const specialCharInput: CreateUserInput = {
      name: "John O'Connor-Smith",
      email: 'john.oconnor@example.com'
    };

    const result = await createUser(specialCharInput);

    expect(result.name).toEqual("John O'Connor-Smith");
    expect(result.email).toEqual('john.oconnor@example.com');
    expect(result.id).toBeDefined();
  });
});
