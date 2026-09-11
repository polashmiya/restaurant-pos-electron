import type { Category, DiningTable, LocalizedText, MenuItem } from '@/types';
import { getBundledMenuImage } from './imageCredits';

/* ==========================================================================
   DEMO / SEED DATA
   Used on first launch (when no data exists) and by "Reset demo data".
   It never overwrites existing user data during a normal start.
   ========================================================================== */

export function createSeedCategories(): Category[] {
  return [
    { id: 'cat-appetizers', name: { bn: 'এপেটাইজার', en: 'Appetizers' }, icon: 'appetizer', color: 'orange', sortOrder: 1 },
    { id: 'cat-main-course', name: { bn: 'প্রধান খাবার', en: 'Main Course' }, icon: 'main', color: 'red', sortOrder: 2 },
    { id: 'cat-pizza', name: { bn: 'পিজ্জা', en: 'Pizza' }, icon: 'pizza', color: 'amber', sortOrder: 3 },
    { id: 'cat-burgers', name: { bn: 'বার্গার', en: 'Burgers' }, icon: 'burger', color: 'pink', sortOrder: 4 },
    { id: 'cat-rice-noodles', name: { bn: 'ভাত ও নুডলস', en: 'Rice & Noodles' }, icon: 'rice', color: 'green', sortOrder: 5 },
    { id: 'cat-kebab-grill', name: { bn: 'কাবাব ও গ্রিল', en: 'Kebab & Grill' }, icon: 'grill', color: 'violet', sortOrder: 6 },
    { id: 'cat-beverages', name: { bn: 'পানীয়', en: 'Beverages' }, icon: 'beverage', color: 'blue', sortOrder: 7 },
    { id: 'cat-desserts', name: { bn: 'ডেজার্ট', en: 'Desserts' }, icon: 'dessert', color: 'teal', sortOrder: 8 },
  ];
}

interface SeedItem {
  code: string;
  categoryId: string;
  name: LocalizedText;
  description?: LocalizedText;
  price: number;
  preparationTime?: number;
  isAvailable?: boolean;
}

