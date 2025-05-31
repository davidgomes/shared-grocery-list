
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Category, AddGroceryItemInput, GroceryList } from '../../server/src/schema';
import type { GroceryItemWithCategory } from '../../server/src/handlers/get_current_week_list';

// Default categories for offline functionality
const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Produce', created_at: new Date() },
  { id: 2, name: 'Dairy', created_at: new Date() },
  { id: 3, name: 'Meat', created_at: new Date() },
  { id: 4, name: 'Pantry', created_at: new Date() },
  { id: 5, name: 'Frozen', created_at: new Date() }
];

function App() {
  // Demo configuration - in a real app, these would come from authentication/context
  const COUPLE_ID = 1;
  const USER_ID = 1; // Current user ID (hardcoded for demo)

  const [groceryItems, setGroceryItems] = useState<GroceryItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentWeekList, setCurrentWeekList] = useState<GroceryList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [nextItemId, setNextItemId] = useState(1);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    quantity: string;
    category_id: number | null;
  }>({
    name: '',
    quantity: '',
    category_id: null
  });

  // Get current week start date (Monday)
  const getCurrentWeekStart = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, Monday is 1
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    return currentWeekStart;
  }, []);

  // Create offline current week list
  const createOfflineCurrentWeekList = useCallback((): GroceryList => {
    const weekStart = getCurrentWeekStart();
    return {
      id: 1,
      couple_id: COUPLE_ID,
      week_start: weekStart,
      created_at: new Date()
    };
  }, [getCurrentWeekStart]);

  // Load or create current week's grocery list
  const ensureCurrentWeekList = useCallback(async (): Promise<GroceryList> => {
    try {
      // First, try to get existing grocery lists for this couple
      const existingLists = await trpc.getGroceryLists.query({ coupleId: COUPLE_ID });
      const currentWeekStart = getCurrentWeekStart();
      
      // Look for a list that matches the current week
      const currentWeekStartStr = currentWeekStart.toISOString().split('T')[0];
      const existingCurrentWeekList = existingLists.find(list => {
        const listWeekStart = new Date(list.week_start).toISOString().split('T')[0];
        return listWeekStart === currentWeekStartStr;
      });

      if (existingCurrentWeekList) {
        return existingCurrentWeekList;
      }

      // If no current week list exists, create one
      const newList = await trpc.createGroceryList.mutate({
        couple_id: COUPLE_ID,
        week_start: currentWeekStart
      });

      return newList;
    } catch (error) {
      console.error('Backend unavailable, using offline mode:', error);
      setIsOfflineMode(true);
      // Return offline current week list
      return createOfflineCurrentWeekList();
    }
  }, [getCurrentWeekStart, createOfflineCurrentWeekList]);

  // Load grocery items for current week
  const loadGroceryItems = useCallback(async () => {
    try {
      setError(null);
      const result = await trpc.getCurrentWeekList.query({ couple_id: COUPLE_ID });
      setGroceryItems(result);
      setIsOfflineMode(false);
    } catch (error) {
      console.error('Backend unavailable for grocery items, using offline mode:', error);
      setIsOfflineMode(true);
      // Start with empty list for demo
      setGroceryItems([]);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
      setIsOfflineMode(false);
    } catch (error) {
      console.error('Backend unavailable for categories, using offline mode:', error);
      setIsOfflineMode(true);
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Load categories first (always needed)
        await loadCategories();
        
        // Ensure current week list exists and load items
        const weekList = await ensureCurrentWeekList();
        setCurrentWeekList(weekList);
        
        // Load current week's items
        await loadGroceryItems();
      } catch (error) {
        console.error('Failed to initialize data:', error);
        setError('Backend unavailable - running in offline mode');
        setIsOfflineMode(true);
        
        // Set up offline data
        setCategories(DEFAULT_CATEGORIES);
        setCurrentWeekList(createOfflineCurrentWeekList());
        setGroceryItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [loadCategories, ensureCurrentWeekList, loadGroceryItems, createOfflineCurrentWeekList]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category_id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure we have a current week list
      let weekList = currentWeekList;
      if (!weekList) {
        weekList = await ensureCurrentWeekList();
        setCurrentWeekList(weekList);
      }

      if (isOfflineMode) {
        // Offline implementation for functionality demonstration
        const selectedCategory = categories.find(cat => cat.id === formData.category_id);
        if (!selectedCategory) throw new Error('Category not found');

        const newItem: GroceryItemWithCategory = {
          id: nextItemId,
          list_id: weekList.id,
          category_id: formData.category_id,
          name: formData.name.trim(),
          quantity: formData.quantity.trim() || null,
          is_completed: false,
          added_by_user_id: USER_ID,
          completed_by_user_id: null,
          created_at: new Date(),
          completed_at: null,
          category: selectedCategory
        };

        setGroceryItems((prev: GroceryItemWithCategory[]) => [...prev, newItem]);
        setNextItemId(prev => prev + 1);
      } else {
        // Backend implementation
        const newItemInput: AddGroceryItemInput = {
          list_id: weekList.id, // Use the dynamic list ID
          category_id: formData.category_id,
          name: formData.name.trim(),
          quantity: formData.quantity.trim() || null,
          added_by_user_id: USER_ID
        };

        await trpc.addGroceryItem.mutate(newItemInput);
        
        // Reload items to get the updated list
        await loadGroceryItems();
      }
      
      // Reset form
      setFormData({
        name: '',
        quantity: '',
        category_id: null
      });
    } catch (error) {
      console.error('Failed to add grocery item:', error);
      setError('Failed to add item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (itemId: number) => {
    try {
      if (isOfflineMode) {
        // Offline implementation
        setGroceryItems((prev: GroceryItemWithCategory[]) =>
          prev.map((item: GroceryItemWithCategory) =>
            item.id === itemId
              ? { 
                  ...item, 
                  is_completed: !item.is_completed, 
                  completed_by_user_id: item.is_completed ? null : USER_ID,
                  completed_at: item.is_completed ? null : new Date()
                }
              : item
          )
        );
      } else {
        // Backend implementation
        await trpc.toggleItemCompletion.mutate({
          item_id: itemId,
          user_id: USER_ID
        });
        
        // Update local state optimistically
        setGroceryItems((prev: GroceryItemWithCategory[]) =>
          prev.map((item: GroceryItemWithCategory) =>
            item.id === itemId
              ? { ...item, is_completed: !item.is_completed, completed_by_user_id: item.is_completed ? null : USER_ID }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle item completion:', error);
      setError('Failed to update item. Please try again.');
      if (!isOfflineMode) {
        // Reload items on error to sync with server state
        loadGroceryItems();
      }
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      if (isOfflineMode) {
        // Offline implementation
        setGroceryItems((prev: GroceryItemWithCategory[]) =>
          prev.filter((item: GroceryItemWithCategory) => item.id !== itemId)
        );
      } else {
        // Backend implementation
        await trpc.removeGroceryItem.mutate({ item_id: itemId });
        
        // Remove from local state
        setGroceryItems((prev: GroceryItemWithCategory[]) =>
          prev.filter((item: GroceryItemWithCategory) => item.id !== itemId)
        );
      }
    } catch (error) {
      console.error('Failed to remove grocery item:', error);
      setError('Failed to remove item. Please try again.');
      if (!isOfflineMode) {
        // Reload items on error to sync with server state
        loadGroceryItems();
      }
    }
  };

  // Group items by category
  const itemsByCategory = groceryItems.reduce((acc, item) => {
    const categoryName = item.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, GroceryItemWithCategory[]>);

  const completedCount = groceryItems.filter(item => item.is_completed).length;
  const totalCount = groceryItems.length;

  // Format current week date range for display
  const getCurrentWeekDisplayText = () => {
    if (!currentWeekList) return '';
    
    const weekStart = new Date(currentWeekList.week_start);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">🛒 Grocery List</h1>
          <p>Loading your grocery list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🛒 Our Grocery List</h1>
        <p className="text-muted-foreground mb-2">Plan your weekly shopping together</p>
        {currentWeekList && (
          <p className="text-sm text-muted-foreground mb-4">{getCurrentWeekDisplayText()}</p>
        )}
        
        {/* Demo/Backend status indicator */}
        <div className="mb-4 space-y-2">
          <Badge variant="outline" className="text-xs">
            Demo Mode - User ID: {USER_ID} | Couple ID: {COUPLE_ID}
          </Badge>
          {isOfflineMode && (
            <Badge variant="secondary" className="text-xs ml-2">
              🔧 Offline Mode (Backend Unavailable)
            </Badge>
          )}
        </div>
        
        {totalCount > 0 && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <Badge variant={completedCount === totalCount ? "default" : "secondary"}>
              {completedCount}/{totalCount} completed
            </Badge>
            <div className="w-32 bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertDescription className="text-orange-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Add Item Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Item name (e.g., Bananas)"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                required
              />
              
              <Input
                placeholder="Quantity (e.g., 2 lbs, 1 dozen)"
                value={formData.quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, quantity: e.target.value }))
                }
              />
              
              <Select
                value={formData.category_id?.toString() || ''}
                onValueChange={(value: string) =>
                  setFormData(prev => ({ ...prev, category_id: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name.trim() || !formData.category_id}
            >
              {isSubmitting ? 'Adding...' : '➕ Add Item'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Grocery Items by Category */}
      {totalCount === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-semibold mb-2">Your list is empty</h3>
            <p className="text-muted-foreground">Add your first grocery item above to get started!</p>
            {isOfflineMode && (
              <p className="text-sm text-orange-600 mt-4">
                Currently running in offline mode - try adding items to see the functionality!
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([categoryName, items]) => (
            <Card key={categoryName}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{categoryName}</span>
                  <Badge variant="outline">
                    {items.filter(item => item.is_completed).length}/{items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item: GroceryItemWithCategory, index: number) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            checked={item.is_completed}
                            onCheckedChange={() => handleToggleComplete(item.id)}
                          />
                          <div className={`flex-1 ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            <div className="font-medium">{item.name}</div>
                            {item.quantity && (
                              <div className="text-sm text-muted-foreground">{item.quantity}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {item.is_completed && (
                            <Badge variant="secondary" className="text-xs">
                              ✅ Done
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                      {index < items.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer with demo information */}
      <Card className="mt-8 bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Demo Features:</strong> This app demonstrates dynamic weekly grocery list management.
            </p>
            <p className="mb-2">
              ✅ Dynamic current week list creation (calculated from Monday start)<br/>
              ✅ Proper list_id handling based on current week<br/>
              ✅ Category-based item organization<br/>
              ✅ Real-time completion tracking
            </p>
            {isOfflineMode ? (
              <p className="text-orange-600">
                Currently running in offline mode due to backend unavailability. 
                All functionality works - try adding, completing, and removing items!
              </p>
            ) : (
              <p>
                Connected to backend - all data is persisted and shared between users.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
