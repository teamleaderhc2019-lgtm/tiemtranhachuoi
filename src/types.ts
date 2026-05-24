/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export enum OrderStatus {
  PENDING = 'PENDING', // Mới đặt hàng
  BREWING = 'BREWING',   // Đang pha chế
  COMPLETED = 'COMPLETED', // Hoàn thành
  CANCELLED = 'CANCELLED', // Đã hủy
}

export enum PaymentMethod {
  CASH = 'CASH',
  ONLINE_QR = 'ONLINE_QR', // Thanh toán QR trực tuyến nhanh
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum MembershipTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

// Đối tượng Kho hàng / Nguyên liệu
export interface Ingredient {
  id: string;
  name: string;
  currentStock: number; // gam, ml, cái, v.v.
  minStock: number;     // Ngưỡng báo động hết hàng
  unit: string;         // g, ml, cái, túi
  unitCost: number;     // Chi phí trên mỗi đơn vị (VND/đơn vị)
}

// Chi tiết nguyên liệu trong một món (Công thức)
export interface RecipeItem {
  ingredientId: string;
  amount: number;       // Lượng nguyên liệu tiêu hao
}

// Món ăn / Đồ uống trong thực đơn
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  recipe: RecipeItem[]; // Công thức tự động trừ kho
  available: boolean;
  description: string;
}

// Topping tùy chọn cho Trà sữa
export interface ToppingItem {
  id: string;
  name: string;
  price: number;
  recipe: RecipeItem[];
}

// Chi tiết một món trong đơn hàng
export interface OrderItem {
  id: string; // SKU hoặc id ngẫu nhiên cho dòng
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  sweetness: number; // 0%, 30%, 50%, 70%, 100%
  ice: number;       // 0%, 30%, 50%, 70%, 100%
  toppings: {
    toppingId: string;
    name: string;
    price: number;
  }[];
}

// Đơn hàng trà sữa
export interface Order {
  id: string;
  customerPhone?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  pointsEarned: number;
  createdAt: string; // ISO String
  rolePlaced: UserRole;
  isOfflineCreated?: boolean;
}

// Khách hàng thành viên
export interface CustomerAccount {
  phone: string;
  name: string;
  email?: string;
  points: number;
  tier: MembershipTier;
  totalSpent: number;
  createdAt: string;
}

// Thông báo / Khuyến mãi
export interface PromotionNotification {
  id: string;
  title: string;
  content: string;
  code: string;
  discountPercent: number; // e.g. 10 -> 10%
  active: boolean;
  expiryDate: string;
}

// Báo cáo chi phí nguyên liệu hàng tháng
export interface MonthlyCostReport {
  month: string; // YYYY-MM
  ingredientCosts: {
    ingredientId: string;
    ingredientName: string;
    consumedAmount: number;
    unit: string;
    totalCost: number;
  }[];
  otherCosts: number; // điện, nước, mặt bằng dã định
  totalRevenue: number;
  totalIngredientCost: number;
  netProfit: number;
}

// Nhật ký bảo mật (Audit log)
export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId: string; // Tên người dùng hoặc SĐT hoặc Staff_01
  role: UserRole;
  action: string;
  details: string;
  ipAddress: string;
  integrityVerified: boolean; // Chữ ký băm bảo đảm không bị can thiệp
}

// Offline Action Queue
export interface OfflineAction {
  id: string;
  type: 'PLACE_ORDER' | 'UPDATE_STOCK' | 'REGISTER_CUSTOMER';
  payload: any;
  timestamp: string;
}