const SEED_ITEMS: SeedItem[] = [
  // Appetizers
  {
    code: 'APP-001',
    categoryId: 'cat-appetizers',
    name: { bn: 'চিকেন উইংস', en: 'Chicken Wings' },
    description: { bn: 'মশলাদার ক্রিস্পি চিকেন উইংস (৬ পিস)', en: 'Spicy crispy chicken wings (6 pcs)' },
    price: 320,
    preparationTime: 15,
  },
  {
    code: 'APP-002',
    categoryId: 'cat-appetizers',
    name: { bn: 'ফ্রেঞ্চ ফ্রাই', en: 'French Fries' },
    description: { bn: 'লবণ মাখানো মুচমুচে আলু ভাজা', en: 'Crispy salted potato fries' },
    price: 150,
    preparationTime: 8,
  },
  {
    code: 'APP-003',
    categoryId: 'cat-appetizers',
    name: { bn: 'চিকেন নাগেটস', en: 'Chicken Nuggets' },
    description: { bn: '৮ পিস নাগেটস, ডিপ সস সহ', en: '8 pcs nuggets with dipping sauce' },
    price: 260,
    preparationTime: 10,
  },
  {
    code: 'APP-004',
    categoryId: 'cat-appetizers',
    name: { bn: 'ভেজিটেবল স্প্রিং রোল', en: 'Vegetable Spring Roll' },
    description: { bn: '৪ পিস মুচমুচে সবজির রোল', en: '4 pcs crispy vegetable rolls' },
    price: 180,
    preparationTime: 10,
  },
  {
    code: 'APP-005',
    categoryId: 'cat-appetizers',
    name: { bn: 'থাই স্যুপ', en: 'Thai Soup' },
    description: { bn: 'চিকেন ও চিংড়ি দিয়ে টক-ঝাল স্যুপ', en: 'Hot & sour soup with chicken and prawn' },
    price: 280,
    preparationTime: 12,
  },
  {
    code: 'APP-006',
    categoryId: 'cat-appetizers',
    name: { bn: 'প্রন টেম্পুরা', en: 'Prawn Tempura' },
    description: { bn: '৬ পিস ক্রিস্পি চিংড়ি', en: '6 pcs crispy battered prawns' },
    price: 420,
    preparationTime: 15,
    isAvailable: false,
  },
  {
    code: 'APP-007',
    categoryId: 'cat-appetizers',
    name: { bn: 'সিজার সালাদ', en: 'Caesar Salad' },
    description: { bn: 'গ্রিলড চিকেন, লেটুস ও পারমেজান চিজ', en: 'Grilled chicken, lettuce and parmesan' },
    price: 350,
    preparationTime: 8,
  },

  // Main course
  {
    code: 'MAIN-001',
    categoryId: 'cat-main-course',
    name: { bn: 'বাটার চিকেন', en: 'Butter Chicken' },
    description: { bn: 'মাখন ও টমেটোর ক্রিমি গ্রেভিতে চিকেন', en: 'Chicken in a creamy tomato-butter gravy' },
    price: 380,
    preparationTime: 20,
  },
  {
    code: 'MAIN-002',
    categoryId: 'cat-main-course',
    name: { bn: 'বিফ ভুনা', en: 'Beef Bhuna' },
    description: { bn: 'ঘন মশলায় রান্না করা গরুর মাংস', en: 'Beef slow-cooked in thick spices' },
    price: 420,
    preparationTime: 20,
  },
  {
    code: 'MAIN-003',
    categoryId: 'cat-main-course',
    name: { bn: 'মাটন রেজালা', en: 'Mutton Rezala' },
    description: { bn: 'দই ও কাজুবাদামের গ্রেভিতে খাসির মাংস', en: 'Mutton in a yogurt and cashew gravy' },
    price: 520,
    preparationTime: 25,
  },
  {
    code: 'MAIN-004',
    categoryId: 'cat-main-course',
    name: { bn: 'ইলিশ ভাজা', en: 'Fried Hilsa' },
    description: { bn: 'সরিষার তেলে ভাজা ইলিশ (২ পিস)', en: 'Hilsa fried in mustard oil (2 pcs)' },
    price: 450,
    preparationTime: 15,
  },
  {
    code: 'MAIN-005',
    categoryId: 'cat-main-course',
    name: { bn: 'চিকেন রোস্ট', en: 'Chicken Roast' },
    description: { bn: 'বিয়েবাড়ির স্বাদের রোস্ট (১ পিস)', en: 'Wedding-style chicken roast (1 pc)' },
    price: 280,
    preparationTime: 15,
  },
  {
    code: 'MAIN-006',
    categoryId: 'cat-main-course',
    name: { bn: 'মিক্সড সবজি', en: 'Mixed Vegetables' },
    description: { bn: 'মৌসুমি সবজির তরকারি', en: 'Seasonal vegetable curry' },
    price: 220,
    preparationTime: 12,
  },

  // Pizza
  {
    code: 'PIZ-001',
    categoryId: 'cat-pizza',
    name: { bn: 'মার্গারিটা পিজ্জা', en: 'Margherita Pizza' },
    description: { bn: 'টমেটো সস, মোজারেলা ও বেসিল (১০ ইঞ্চি)', en: 'Tomato sauce, mozzarella and basil (10")' },
    price: 650,
    preparationTime: 20,
  },
  {
    code: 'PIZ-002',
    categoryId: 'cat-pizza',
    name: { bn: 'চিকেন পিজ্জা', en: 'Chicken Pizza' },
    description: { bn: 'মশলাদার চিকেন ও ক্যাপসিকাম (১০ ইঞ্চি)', en: 'Spiced chicken and capsicum (10")' },
    price: 750,
    preparationTime: 20,
  },
  {
    code: 'PIZ-003',
    categoryId: 'cat-pizza',
    name: { bn: 'বিফ পেপারনি পিজ্জা', en: 'Beef Pepperoni Pizza' },
    description: { bn: 'বিফ পেপারনি ও মোজারেলা (১০ ইঞ্চি)', en: 'Beef pepperoni and mozzarella (10")' },
    price: 850,
    preparationTime: 20,
  },
  {
    code: 'PIZ-004',
    categoryId: 'cat-pizza',
    name: { bn: 'বারবিকিউ চিকেন পিজ্জা', en: 'BBQ Chicken Pizza' },
    description: { bn: 'বারবিকিউ সস, চিকেন ও পেঁয়াজ (১০ ইঞ্চি)', en: 'BBQ sauce, chicken and onion (10")' },
    price: 800,
    preparationTime: 20,
  },
  {
    code: 'PIZ-005',
    categoryId: 'cat-pizza',
    name: { bn: 'সি ফুড পিজ্জা', en: 'Seafood Pizza' },
    description: { bn: 'চিংড়ি, স্কুইড ও মোজারেলা (১০ ইঞ্চি)', en: 'Prawn, squid and mozzarella (10")' },
    price: 950,
    preparationTime: 25,
    isAvailable: false,
  },

  // Burgers
  {
    code: 'BUR-001',
    categoryId: 'cat-burgers',
    name: { bn: 'চিকেন বার্গার', en: 'Chicken Burger' },
    description: { bn: 'গ্রিলড চিকেন দিয়ে তৈরি বার্গার', en: 'Burger made with grilled chicken' },
    price: 250,
    preparationTime: 12,
  },
  {
    code: 'BUR-002',
    categoryId: 'cat-burgers',
    name: { bn: 'বিফ বার্গার', en: 'Beef Burger' },
    description: { bn: 'জুসি বিফ প্যাটি, চিজ ও পেঁয়াজ', en: 'Juicy beef patty with cheese and onion' },
    price: 320,
    preparationTime: 12,
  },
  {
    code: 'BUR-003',
    categoryId: 'cat-burgers',
    name: { bn: 'ডাবল চিজ বার্গার', en: 'Double Cheese Burger' },
    description: { bn: 'দুটি বিফ প্যাটি ও দ্বিগুণ চিজ', en: 'Two beef patties with double cheese' },
    price: 420,
    preparationTime: 15,
  },
  {
    code: 'BUR-004',
    categoryId: 'cat-burgers',
    name: { bn: 'ক্রিস্পি চিকেন বার্গার', en: 'Crispy Chicken Burger' },
    description: { bn: 'মুচমুচে ফ্রাইড চিকেন ফিলে', en: 'Crunchy fried chicken fillet' },
    price: 280,
    preparationTime: 12,
  },
  {
    code: 'BUR-005',
    categoryId: 'cat-burgers',
    name: { bn: 'মাশরুম সুইস বার্গার', en: 'Mushroom Swiss Burger' },
    description: { bn: 'বিফ প্যাটি, মাশরুম ও সুইস চিজ', en: 'Beef patty, mushrooms and Swiss cheese' },
    price: 380,
    preparationTime: 15,
  },

  // Rice & noodles
  {
    code: 'RICE-001',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'চিকেন বিরিয়ানি', en: 'Chicken Biryani' },
    description: { bn: 'সুগন্ধি চালে রান্না করা চিকেন বিরিয়ানি', en: 'Fragrant rice cooked with chicken' },
    price: 320,
    preparationTime: 10,
  },
  {
    code: 'RICE-002',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'কাচ্চি বিরিয়ানি', en: 'Kacchi Biryani' },
    description: { bn: 'খাসির মাংস ও আলু দিয়ে পুরান ঢাকার কাচ্চি', en: 'Old Dhaka style mutton kacchi with potato' },
    price: 450,
    preparationTime: 10,
  },
  {
    code: 'RICE-003',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'চিকেন ফ্রাইড রাইস', en: 'Chicken Fried Rice' },
    description: { bn: 'ডিম, সবজি ও চিকেন দিয়ে ফ্রাইড রাইস', en: 'Fried rice with egg, vegetables and chicken' },
    price: 280,
    preparationTime: 12,
  },
  {
    code: 'RICE-004',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'চিকেন চাওমিন', en: 'Chicken Chow Mein' },
    description: { bn: 'সবজি ও চিকেন দিয়ে নুডলস', en: 'Stir-fried noodles with chicken and vegetables' },
    price: 260,
    preparationTime: 12,
  },
  {
    code: 'RICE-005',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'মোরগ পোলাও', en: 'Morog Polao' },
    description: { bn: 'ঘি-এর পোলাও ও মুরগির কোরমা', en: 'Ghee polao with chicken korma' },
    price: 380,
    preparationTime: 10,
  },
  {
    code: 'RICE-006',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'বিফ তেহারি', en: 'Beef Tehari' },
    description: { bn: 'সরিষার তেলে রান্না করা গরুর মাংসের তেহারি', en: 'Beef tehari cooked in mustard oil' },
    price: 300,
    preparationTime: 10,
  },
  {
    code: 'RICE-007',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'ভেজিটেবল চাওমিন', en: 'Vegetable Chow Mein' },
    description: { bn: 'মৌসুমি সবজি দিয়ে নুডলস', en: 'Noodles with seasonal vegetables' },
    price: 220,
    preparationTime: 10,
  },
  {
    code: 'RICE-008',
    categoryId: 'cat-rice-noodles',
    name: { bn: 'সাদা ভাত', en: 'Plain Rice' },
    price: 60,
    preparationTime: 5,
  },

  // Kebab & grill
  {
    code: 'GRL-001',
    categoryId: 'cat-kebab-grill',
    name: { bn: 'চিকেন টিক্কা', en: 'Chicken Tikka' },
    description: { bn: 'তন্দুরে পোড়ানো মশলাদার চিকেন', en: 'Tandoor-grilled spiced chicken' },
    price: 290,
    preparationTime: 18,
  },
  {
    code: 'GRL-002',
    categoryId: 'cat-kebab-grill',
    name: { bn: 'বিফ শিক কাবাব', en: 'Beef Seekh Kebab' },
    description: { bn: 'শিকে গ্রিল করা কিমার কাবাব (৪ পিস)', en: 'Minced beef kebab grilled on skewers (4 pcs)' },
    price: 340,
    preparationTime: 18,
  },
  {
    code: 'GRL-003',
    categoryId: 'cat-kebab-grill',
    name: { bn: 'গ্রিলড চিকেন (হাফ)', en: 'Grilled Chicken (Half)' },
    description: { bn: 'চারকোলে গ্রিল করা আধা মুরগি', en: 'Half chicken grilled over charcoal' },
    price: 420,
    preparationTime: 25,
  },
  {
    code: 'GRL-004',
    categoryId: 'cat-kebab-grill',
    name: { bn: 'চিকেন রেশমি কাবাব', en: 'Chicken Reshmi Kebab' },
    description: { bn: 'ক্রিম ও মশলায় মাখানো নরম কাবাব', en: 'Soft chicken kebab in cream and spices' },
    price: 310,
    preparationTime: 18,
  },
  {
    code: 'GRL-005',
    categoryId: 'cat-kebab-grill',
    name: { bn: 'বাটার নান', en: 'Butter Naan' },
    price: 60,
    preparationTime: 6,
  },
  {
    code: 'GRL-006',
    categoryId: 'cat-kebab-grill',
    name: { bn: 'পরোটা', en: 'Paratha' },
    price: 30,
    preparationTime: 5,
  },

  // Beverages
  {
    code: 'BEV-001',
    categoryId: 'cat-beverages',
    name: { bn: 'ফ্রেশ অরেঞ্জ জুস', en: 'Fresh Orange Juice' },
    description: { bn: 'তাজা কমলার রস', en: 'Freshly squeezed orange juice' },
    price: 180,
    preparationTime: 5,
  },
  {
    code: 'BEV-002',
    categoryId: 'cat-beverages',
    name: { bn: 'কফি', en: 'Coffee' },
    description: { bn: 'গরম ক্যাপুচিনো', en: 'Hot cappuccino' },
    price: 150,
    preparationTime: 5,
  },
  {
    code: 'BEV-003',
    categoryId: 'cat-beverages',
    name: { bn: 'কোল্ড কফি', en: 'Cold Coffee' },
    description: { bn: 'আইসক্রিম সহ ঠান্ডা কফি', en: 'Chilled coffee with ice cream' },
    price: 220,
    preparationTime: 5,
  },
  {
    code: 'BEV-004',
    categoryId: 'cat-beverages',
    name: { bn: 'কোকা-কোলা', en: 'Coca-Cola' },
    description: { bn: '২৫০ মিলি কাচের বোতল', en: '250 ml glass bottle' },
    price: 60,
    preparationTime: 1,
  },
  {
    code: 'BEV-005',
    categoryId: 'cat-beverages',
    name: { bn: 'মিনারেল ওয়াটার', en: 'Mineral Water' },
    description: { bn: '৫০০ মিলি বোতল', en: '500 ml bottle' },
    price: 30,
    preparationTime: 1,
  },
  {
    code: 'BEV-006',
    categoryId: 'cat-beverages',
    name: { bn: 'বোরহানি', en: 'Borhani' },
    description: { bn: 'মশলাদার দইয়ের পানীয়', en: 'Spiced yogurt drink' },
    price: 80,
    preparationTime: 2,
  },
  {
    code: 'BEV-007',
    categoryId: 'cat-beverages',
    name: { bn: 'মাসালা চা', en: 'Masala Tea' },
    price: 50,
    preparationTime: 4,
  },
  {
    code: 'BEV-008',
    categoryId: 'cat-beverages',
    name: { bn: 'মিন্ট লেমনেড', en: 'Mint Lemonade' },
    description: { bn: 'পুদিনা ও লেবুর ঠান্ডা শরবত', en: 'Chilled lemonade with fresh mint' },
    price: 160,
    preparationTime: 4,
  },

  // Desserts
  {
    code: 'DES-001',
    categoryId: 'cat-desserts',
    name: { bn: 'চকলেট কেক', en: 'Chocolate Cake' },
    description: { bn: 'ডার্ক চকলেট কেকের স্লাইস', en: 'Slice of dark chocolate cake' },
    price: 250,
    preparationTime: 3,
  },
  {
    code: 'DES-002',
    categoryId: 'cat-desserts',
    name: { bn: 'আইসক্রিম', en: 'Ice Cream' },
    description: { bn: 'দুই স্কুপ ভ্যানিলা বা চকলেট', en: 'Two scoops, vanilla or chocolate' },
    price: 150,
    preparationTime: 2,
  },
  {
    code: 'DES-003',
    categoryId: 'cat-desserts',
    name: { bn: 'ফিরনি', en: 'Firni' },
    description: { bn: 'চালের গুঁড়া ও দুধের মিষ্টান্ন', en: 'Ground rice and milk pudding' },
    price: 120,
    preparationTime: 2,
  },
  {
    code: 'DES-004',
    categoryId: 'cat-desserts',
    name: { bn: 'রসমালাই', en: 'Rasmalai' },
    description: { bn: 'ঘন দুধে ভেজানো ছানার মিষ্টি (২ পিস)', en: 'Cottage cheese dumplings in thick milk (2 pcs)' },
    price: 140,
    preparationTime: 2,
  },
  {
    code: 'DES-005',
    categoryId: 'cat-desserts',
    name: { bn: 'ব্রাউনি উইথ আইসক্রিম', en: 'Brownie with Ice Cream' },
    description: { bn: 'গরম ব্রাউনি ও ভ্যানিলা আইসক্রিম', en: 'Warm brownie with vanilla ice cream' },
    price: 280,
    preparationTime: 5,
  },
];

