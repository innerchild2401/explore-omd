'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

interface MenuItem {
  id: string;
  restaurant_id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  available: boolean;
  allergens: string[];
  order_index: number;
  category_id?: string | null;
}

interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

interface MenuManagerProps {
  restaurantId: string;
  businessId: string;
  onUpdate: () => void;
}

const defaultCategorySuggestions = [
  'Appetizers',
  'Main Courses',
  'Desserts',
  'Beverages',
  'Salads',
  'Soups',
  'Sides',
  'Specials',
  'Kids Menu',
];

export default function MenuManager({ restaurantId, businessId, onUpdate }: MenuManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    available: true,
    allergens: [] as string[],
  });

  const commonAllergens = [
    'Nuts',
    'Dairy',
    'Gluten',
    'Soy',
    'Eggs',
    'Fish',
    'Shellfish',
    'Sesame',
  ];

  const categoryOptions = useMemo(() => {
    const activeNames = menuCategories.map((cat) => cat.name);
    const suggestions = defaultCategorySuggestions.filter(
      (name) => !activeNames.some((existing) => existing.toLowerCase() === name.toLowerCase()),
    );
    return [...activeNames, ...suggestions];
  }, [menuCategories]);

  const fetchMenuData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: itemsData, error: itemsError }, { data: categoriesData, error: categoriesError }] =
        await Promise.all([
          supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', businessId)
            .order('category')
            .order('order_index'),
          supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('display_order'),
        ]);

      if (itemsError) throw itemsError;
      if (categoriesError) throw categoriesError;

      let categories = (categoriesData || []).filter((cat) => cat.is_active ?? true);

      const uniqueItemCategories = Array.from(
        new Set((itemsData || []).map((item) => item.category).filter(Boolean)),
      );

      const missingCategories = uniqueItemCategories.filter(
        (name) => !categories.some((cat) => cat.name === name),
      );

      if (missingCategories.length > 0) {
        const { data: insertedCategories, error: insertError } = await supabase
          .from('menu_categories')
          .insert(
            missingCategories.map((name, index) => ({
              restaurant_id: restaurantId,
              name,
              display_order: (categories.length ?? 0) + index,
              is_active: true,
            })),
          )
          .select('*');

        if (insertError) throw insertError;
        categories = [...categories, ...(insertedCategories ?? [])];
      }

      categories.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      setMenuCategories(categories);
      setCategoryEdits(Object.fromEntries(categories.map((cat) => [cat.id, cat.name])));
      setMenuItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, restaurantId, supabase]);

  useEffect(() => {
    void fetchMenuData();
  }, [fetchMenuData, restaurantId]);

  const getOrCreateCategory = useCallback(
    async (rawName: string) => {
      const trimmed = rawName.trim();
      if (!trimmed) {
        throw new Error('Category name is required.');
      }

      const existing = menuCategories.find(
        (cat) => cat.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name: trimmed,
          display_order: menuCategories.length,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) throw error;

      setMenuCategories((prev) => {
        const next = [...prev, data].sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
        );
        setCategoryEdits(Object.fromEntries(next.map((cat) => [cat.id, cat.name])));
        return next;
      });

      return data;
    },
    [menuCategories, restaurantId, supabase],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const categoryRecord = await getOrCreateCategory(formData.category);

      const cleanPrice = Number.parseFloat(formData.price);
      if (Number.isNaN(cleanPrice)) {
        throw new Error('Please enter a valid price.');
      }

      const menuItemData = {
        restaurant_id: businessId,
        category: categoryRecord.name,
        category_id: categoryRecord.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: cleanPrice,
        image_url: formData.image_url || null,
        available: formData.available,
        allergens: formData.allergens,
        order_index: editingItem ? editingItem.order_index : menuItems.length,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(menuItemData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_items').insert(menuItemData);
        if (error) throw error;
      }

      resetForm();
      await fetchMenuData();
      onUpdate();
    } catch (error) {
      console.error('Error saving menu item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
      await fetchMenuData();
      onUpdate();
    } catch (error) {
      console.error('Error deleting menu item:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      name: '',
      description: '',
      price: '',
      image_url: '',
      available: true,
      allergens: [],
    });
    setIsAddingItem(false);
    setEditingItem(null);
  };

  const startEdit = (item: MenuItem) => {
    setFormData({
      category: item.category,
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image_url: item.image_url || '',
      available: item.available,
      allergens: item.allergens || [],
    });
    setEditingItem(item);
    setIsAddingItem(true);
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allergens: checked
        ? [...prev.allergens, allergen]
        : prev.allergens.filter((a) => a !== allergen),
    }));
  };

  const groupedItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  const orderedCategoryNames = useMemo(() => {
    const primary = menuCategories.map((cat) => cat.name);
    const secondary = Object.keys(groupedItems)
      .filter((name) => !primary.includes(name))
      .sort((a, b) => a.localeCompare(b));
    return [...primary, ...secondary];
  }, [menuCategories, groupedItems]);

  const handleCategoryNameInput = (categoryId: string, value: string) => {
    setCategoryEdits((prev) => ({ ...prev, [categoryId]: value }));
  };

  const handleSaveCategoryName = async (categoryId: string) => {
    const original = menuCategories.find((cat) => cat.id === categoryId);
    if (!original) return;

    const desired = (categoryEdits[categoryId] ?? original.name).trim();
    if (!desired || desired === original.name) return;

    if (
      menuCategories.some(
        (cat) => cat.id !== categoryId && cat.name.toLowerCase() === desired.toLowerCase(),
      )
    ) {
      alert('A category with this name already exists.');
      return;
    }

    try {
      await supabase.from('menu_categories').update({ name: desired }).eq('id', categoryId);
      await supabase
        .from('menu_items')
        .update({ category: desired, category_id: categoryId })
        .eq('restaurant_id', businessId)
        .eq('category', original.name);

      await fetchMenuData();
      onUpdate();
    } catch (error) {
      console.error('Error renaming category:', error);
    }
  };

  const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const index = menuCategories.findIndex((cat) => cat.id === categoryId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= menuCategories.length) return;

    const reordered = [...menuCategories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const updates = reordered.map((cat, idx) => ({
      id: cat.id,
      restaurant_id: restaurantId,
      display_order: idx,
    }));

    try {
      setMenuCategories((prev) =>
        reordered.map((cat, idx) => ({ ...cat, display_order: idx })),
      );
      for (const payload of updates) {
        await supabase.from('menu_categories').update({ display_order: payload.display_order }).eq('id', payload.id);
      }
      await fetchMenuData();
      onUpdate();
    } catch (error) {
      console.error('Error reordering categories:', error);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (
      menuCategories.some((cat) => cat.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      alert('Category already exists.');
      return;
    }

    try {
      await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name: trimmed,
          display_order: menuCategories.length,
          is_active: true,
        });
      setNewCategoryName('');
      await fetchMenuData();
      onUpdate();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading menu items...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
          <p className="text-gray-600">Organise your restaurant&apos;s dishes and categories</p>
        </div>
        <button
          onClick={() => setIsAddingItem(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          Add Menu Item
        </button>
      </div>

      {/* Category Management */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Menu Categories</h3>
            <p className="text-sm text-gray-600">
              Rename or rearrange categories to control how your menu appears.
            </p>
          </div>
          <button
            onClick={() => setIsManagingCategories((prev) => !prev)}
            className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            {isManagingCategories ? 'Done' : 'Organise'}
          </button>
        </div>

        {isManagingCategories && (
          <div className="mt-5 space-y-4">
            {menuCategories.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                No categories yet. Add your first category below.
              </p>
            )}

            {menuCategories.map((category, index) => {
              const currentName = categoryEdits[category.id] ?? category.name;
              const isDirty = currentName.trim() !== category.name;

              return (
                <div
                  key={category.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm md:flex-row md:items-center md:gap-4"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-500 shadow">
                      {index + 1}
                    </span>
                    <input
                      value={currentName}
                      onChange={(e) => handleCategoryNameInput(category.id, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleMoveCategory(category.id, 'up')}
                      disabled={index === 0}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveCategory(category.id, 'down')}
                      disabled={index === menuCategories.length - 1}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleSaveCategoryName(category.id)}
                      disabled={!isDirty}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Add a new category (e.g. Brunch)"
                className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={handleAddCategory}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
              >
                Add Category
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAddingItem && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h3>
          <p className="mt-1 text-sm text-gray-600">All prices are shown in RON.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <input
                  list="menu-category-suggestions"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. Appetizers"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <datalist id="menu-category-suggestions">
                  {categoryOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                  Item Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="price" className="mb-1 block text-sm font-medium text-gray-700">
                  Price (RON) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
                    RON
                  </span>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    step="0.01"
                    min="0"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-12 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="image_url" className="mb-1 block text-sm font-medium text-gray-700">
                  Image URL
                </label>
                <input
                  type="url"
                  id="image_url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/dish.jpg"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Allergens</label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {commonAllergens.map((allergen) => (
                  <label key={allergen} className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.allergens.includes(allergen)}
                      onChange={(e) => handleAllergenChange(allergen, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">{allergen}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="available"
                name="available"
                checked={formData.available}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, available: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="available" className="ml-2 text-sm text-gray-700">
                Available for ordering
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Saving…' : editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Menu Items List */}
      <div className="space-y-6">
        {orderedCategoryNames.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow">
            <h3 className="text-lg font-semibold text-gray-900">No menu items yet</h3>
            <p className="mt-2 text-gray-600">Start building your menu by adding your first item.</p>
            <button
              onClick={() => setIsAddingItem(true)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          orderedCategoryNames.map((category) => {
            const items = groupedItems[category] || [];
            return (
              <div key={category} className="rounded-lg border border-gray-200 bg-white shadow">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                    <p className="text-sm text-gray-600">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, category }));
                      setIsAddingItem(true);
                    }}
                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    Add Item
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-gray-500">
                    No items in this category yet. Add your first dish above.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <div key={item.id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <h4 className="text-lg font-semibold text-gray-900 break-words">
                              {item.name}
                            </h4>
                            {!item.available && (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                                Unavailable
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="mt-2 text-sm text-gray-600 break-words">
                              {item.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                              {formatPrice(item.price ?? 0, 'RON')}
                            </span>
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Contains:
                                </span>
                                {item.allergens.map((allergen) => (
                                  <span
                                    key={allergen}
                                    className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-medium text-orange-800"
                                  >
                                    {allergen}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
