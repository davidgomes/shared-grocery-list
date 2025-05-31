
import { db } from '../db';
import { couplesTable, usersTable } from '../db/schema';
import { type CreateCoupleInput, type Couple } from '../schema';
import { eq } from 'drizzle-orm';

export const createCouple = async (input: CreateCoupleInput): Promise<Couple> => {
  try {
    // Verify both users exist
    const user1 = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user1_id))
      .execute();

    const user2 = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user2_id))
      .execute();

    if (user1.length === 0) {
      throw new Error(`User with id ${input.user1_id} does not exist`);
    }

    if (user2.length === 0) {
      throw new Error(`User with id ${input.user2_id} does not exist`);
    }

    // Insert couple record
    const result = await db.insert(couplesTable)
      .values({
        user1_id: input.user1_id,
        user2_id: input.user2_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Couple creation failed:', error);
    throw error;
  }
};