export const seedMenuItemId = (index: number): string => `item-${String(index + 1).padStart(3, '0')}`;

export function createSeedMenuItems(): MenuItem[] {
  return SEED_ITEMS.map((item, index) => {
    const image = getBundledMenuImage(item.code);
    return {
      id: seedMenuItemId(index),
      code: item.code,
      name: { ...item.name },
      ...(item.description ? { description: { ...item.description } } : {}),
      categoryId: item.categoryId,
      price: item.price,
      isAvailable: item.isAvailable ?? true,
      ...(image ? { image } : {}),
      ...(item.preparationTime ? { preparationTime: item.preparationTime } : {}),
      sortOrder: index + 1,
    };
  });
}

/**
 * Bundled photo for a stored item that is still the original demo item
 * (same id and code) — used to add photos to data created before they existed.
 */
export function getSeedImageFor(item: Pick<MenuItem, 'id' | 'code'>): string | undefined {
  const index = SEED_ITEMS.findIndex((seed) => seed.code === item.code);
  return index >= 0 && seedMenuItemId(index) === item.id ? getBundledMenuImage(item.code) : undefined;
}

function capacityFor(tableNumber: number): number {
  if (tableNumber <= 4) return 2;
  if (tableNumber <= 12) return 4;
  if (tableNumber <= 17) return 6;
  return 8;
}

export const SEED_TABLE_COUNT = 20;

export function createSeedTables(): DiningTable[] {
  return Array.from({ length: SEED_TABLE_COUNT }, (_, index) => {
    const number = index + 1;
    const label = String(number).padStart(2, '0');
    return {
      id: `table-${label}`,
      number,
      name: label,
      capacity: capacityFor(number),
      status: 'available' as const,
    };
  });
}
