
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCategoryInput = {
  name: 'Fruits'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Fruits');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.id).toBe('number');
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Fruits');
    expect(categories[0].id).toEqual(result.id);
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple categories with different names', async () => {
    const category1 = await createCategory({ name: 'Vegetables' });
    const category2 = await createCategory({ name: 'Dairy' });

    expect(category1.name).toEqual('Vegetables');
    expect(category2.name).toEqual('Dairy');
    expect(category1.id).not.toEqual(category2.id);

    // Verify both are saved in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    const names = allCategories.map(cat => cat.name).sort();
    expect(names).toEqual(['Dairy', 'Vegetables']);
  });

  it('should handle category name with special characters', async () => {
    const specialInput: CreateCategoryInput = {
      name: 'Meat & Seafood'
    };

    const result = await createCategory(specialInput);

    expect(result.name).toEqual('Meat & Seafood');

    // Verify it's saved correctly
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].name).toEqual('Meat & Seafood');
  });
});
