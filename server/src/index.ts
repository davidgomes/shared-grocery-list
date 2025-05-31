
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

import { 
  createUserInputSchema,
  createCoupleInputSchema,
  createCategoryInputSchema,
  createGroceryListInputSchema,
  addGroceryItemInputSchema,
  toggleItemCompletionInputSchema,
  removeGroceryItemInputSchema,
  getCurrentWeekListInputSchema
} from './schema';

import { createUser } from './handlers/create_user';
import { createCouple } from './handlers/create_couple';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createGroceryList } from './handlers/create_grocery_list';
import { addGroceryItem } from './handlers/add_grocery_item';
import { toggleItemCompletion } from './handlers/toggle_item_completion';
import { removeGroceryItem } from './handlers/remove_grocery_item';
import { getCurrentWeekList } from './handlers/get_current_week_list';
import { getGroceryLists } from './handlers/get_grocery_lists';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  // Couple management
  createCouple: publicProcedure
    .input(createCoupleInputSchema)
    .mutation(({ input }) => createCouple(input)),
  
  // Category management
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  
  getCategories: publicProcedure
    .query(() => getCategories()),
  
  // Grocery list management
  createGroceryList: publicProcedure
    .input(createGroceryListInputSchema)
    .mutation(({ input }) => createGroceryList(input)),
  
  getGroceryLists: publicProcedure
    .input(z.object({ coupleId: z.number() }))
    .query(({ input }) => getGroceryLists(input.coupleId)),
  
  // Grocery item management
  addGroceryItem: publicProcedure
    .input(addGroceryItemInputSchema)
    .mutation(({ input }) => addGroceryItem(input)),
  
  toggleItemCompletion: publicProcedure
    .input(toggleItemCompletionInputSchema)
    .mutation(({ input }) => toggleItemCompletion(input)),
  
  removeGroceryItem: publicProcedure
    .input(removeGroceryItemInputSchema)
    .mutation(({ input }) => removeGroceryItem(input)),
  
  getCurrentWeekList: publicProcedure
    .input(getCurrentWeekListInputSchema)
    .query(({ input }) => getCurrentWeekList(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
