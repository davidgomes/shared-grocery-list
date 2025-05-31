
import { type GetCurrentWeekListInput, type GroceryItem, type Category } from '../schema';

export type GroceryItemWithCategory = GroceryItem & {
  category: Category;
};

export declare function getCurrentWeekList(input: GetCurrentWeekListInput): Promise<GroceryItemWithCategory[]>;
