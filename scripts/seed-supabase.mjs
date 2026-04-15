import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const branchesCatalog = [
  {
    name: 'Centaurus by Phoenix',
    address: 'Neopolis, Kokapet, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/eLc6bFX1byfZ9KE26',
  },
  {
    name: 'My Home Bhooja',
    address: 'Kokapet, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/mSR1RUn6RUR2WzPH7',
  },
  {
    name: 'Moosarambagh',
    address: 'Moosarambagh, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/NUF8sqSXNDC2n6YL8',
  },
  {
    name: 'Secunderabad',
    address: 'Secunderabad, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/FFBkFFUSr1qNwBeq8',
  },
  {
    name: 'GVK One Mall',
    address: 'Banjara Hills, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/1VerCU3S7T2uQmfS6',
  },
  {
    name: 'Yashoda Hospitals Hitech City',
    address: 'Hitech City, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/Vr1ZHNtGvXGomcHJ9',
  },
  {
    name: 'Qaffeine Bistro',
    address: 'Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/mLi6zaZXdrdVK2bg7',
  },
]

const menuCatalog = [
  { name: 'Nutella Butter Latte', category: 'Signature Beverages', price: 219, is_veg: true },
  { name: 'Nutmeg Dates Latte', category: 'Signature Beverages', price: 209, is_veg: true },
  { name: 'Berry Blast', category: 'Signature Beverages', price: 249, is_veg: true },
  { name: 'Dry Fruit Destruction', category: 'Signature Beverages', price: 249, is_veg: true },
  { name: 'Ferry Ferrero', category: 'Signature Beverages', price: 249, is_veg: true },
  { name: 'Great Indian Filter Coffee', category: 'Signature Beverages', price: 129, is_veg: true },

  { name: 'Solo Espresso', category: 'Hot Coffees', price: 79, is_veg: true },
  { name: 'Doppio Espresso', category: 'Hot Coffees', price: 99, is_veg: true },
  { name: 'Cortado', category: 'Hot Coffees', price: 109, is_veg: true },
  { name: 'Macchiato', category: 'Hot Coffees', price: 119, is_veg: true },
  { name: 'Americano', category: 'Hot Coffees', price: 159, is_veg: true },
  { name: 'Flat White', category: 'Hot Coffees', price: 209, is_veg: true },
  { name: 'Qaffeccino', category: 'Hot Coffees', price: 199, is_veg: true },
  { name: 'Qaffe Latte', category: 'Hot Coffees', price: 199, is_veg: true },
  { name: 'Qaffe Mocha', category: 'Hot Coffees', price: 199, is_veg: true },
  { name: 'Cappuccino', category: 'Hot Coffees', price: 169, is_veg: true },
  { name: 'Cafe Latte', category: 'Hot Coffees', price: 179, is_veg: true },
  { name: 'Cafe Mocha', category: 'Hot Coffees', price: 179, is_veg: true },
  { name: 'Affogato', category: 'Hot Coffees', price: 189, is_veg: true },
  { name: 'Bullet Latte', category: 'Hot Coffees', price: 239, is_veg: true },
  { name: 'Hot Chocolate', category: 'Hot Beverages', price: 219, is_veg: true },

  { name: 'Iced Espresso', category: 'Iced Coffees', price: 109, is_veg: true },
  { name: 'Iced Americano', category: 'Iced Coffees', price: 149, is_veg: true },
  { name: 'Classic Iced Latte', category: 'Iced Coffees', price: 189, is_veg: true },
  { name: 'Iced Bullet Latte', category: 'Iced Coffees', price: 249, is_veg: true },
  { name: 'Classic Latte', category: 'Iced Coffees', price: 209, is_veg: true },
  { name: 'Caramel Latte', category: 'Iced Coffees', price: 249, is_veg: true },
  { name: 'Cinnamon Latte', category: 'Iced Coffees', price: 249, is_veg: true },
  { name: 'Iced Mocha', category: 'Iced Coffees', price: 219, is_veg: true },
  { name: 'Classic Cold Coffee', category: 'Cold Coffees', price: 219, is_veg: true },
  { name: 'Vanilla Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Caramel Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Hazelnut Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Vegan Cold Coffee', category: 'Cold Coffees', price: 249, is_veg: true },
  { name: 'Mocha Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Crunchy Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Nutty Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Salted Caramel Cold Coffee', category: 'Cold Coffees', price: 249, is_veg: true },

  { name: 'Oreo Mania', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Nutella Shake', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Choco Loaded Brownie', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Strawberry Shake', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Crazy Kitkat', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Chocolate Crush', category: 'Milkshakes', price: 229, is_veg: true },

  { name: 'Mint Mojito', category: 'Mocktails', price: 209, is_veg: true },
  { name: 'Orange Mint', category: 'Mocktails', price: 209, is_veg: true },
  { name: 'Lychee Love', category: 'Mocktails', price: 229, is_veg: true },
  { name: 'Ginger Colada', category: 'Mocktails', price: 229, is_veg: true },
  { name: 'Jamun Kala Khatta', category: 'Mocktails', price: 229, is_veg: true },

  { name: 'Chai', category: 'Teas', price: 99, is_veg: true },
  { name: 'Natural Green Tea', category: 'Teas', price: 139, is_veg: true },
  { name: 'Detox Tea', category: 'Teas', price: 159, is_veg: true },
  { name: 'Rose Tea', category: 'Teas', price: 159, is_veg: true },
  { name: 'Lavender Chamomile Tea', category: 'Teas', price: 159, is_veg: true },
  { name: 'Peach Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Orange Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Honey Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Lemon Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Ginger Iced Tea', category: 'Teas', price: 209, is_veg: true },

  { name: 'Spinach Mais Triangolo', category: 'Quick Bites', price: 59, is_veg: true },
  { name: 'Malai Brocolli Puff', category: 'Quick Bites', price: 69, is_veg: true },
  { name: 'Mushroom Quiche', category: 'Quick Bites', price: 139, is_veg: true },
  { name: 'Grilled Paneer Hot Dog', category: 'Quick Bites', price: 199, is_veg: true },
  { name: 'Pesto Paneer Panini', category: 'Quick Bites', price: 199, is_veg: true },
  { name: 'Assorted Veg Sliders', category: 'Quick Bites', price: 199, is_veg: true },
  { name: 'Paneer Makhani Sub', category: 'Quick Bites', price: 209, is_veg: true },
  { name: 'Cheesy Mushroom', category: 'Quick Bites', price: 219, is_veg: true },
  { name: 'Chilli Paneer Sheermal', category: 'Quick Bites', price: 229, is_veg: true },
  { name: 'Saute Paneer Calzone', category: 'Quick Bites', price: 229, is_veg: true },
  { name: 'Chilli Chicken Puff', category: 'Quick Bites', price: 69, is_veg: false },
  { name: 'Chicken Triangolo', category: 'Quick Bites', price: 79, is_veg: false },
  { name: 'Chicken Keema Pav', category: 'Quick Bites', price: 149, is_veg: false },
  { name: 'Egg N Cheese Focassia', category: 'Quick Bites', price: 169, is_veg: false },
  { name: 'Tandori Chicken Hot Dog', category: 'Quick Bites', price: 219, is_veg: false },
  { name: 'Pesto Chicken Panini', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Assorted Chicken Sliders', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Spicy Pulled Chicken', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Cheesy Chicken Quiche', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Chicken Makhani Sub', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Malabary Chicken', category: 'Quick Bites', price: 239, is_veg: false },
  { name: 'Chicken Burito', category: 'Quick Bites', price: 249, is_veg: false },
  { name: 'Garlic Chicken Brioche', category: 'Quick Bites', price: 269, is_veg: false },

  { name: 'Paneer Wrap', category: 'Wraps', price: 209, is_veg: true },
  { name: 'Chicken Wrap', category: 'Wraps', price: 219, is_veg: false },
  { name: 'Farm Fresh Pizza (2 Slices)', category: 'Pizza', price: 149, is_veg: true },
  { name: 'Peri Peri Chicken Pizza', category: 'Pizza', price: 169, is_veg: false },

  { name: 'Tres Leches', category: 'Desserts', price: 89, is_veg: true },
  { name: 'Chocolate Brownie', category: 'Desserts', price: 149, is_veg: true },
  { name: 'Caramel Tre-Strato', category: 'Desserts', price: 179, is_veg: true },
  { name: 'Chocolate Doughnuts', category: 'Desserts', price: 149, is_veg: false },
  { name: 'Red Velvet Brownie', category: 'Desserts', price: 159, is_veg: false },
  { name: 'Choco Tre-Strato Pastry', category: 'Desserts', price: 189, is_veg: false },
  { name: 'Blueberry Pastry', category: 'Desserts', price: 199, is_veg: false },
  { name: 'Almond Milk Tre-Strato', category: 'Desserts', price: 199, is_veg: false },

  { name: 'Almond Muffin', category: 'Muffins', price: 119, is_veg: true },
  { name: 'Chocolava Muffin', category: 'Muffins', price: 119, is_veg: true },

  { name: 'Oat Cookie', category: 'Cookies', price: 69, is_veg: false },
  { name: 'Chocochip Cookie', category: 'Cookies', price: 79, is_veg: false },
  { name: 'Toffee Caramel Cookie', category: 'Cookies', price: 89, is_veg: false },
  { name: 'Newyork Choco Chip Cookie', category: 'Cookies', price: 129, is_veg: false },
  { name: 'Double Dark Choco Cookie', category: 'Cookies', price: 129, is_veg: false },

  { name: 'Marble Cake', category: 'Dry Cakes', price: 129, is_veg: false },
  { name: 'White Chocolate Tea Cake', category: 'Dry Cakes', price: 129, is_veg: false },
  { name: 'Lemon Loaf', category: 'Dry Cakes', price: 139, is_veg: false },
  { name: 'Banana Walnut Cake', category: 'Dry Cakes', price: 149, is_veg: false },
]

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function menuKey(item) {
  return `${normalize(item.category)}|${normalize(item.name)}|${Number(item.price || 0)}`
}

function slug(value) {
  return normalize(value).replace(/\s+/g, '-')
}

function chunk(list, size) {
  const output = []
  for (let i = 0; i < list.length; i += size) output.push(list.slice(i, i + size))
  return output
}

async function main() {
  const { data: existingBranches, error: branchesReadError } = await supabase
    .from('branches')
    .select('id, name')

  if (branchesReadError) {
    const message = String(branchesReadError.message || '')
    if (message.includes("Could not find the table 'public.branches'")) {
      throw new Error(
        "Supabase schema is missing 'public.branches'. Run migration file supabase/migrations/20260415_init_qaffeine.sql in Supabase SQL Editor first, then re-run: node --env-file=.env scripts/seed-supabase.mjs",
      )
    }
    throw new Error(`Unable to read branches: ${message}`)
  }

  const existingBranchNameSet = new Set((existingBranches || []).map((b) => normalize(b.name)))
  const missingBranches = branchesCatalog.filter((b) => !existingBranchNameSet.has(normalize(b.name)))

  if (missingBranches.length > 0) {
    const { error: branchInsertError } = await supabase.from('branches').insert(missingBranches)
    if (branchInsertError) {
      throw new Error(`Unable to insert branches: ${branchInsertError.message}`)
    }
  }

  const { data: existingItems, error: itemsReadError } = await supabase
    .from('menu_items')
    .select('name, category, price')

  if (itemsReadError) {
    throw new Error(`Unable to read menu_items: ${itemsReadError.message}`)
  }

  const existingMenuSet = new Set((existingItems || []).map(menuKey))

  const uniqueCatalog = []
  const seenCatalogKeys = new Set()
  for (const item of menuCatalog) {
    const key = menuKey(item)
    if (seenCatalogKeys.has(key)) continue
    seenCatalogKeys.add(key)
    uniqueCatalog.push(item)
  }

  const rowsToInsert = uniqueCatalog
    .filter((item) => !existingMenuSet.has(menuKey(item)))
    .map((item) => ({
      ...item,
      branch_id: null,
      description: 'House-crafted Qaffeine signature prepared fresh on order.',
      is_available: true,
      image_url: `https://picsum.photos/seed/${slug(`${item.category}-${item.name}`)}/400/400`,
      is_bestseller: ['Nutella Butter Latte', 'Berry Blast', 'Great Indian Filter Coffee'].includes(item.name),
    }))

  for (const part of chunk(rowsToInsert, 50)) {
    const { error: insertError } = await supabase.from('menu_items').insert(part)
    if (insertError) {
      throw new Error(`Unable to insert menu_items: ${insertError.message}`)
    }
  }

  const { count: branchCount, error: branchCountError } = await supabase
    .from('branches')
    .select('*', { count: 'exact', head: true })
  const { count: menuCount, error: menuCountError } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })

  if (branchCountError) {
    throw new Error(`Unable to count branches: ${branchCountError.message}`)
  }
  if (menuCountError) {
    throw new Error(`Unable to count menu_items: ${menuCountError.message}`)
  }

  console.log('Seeding complete')
  console.log(`Inserted branches: ${missingBranches.length}`)
  console.log(`Inserted menu items: ${rowsToInsert.length}`)
  console.log(`Total branches in DB: ${branchCount}`)
  console.log(`Total menu items in DB: ${menuCount}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
