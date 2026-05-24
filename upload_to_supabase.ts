import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; // Can be service role or anon key



if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const INITIAL_INGREDIENTS = [
  { id: 'tea_black', name: 'Trà Đen Phúc Bồn', current_stock: 9500, min_stock: 2000, unit: 'g', unit_cost: 350 },
  { id: 'tea_oolong', name: 'Trà Oolong Đặc Sản', current_stock: 8500, min_stock: 2000, unit: 'g', unit_cost: 450 },
  { id: 'tea_thai', name: 'Lá Trà Thái Xanh', current_stock: 6000, min_stock: 1500, unit: 'g', unit_cost: 400 },
  { id: 'tea_matcha', name: 'Bột Matcha Nhật', current_stock: 4200, min_stock: 1000, unit: 'g', unit_cost: 750 },
  { id: 'fresh_fruit_mango', name: 'Xoài Cát Tươi', current_stock: 15000, min_stock: 3000, unit: 'g', unit_cost: 150 },
  { id: 'fresh_fruit_passion', name: 'Chanh Dây Tươi', current_stock: 12000, min_stock: 2000, unit: 'g', unit_cost: 180 },
  { id: 'fresh_fruit_guava', name: 'Ổi Hồng Rừng', current_stock: 8000, min_stock: 2000, unit: 'g', unit_cost: 160 },
  { id: 'fresh_fruit_pineapple', name: 'Thơm (Dứa) Mật', current_stock: 10000, min_stock: 2000, unit: 'g', unit_cost: 120 },
  { id: 'fresh_fruit_peach', name: 'Đào Miếng Ngâm', current_stock: 5000, min_stock: 1000, unit: 'g', unit_cost: 200 },
  { id: 'milk_powder', name: 'Bột Sữa Kem Béo', current_stock: 18000, min_stock: 4000, unit: 'g', unit_cost: 280 },
  { id: 'sugar_syrup', name: 'Đường Nước Tự Nhiên', current_stock: 22000, min_stock: 4000, unit: 'ml', unit_cost: 90 },
  { id: 'packaging_cup', name: 'Ly Nhựa Sinh Học 500ml', current_stock: 1200, min_stock: 200, unit: 'cái', unit_cost: 1000 },
  { id: 'packaging_straw', name: 'Ống Hút Trân Châu', current_stock: 1500, min_stock: 200, unit: 'cái', unit_cost: 200 },
];

const INITIAL_MENU = [
  // --- NHÓM 1: TRÀ TRÁI CÂY (Fruit Tea) ---
  {
    id: 'm_xoai_chanhday',
    name: 'Trà Xoài + Chanh Dây',
    price: 20000,
    category: 'Trà Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    description: 'Xoài chín dẻo ngọt ngào phối hợp cùng nước cốt chanh dây thơm lừng, chua ngọt thanh mát.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_mango', amount: 40 },
      { ingredientId: 'fresh_fruit_passion', amount: 30 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_oi_chanhday',
    name: 'Trà Ổi Hồng + Chanh Dây',
    price: 18000,
    category: 'Trà Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1546173152-318ae14d43e4?auto=format&fit=crop&q=80&w=400',
    description: 'Ổi hồng thơm dịu dàng bổ dưỡng kết hợp chanh dây thanh mát, giàu Vitamin C.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_guava', amount: 40 },
      { ingredientId: 'fresh_fruit_passion', amount: 20 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_thom_chanhday',
    name: 'Trà Thơm (Dứa) + Chanh Dây',
    price: 18000,
    category: 'Trà Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=400',
    description: 'Vị dứa chín ngọt mật dạt dào sảng khoái đan xen chanh dây tươi dào dạt sảng khoái.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_pineapple', amount: 45 },
      { ingredientId: 'fresh_fruit_passion', amount: 20 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_dua_mangcau',
    name: 'Trà Dứa Lưới + Mãng Cầu',
    price: 18000,
    category: 'Trà Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    description: 'Dứa lưới căng mọng ngát hương kết hợp mãng cầu xiêm ngọt bùi đặc sản chua ngọt dẻo dòn.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_pineapple', amount: 30 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_dau_dautam',
    name: 'Trà Dâu Tây + Dâu Tằm',
    price: 18000,
    category: 'Trà Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1546173152-318ae14d43e4?auto=format&fit=crop&q=80&w=400',
    description: 'Trà Oolong thơm dịu kết hợp dâu tây dạt dào cùng mứt dâu tằm đỏ ngọc ngọt thanh cuốn hút.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_atiso_combo',
    name: 'Trà Atiso + Đào + Vải + Mận',
    price: 18000,
    category: 'Trà Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=400',
    description: 'Thanh lọc cơ thể hoàn hảo với cốt trà Atiso đỏ, đào giòn giòn, vải thiều ngọt bùi cùng mứt mận dẻo thơm.',
    available: true,
    recipe: [
      { ingredientId: 'tea_black', amount: 12 },
      { ingredientId: 'fresh_fruit_peach', amount: 20 },
      { ingredientId: 'sugar_syrup', amount: 22 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_que_hoa',
    name: 'Trà Quế Hoa Đặc Biệt',
    price: 15000,
    category: 'Trà Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=400',
    description: 'Trà ướp quế hoa thanh khiết, ngát hương quế tự nhiên dịu ngọt giúp giảm stress, ngủ ngon giấc.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 15 },
      { ingredientId: 'sugar_syrup', amount: 15 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },

  // --- NHÓM 2: TRÀ TRÁI CÂY NHIỆT ĐỚI (Tropical Fruit Tea) ---
  {
    id: 'm_dao_camsa',
    name: 'Trà Đào Cam Sả',
    price: 20000,
    category: 'Trà Trái Cây Nhiệt Đới',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    description: 'Sự hòa quyện kinh điển giữa đào ngâm lát giòn, cam tươi ngát hương cùng một chút sả ấm nồng.',
    available: true,
    recipe: [
      { ingredientId: 'tea_black', amount: 12 },
      { ingredientId: 'fresh_fruit_peach', amount: 35 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_vai_thanhlong',
    name: 'Trà Vải Thanh Long',
    price: 20000,
    category: 'Trà Trái Cây Nhiệt Đới',
    image_url: 'https://images.unsplash.com/photo-1546173152-318ae14d43e4?auto=format&fit=crop&q=80&w=400',
    description: 'Ly trà rực rỡ sắc đỏ thanh long tươi nguyên bản quyện cùng những trái vải ngâm trọn vẹn dên dẻ dòn sần sật.',
    available: true,
    recipe: [
      { ingredientId: 'tea_black', amount: 10 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_oi_hong',
    name: 'Trà Ổi Hồng',
    price: 18000,
    category: 'Trà Trái Cây Nhiệt Đới',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    description: 'Hương vị nhiệt đới ngọt ngào nổi bật tự nhiên từ chiết xuất quả ổi hồng dẻo thanh thanh lôi cuốn.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_guava', amount: 50 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_xoai_nhietdoi',
    name: 'Trà Xoài Nhiệt Đới',
    price: 18000,
    category: 'Trà Trái Cây Nhiệt Đới',
    image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=400',
    description: 'Xoài cát tươi thơm bùi ngập tràn sức sống phối cùng oolong chắt lọc tinh hoa mát lành.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_mango', amount: 50 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_dua_nhietdoi',
    name: 'Trà Dứa Nhiệt Đới',
    price: 18000,
    category: 'Trà Trái Cây Nhiệt Đới',
    image_url: 'https://images.unsplash.com/photo-1546173152-318ae14d43e4?auto=format&fit=crop&q=80&w=400',
    description: 'Thơm (dứa) mật dạt dào bừng sáng hương vị nhiệt đới chua dòn sảng khoái.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_pineapple', amount: 55 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_chanhday',
    name: 'Trà Chanh Dây',
    price: 15000,
    category: 'Trà Trái Cây Nhiệt Đới',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    description: 'Trà giải khát chuẩn gu mộc mạc ngon bùng nổ nhờ vị chua thanh rực rỡ của nước cốt chanh dây chín cây.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 10 },
      { ingredientId: 'fresh_fruit_passion', amount: 45 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },

  // --- NHÓM 3: TRÀ SỮA / TRÀ SỮA TRÁI CÂY (Milk Tea / Fruit Milk Tea) ---
  {
    id: 'm_sua_truyenthong',
    name: 'Trà Sữa Truyền Thống',
    price: 15000,
    category: 'Trà Sữa / Trà Sữa Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=400',
    description: 'Trà sữa đậm vị hồng trà bí truyền pha chế kết hợp kem béo Đài Loan mịn ngậy đắm chìm mọi giác quan.',
    available: true,
    recipe: [
      { ingredientId: 'tea_black', amount: 15 },
      { ingredientId: 'milk_powder', amount: 35 },
      { ingredientId: 'sugar_syrup', amount: 30 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_sua_thaixanh',
    name: 'Trà Sữa Thái Xanh',
    price: 18000,
    category: 'Trà Sữa / Trà Sữa Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400',
    description: 'Màu xanh lục mát lạnh mang hương thảo mộc trà Thái đặc trưng ngây ngất béo ngậy.',
    available: true,
    recipe: [
      { ingredientId: 'tea_thai', amount: 15 },
      { ingredientId: 'milk_powder', amount: 30 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_sua_olong',
    name: 'Trà Sữa Olong',
    price: 18000,
    category: 'Trà Sữa / Trà Sữa Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80&w=400',
    description: 'Sự kết kết xuất sắc từ trà Oolong nguyên lá sấy thơm chát hậu quyện lớp sữa mịn thanh tao.',
    available: true,
    recipe: [
      { ingredientId: 'tea_oolong', amount: 15 },
      { ingredientId: 'milk_powder', amount: 32 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_sua_matcha',
    name: 'Trà Sữa Matcha',
    price: 20000,
    category: 'Trà Sữa / Trà Sữa Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400',
    description: 'Bột trà matcha Uji Thượng Hạng Nhật Bản đậm đà, béo bùi say đắm, tăng cường collagen tự nhiên.',
    available: true,
    recipe: [
      { ingredientId: 'tea_matcha', amount: 10 },
      { ingredientId: 'milk_powder', amount: 30 },
      { ingredientId: 'sugar_syrup', amount: 25 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_sua_dau',
    name: 'Trà Sữa Dâu',
    price: 20000,
    category: 'Trà Sữa / Trà Sữa Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1546173152-318ae14d43e4?auto=format&fit=crop&q=80&w=400',
    description: 'Ly trà sữa dâu hồng ngọt ngào, thơm lung dâu tây ngọt lim siêu mịn say đắm.',
    available: true,
    recipe: [
      { ingredientId: 'tea_black', amount: 10 },
      { ingredientId: 'milk_powder', amount: 30 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
  {
    id: 'm_sua_dao',
    name: 'Trà Sữa Đào',
    price: 20000,
    category: 'Trà Sữa / Trà Sữa Trái Cây',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    description: 'Mùi quả đào vàng thơm lựng quyến rũ kết hợp hoàn mỹ cùng cốt sữa béo ngậy chuẩn vị.',
    available: true,
    recipe: [
      { ingredientId: 'tea_black', amount: 10 },
      { ingredientId: 'milk_powder', amount: 30 },
      { ingredientId: 'sugar_syrup', amount: 20 },
      { ingredientId: 'packaging_cup', amount: 1 },
      { ingredientId: 'packaging_straw', amount: 1 },
    ],
  },
];

const INITIAL_CUSTOMERS = [
  {
    phone: '0933387547',
    name: 'Chủ Quán BobaTea',
    email: 'teamleader.hc2019@gmail.com',
    points: 250,
    tier: 'GOLD',
    total_spent: 2500000,
    created_at: '2026-05-01T08:30:00Z',
  },
  {
    phone: '0987654321',
    name: 'Nguyễn Văn Anh',
    email: 'vananh@gmail.com',
    points: 320,
    tier: 'GOLD',
    total_spent: 3200000,
    created_at: '2026-01-10T08:30:00Z',
  },
  {
    phone: '0912345678',
    name: 'Trần Thị Bình',
    email: 'binhtran@gmail.com',
    points: 580,
    tier: 'PLATINUM',
    total_spent: 5800000,
    created_at: '2026-02-15T09:15:00Z',
  },
  {
    phone: '0933445566',
    name: 'Phạm Minh Cường',
    email: 'cuongpham@gmail.com',
    points: 45,
    tier: 'BRONZE',
    total_spent: 450000,
    created_at: '2026-05-12T14:20:00Z',
  },
];

const INITIAL_PROMOTIONS = [
  {
    id: 'promo_MUA2TANG1',
    title: '🎉 Chương Trình MUA 2 TẶNG 1 Siêu Hot',
    content: 'Chương trình ưu đãi cực khủng: Mua 2 ly nước bất kỳ tặng ngay 1 ly nước giá trị bằng hoặc thấp nhất hoàn toàn miễn phí! Đặt ngay hôm nay.',
    code: 'MUA2TANG1',
    discount_percent: 33,
    active: true,
    expiry_date: '2026-06-30T23:59:59Z',
  },
  {
    id: 'promo_HE2026',
    title: '☀️ Chào Hè Rực Rỡ - Giảm Ngay 15k',
    content: 'Những ngày nắng rực rỡ, giải nhiệt ngay với trà trái cây tươi ngon mỗi ngày từ nông trại. Nhập mã HE2026 để giảm 15% tổng đơn đặt hàng.',
    code: 'HE2026',
    discount_percent: 15,
    active: true,
    expiry_date: '2026-06-30T23:59:59Z',
  },
];

async function runUpload() {
  console.log("⚡ Bắt đầu nạp dữ liệu từ Poster lên Supabase...");
  
  try {
    // 1. Clear existing data
    console.log("🧹 Đang dọn dẹp các bản ghi cũ...");
    await supabase.from('orders').delete().neq('id', '');
    await supabase.from('ingredients').delete().neq('id', '');
    await supabase.from('menu').delete().neq('id', '');
    await supabase.from('customers').delete().neq('phone', '');
    await supabase.from('promotions').delete().neq('id', '');
    await supabase.from('security_logs').delete().neq('id', '');

    // 2. Insert Ingredients
    console.log("🍃 Đang nạp danh sách Nguyên Liệu Kho...");
    const { error: ingErr } = await supabase.from('ingredients').insert(INITIAL_INGREDIENTS);
    if (ingErr) throw ingErr;

    // 3. Insert Menu
    console.log("🧋 Đang nạp danh sách Thực Đơn Trà Sữa & Trà Trái Cây...");
    const { error: menuErr } = await supabase.from('menu').insert(INITIAL_MENU);
    if (menuErr) throw menuErr;

    // 4. Insert Customers
    console.log("👥 Đang nạp danh sách Thành Viên tích điểm...");
    const { error: custErr } = await supabase.from('customers').insert(INITIAL_CUSTOMERS);
    if (custErr) throw custErr;

    // 5. Insert Promotions
    console.log("🎟️ Đang nạp danh sách Voucher Khuyến Mãi (MUA 2 TẶNG 1, HE2026)...");
    const { error: promoErr } = await supabase.from('promotions').insert(INITIAL_PROMOTIONS);
    if (promoErr) throw promoErr;

    // 6. Insert Security Logs
    console.log("🔒 Tạo nhật ký bảo mật ban đầu...");
    await supabase.from('security_logs').insert([{
      id: 'log_init_002',
      timestamp: new Date().toISOString(),
      user_id: 'SYSTEM_BOT',
      role: 'ADMIN',
      action: 'POSTER_DATA_INGESTION',
      details: 'Đã hoàn tất nạp dữ liệu menu chính thức từ Poster quán thành công lên Supabase.',
      ip_address: '127.0.0.1 (Local Ingest)',
      integrity_verified: true
    }]);

    console.log("🎉 THÀNH CÔNG RỰC RỠ! Toàn bộ thực đơn và cấu hình từ Poster của bạn đã được tải thành công lên Supabase Cloud!");
  } catch (err) {
    console.error("❌ LỖI trong quá trình nạp dữ liệu:", err);
  }
}

runUpload();
