/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Ingredient, MenuItem, CustomerAccount, PromotionNotification, Order, 
  UserRole, OrderStatus, PaymentMethod, PaymentStatus, SecurityAuditLog, OfflineAction, MembershipTier
} from '../types';
import { 
  INITIAL_INGREDIENTS, INITIAL_MENU, INITIAL_CUSTOMERS, INITIAL_PROMOTIONS, INITIAL_ORDERS 
} from '../initialData';
import { 
  encryptData, decryptData, calculateChecksum, hasRequiredPrivilege 
} from '../utils/security';
import { supabase } from '../utils/supabase';


interface StoreContextType {
  ingredients: Ingredient[];
  menu: MenuItem[];
  customers: CustomerAccount[];
  orders: Order[];
  promotions: PromotionNotification[];
  securityLogs: SecurityAuditLog[];
  offlineQueue: OfflineAction[];
  
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  
  loggedInCustomer: CustomerAccount | null;
  loginCustomer: (phone: string) => CustomerAccount | null;
  logoutCustomer: () => void;
  
  isOffline: boolean;
  toggleOfflineMode: () => void;
  
  isTampered: boolean;
  tamperMessage: string;
  triggerTamperDemo: () => void;
  restoreCleanDatabase: () => void;
  
  createOrder: (orderItems: any[], subtotal: number, discount: number, paymentMethod: PaymentMethod, appliedCode?: string) => Order;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  reimportStock: (ingredientId: string, amount: number) => void;
  registerNewMember: (name: string, phone: string, email?: string) => CustomerAccount | string;
  addNewPromotion: (promo: Omit<PromotionNotification, 'id'>) => void;
  addSystemAuditLog: (action: string, details: string, level?: 'info' | 'warn' | 'error') => void;
  updateMenuItem: (item: MenuItem) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  deleteMenuItem: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Storage key declarations
const STORAGE_PREFIX = 'MILKTEA_SECURE_V1_';
const KEYS = {
  INGREDIENTS: STORAGE_PREFIX + 'ingredients',
  MENU: STORAGE_PREFIX + 'menu',
  CUSTOMERS: STORAGE_PREFIX + 'customers',
  ORDERS: STORAGE_PREFIX + 'orders',
  PROMOTIONS: STORAGE_PREFIX + 'promotions',
  SECURITY: STORAGE_PREFIX + 'security',
  QUEUE: STORAGE_PREFIX + 'queue',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<PromotionNotification[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditLog[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
  
  const [currentRole, setLocalRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [loggedInCustomer, setLoggedInCustomer] = useState<CustomerAccount | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [tamperMessage, setTamperMessage] = useState<string>('');

  // Initial load
  useEffect(() => {
    loadDatabase();
  }, []);

  const populateSupabaseDefaults = async () => {
    if (!supabase) return;
    try {
      // 1. Ingredients
      await supabase.from('ingredients').insert(
        INITIAL_INGREDIENTS.map(item => ({
          id: item.id,
          name: item.name,
          current_stock: item.currentStock,
          min_stock: item.minStock,
          unit: item.unit,
          unit_cost: item.unitCost
        }))
      );
      
      // 2. Menu
      await supabase.from('menu').insert(
        INITIAL_MENU.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          image_url: item.imageUrl,
          recipe: item.recipe,
          available: item.available,
          description: item.description
        }))
      );

      // 3. Customers
      await supabase.from('customers').insert(
        INITIAL_CUSTOMERS.map(item => ({
          phone: item.phone,
          name: item.name,
          email: item.email,
          points: item.points,
          tier: item.tier,
          total_spent: item.totalSpent,
          created_at: item.createdAt
        }))
      );

      // 4. Orders
      await supabase.from('orders').insert(
        INITIAL_ORDERS.map(item => ({
          id: item.id,
          customer_phone: item.customerPhone,
          customer_name: item.customerName,
          items: item.items,
          subtotal: item.subtotal,
          discount: item.discount,
          total: item.total,
          payment_method: item.paymentMethod,
          payment_status: item.paymentStatus,
          status: item.status,
          points_earned: item.pointsEarned,
          created_at: item.createdAt,
          role_placed: item.rolePlaced,
          is_offline_created: item.isOfflineCreated || false
        }))
      );

      // 5. Promotions
      await supabase.from('promotions').insert(
        INITIAL_PROMOTIONS.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          code: item.code,
          discount_percent: item.discountPercent,
          active: item.active,
          expiry_date: item.expiryDate
        }))
      );

      // 6. Security Logs
      const initLog = {
        id: 'log_001',
        timestamp: new Date().toISOString(),
        user_id: 'SYSTEM',
        role: UserRole.ADMIN,
        action: 'INITIALIZE',
        details: 'Hệ thống bảo mật cơ sở dữ liệu trà sữa khởi tạo hoàn tất.',
        ip_address: '127.0.0.1 (Local)',
        integrity_verified: true
      };
      await supabase.from('security_logs').insert([initLog]);

    } catch (e) {
      console.error("Error populating Supabase defaults", e);
    }
  };

  const loadDatabase = async () => {
    try {
      setIsTampered(false);
      setTamperMessage('');

      // Check if we can connect to Supabase
      if (supabase && !isOffline) {
        try {
          // Attempt loading from Supabase
          const { data: dbIngredients, error: ingError } = await supabase
            .from('ingredients')
            .select('*')
            .order('id', { ascending: true });
          
          const { data: dbMenu, error: menuError } = await supabase
            .from('menu')
            .select('*')
            .order('id', { ascending: true });

          const { data: dbCustomers, error: custError } = await supabase
            .from('customers')
            .select('*')
            .order('phone', { ascending: true });

          const { data: dbOrders, error: ordError } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

          const { data: dbPromotions, error: promoError } = await supabase
            .from('promotions')
            .select('*')
            .order('id', { ascending: true });

          const { data: dbSecurity, error: secError } = await supabase
            .from('security_logs')
            .select('*')
            .order('timestamp', { ascending: false });

          if (!ingError && !menuError && !custError && !ordError && !promoError && !secError) {
            let mappedIngredients = INITIAL_INGREDIENTS;
            if (dbIngredients && dbIngredients.length > 0) {
              mappedIngredients = dbIngredients.map((item: any) => ({
                id: item.id,
                name: item.name,
                currentStock: item.current_stock,
                minStock: item.min_stock,
                unit: item.unit,
                unitCost: item.unit_cost
              }));
            } else {
              // Populate Supabase if empty!
              await populateSupabaseDefaults();
              // Reload immediately after populating
              setTimeout(() => { loadDatabase(); }, 500);
              return;
            }

            let mappedMenu = INITIAL_MENU;
            if (dbMenu && dbMenu.length > 0) {
              mappedMenu = dbMenu.map((item: any) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                category: item.category,
                imageUrl: item.image_url || '',
                recipe: item.recipe,
                available: item.available,
                description: item.description || ''
              }));
            }

            let mappedCustomers = INITIAL_CUSTOMERS;
            if (dbCustomers && dbCustomers.length > 0) {
              mappedCustomers = dbCustomers.map((item: any) => ({
                phone: item.phone,
                name: item.name,
                email: item.email || undefined,
                points: item.points,
                tier: item.tier as MembershipTier,
                totalSpent: item.total_spent,
                createdAt: item.created_at
              }));
            }

            let mappedOrders: Order[] = INITIAL_ORDERS;
            if (dbOrders && dbOrders.length > 0) {
              mappedOrders = dbOrders.map((item: any) => ({
                id: item.id,
                customerPhone: item.customer_phone || undefined,
                customerName: item.customer_name || undefined,
                items: item.items,
                subtotal: item.subtotal,
                discount: item.discount,
                total: item.total,
                paymentMethod: item.payment_method as PaymentMethod,
                paymentStatus: item.payment_status as PaymentStatus,
                status: item.status as OrderStatus,
                pointsEarned: item.points_earned,
                createdAt: item.created_at,
                rolePlaced: item.role_placed as UserRole,
                isOfflineCreated: item.is_offline_created
              }));
            }

            let mappedPromotions = INITIAL_PROMOTIONS;
            if (dbPromotions && dbPromotions.length > 0) {
              mappedPromotions = dbPromotions.map((item: any) => ({
                id: item.id,
                title: item.title,
                content: item.content,
                code: item.code,
                discountPercent: item.discount_percent,
                active: item.active,
                expiryDate: item.expiry_date
              }));
            }

            let mappedSecurity: SecurityAuditLog[] = [];
            if (dbSecurity && dbSecurity.length > 0) {
              mappedSecurity = dbSecurity.map((item: any) => ({
                id: item.id,
                timestamp: item.timestamp,
                userId: item.user_id,
                role: item.role as UserRole,
                action: item.action,
                details: item.details,
                ipAddress: item.ip_address,
                integrityVerified: item.integrity_verified
              }));
            }

            // Sync with local Storage (encrypted) as cache/backup
            saveItemAndSign(KEYS.INGREDIENTS, mappedIngredients);
            saveItemAndSign(KEYS.MENU, mappedMenu);
            saveItemAndSign(KEYS.CUSTOMERS, mappedCustomers);
            saveItemAndSign(KEYS.ORDERS, mappedOrders);
            saveItemAndSign(KEYS.PROMOTIONS, mappedPromotions);
            saveItemAndSign(KEYS.SECURITY, mappedSecurity);

            setIngredients(mappedIngredients);
            setMenu(mappedMenu);
            setCustomers(mappedCustomers);
            setOrders(mappedOrders);
            setPromotions(mappedPromotions);
            setSecurityLogs(mappedSecurity);

            const cachedQueue = localStorage.getItem(KEYS.QUEUE);
            if (cachedQueue) {
              setOfflineQueue(JSON.parse(cachedQueue));
            } else {
              localStorage.setItem(KEYS.QUEUE, JSON.stringify([]));
              setOfflineQueue([]);
            }
            return; // Load success!
          } else {
            console.error("Error fetching data from Supabase, using local fallback.", { ingError, menuError, custError, ordError, promoError, secError });
          }
        } catch (dbErr) {
          console.error("Supabase connection exception, using local fallback.", dbErr);
        }
      }

      // LOCAL FALLBACK
      const integrityCheck = verifyIntegrity();
      if (!integrityCheck.ok) {
        setIsTampered(true);
        setTamperMessage(integrityCheck.error || 'Xác thực chữ ký dữ liệu thất bại.');
        loadFallbackMockState();
        return;
      }

      // 1. Ingredients
      const cachedIngredients = localStorage.getItem(KEYS.INGREDIENTS);
      let loadedIngredients = INITIAL_INGREDIENTS;
      if (cachedIngredients) {
        try {
          const decrypted = decryptData(cachedIngredients);
          const hasNewIng = Array.isArray(decrypted) && decrypted.some((ing: any) => ing.id === 'tea_oolong');
          if (hasNewIng) {
            loadedIngredients = decrypted;
          } else {
            saveItemAndSign(KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
          }
        } catch (e) {
          saveItemAndSign(KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
        }
      } else {
        saveItemAndSign(KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
      }
      setIngredients(loadedIngredients);

      // 2. Menu
      const cachedMenu = localStorage.getItem(KEYS.MENU);
      let loadedMenu = INITIAL_MENU;
      if (cachedMenu) {
        try {
          const decrypted = decryptData(cachedMenu);
          const hasNewMenu = Array.isArray(decrypted) && decrypted.some((item: any) => item.id === 'm_xoai_chanhday');
          if (hasNewMenu) {
            loadedMenu = decrypted;
          } else {
            saveItemAndSign(KEYS.MENU, INITIAL_MENU);
          }
        } catch (e) {
          saveItemAndSign(KEYS.MENU, INITIAL_MENU);
        }
      } else {
        saveItemAndSign(KEYS.MENU, INITIAL_MENU);
      }
      setMenu(loadedMenu);

      // 3. Customers
      const cachedCustomers = localStorage.getItem(KEYS.CUSTOMERS);
      let loadedCustomers = INITIAL_CUSTOMERS;
      if (cachedCustomers) {
        try {
          const decrypted = decryptData(cachedCustomers);
          const hasNewOwner = Array.isArray(decrypted) && decrypted.some((cust: any) => cust.phone === '0933387547');
          if (hasNewOwner) {
            loadedCustomers = decrypted;
          } else {
            saveItemAndSign(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
          }
        } catch (e) {
          saveItemAndSign(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
        }
      } else {
        saveItemAndSign(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
      }
      setCustomers(loadedCustomers);

      // 4. Orders
      const cachedOrders = localStorage.getItem(KEYS.ORDERS);
      if (cachedOrders) {
        setOrders(decryptData(cachedOrders) || INITIAL_ORDERS);
      } else {
        saveItemAndSign(KEYS.ORDERS, INITIAL_ORDERS);
        setOrders(INITIAL_ORDERS);
      }

      // 5. Promotions
      const cachedPromotions = localStorage.getItem(KEYS.PROMOTIONS);
      let loadedPromotions = INITIAL_PROMOTIONS;
      if (cachedPromotions) {
        try {
          const decrypted = decryptData(cachedPromotions);
          const hasB2G1 = Array.isArray(decrypted) && decrypted.some((p: any) => p.code === 'MUA2TANG1');
          if (hasB2G1) {
            loadedPromotions = decrypted;
          } else {
            saveItemAndSign(KEYS.PROMOTIONS, INITIAL_PROMOTIONS);
          }
        } catch (e) {
          saveItemAndSign(KEYS.PROMOTIONS, INITIAL_PROMOTIONS);
        }
      } else {
        saveItemAndSign(KEYS.PROMOTIONS, INITIAL_PROMOTIONS);
      }
      setPromotions(loadedPromotions);

      // 6. Security Logs
      const cachedSecurity = localStorage.getItem(KEYS.SECURITY);
      if (cachedSecurity) {
        setSecurityLogs(decryptData(cachedSecurity) || []);
      } else {
        const initLog: SecurityAuditLog[] = [
          {
            id: 'log_001',
            timestamp: new Date().toISOString(),
            userId: 'SYSTEM',
            role: UserRole.ADMIN,
            action: 'INITIALIZE',
            details: 'Hệ thống bảo mật cơ sở dữ liệu trà sữa khởi tạo hoàn tất.',
            ipAddress: '127.0.0.1 (Local)',
            integrityVerified: true
          }
        ];
        saveItemAndSign(KEYS.SECURITY, initLog);
        setSecurityLogs(initLog);
      }

      // 7. Offline Queue
      const cachedQueue = localStorage.getItem(KEYS.QUEUE);
      if (cachedQueue) {
        setOfflineQueue(JSON.parse(cachedQueue));
      } else {
        localStorage.setItem(KEYS.QUEUE, JSON.stringify([]));
        setOfflineQueue([]);
      }

    } catch (err) {
      console.error("Critical storage loading error", err);
      setIsTampered(true);
      setTamperMessage("Phát hiện lỗi định dạng dữ liệu mã hóa. Cơ sở dữ liệu bị hỏng.");
      loadFallbackMockState();
    }
  };

  const loadFallbackMockState = () => {
    setIngredients(INITIAL_INGREDIENTS);
    setMenu(INITIAL_MENU);
    setCustomers(INITIAL_CUSTOMERS);
    setOrders(INITIAL_ORDERS);
    setPromotions(INITIAL_PROMOTIONS);
    setSecurityLogs([
      {
        id: 'tampered_log',
        timestamp: new Date().toISOString(),
        userId: 'SECURITY_SHIELD',
        role: UserRole.ADMIN,
        action: 'BREACH_ALERT',
        details: 'CẢNH BÁO: Phát hiện thay đổi dữ liệu trái phép ngoài bộ nhớ trình duyệt!',
        ipAddress: '0.0.0.0 (Threat Detected)',
        integrityVerified: false
      }
    ]);
  };

  /**
   * Verified cryptographic signatures of the storage fields
   */
  const verifyIntegrity = (): { ok: boolean; error?: string } => {
    const fields = Object.keys(KEYS) as Array<keyof typeof KEYS>;
    for (const f of fields) {
      if (f === 'QUEUE') continue;
      const key = KEYS[f];
      const rawData = localStorage.getItem(key);
      if (!rawData) continue; // Not created yet is OK
      
      const savedHash = localStorage.getItem(key + '_hash');
      if (!savedHash) {
        return { ok: false, error: `Phát hiện tệp dữ liệu ${f} thiếu chữ ký chứng thực tính toàn vẹn!` };
      }
      
      const computedHash = calculateChecksum(rawData);
      if (savedHash !== computedHash) {
        return { ok: false, error: `Cảnh báo xâm nhập: Chữ ký dữ liệu ${f} không đồng khớp. Dữ liệu tệp tin có thể đã bị can thiệp trái phép!` };
      }
    }
    return { ok: true };
  };

  const saveItemAndSign = (key: string, data: any) => {
    const cipherText = encryptData(data);
    const hash = calculateChecksum(cipherText);
    localStorage.setItem(key, cipherText);
    localStorage.setItem(key + '_hash', hash);
  };

  // Switch role with logging
  const setCurrentRole = (role: UserRole) => {
    setLocalRole(role);
    addSystemAuditLog(
      'PHÂN QUYỀN_CHUYỂN_VAI_TRÒ', 
      `Người dùng chuyển đổi sang vai trò truy cập: [${role}]`, 
      role === UserRole.ADMIN ? 'warn' : 'info'
    );
    // Auto logout customer when switching to avoid weird sessions
    if (role !== UserRole.CUSTOMER) {
      setLoggedInCustomer(null);
    }
  };

  // Log inside system
  const addSystemAuditLog = (action: string, details: string, level: 'info' | 'warn' | 'error' = 'info') => {
    setSecurityLogs(prev => {
      const newLog: SecurityAuditLog = {
        id: 'LOG_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        userId: loggedInCustomer ? `${loggedInCustomer.name} (${loggedInCustomer.phone})` : currentRole,
        role: currentRole,
        action,
        details: `[${level.toUpperCase()}] ${details}`,
        ipAddress: isOffline ? 'Offline Gateway' : '192.168.1.100 (WPA2_Secure)',
        integrityVerified: true
      };
      
      const updatedLogs = [newLog, ...prev].slice(0, 100); // Max 100 logs
      saveItemAndSign(KEYS.SECURITY, updatedLogs);

      // Write to Supabase if online
      if (supabase && !isOffline) {
        supabase.from('security_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_id: newLog.userId,
          role: newLog.role,
          action: newLog.action,
          details: newLog.details,
          ip_address: newLog.ipAddress,
          integrity_verified: newLog.integrityVerified
        }]).then(({ error }) => {
          if (error) console.error("Error inserting security log to Supabase:", error);
        });
      }

      return updatedLogs;
    });
  };

  // Membership login
  const loginCustomer = (phone: string): CustomerAccount | null => {
    const cleanedPhone = phone.trim();
    const found = customers.find(c => c.phone === cleanedPhone);
    if (found) {
      setLoggedInCustomer(found);
      addSystemAuditLog('MEMBER_LOGIN', `Thành viên [${found.name}] đăng nhập số điện thoại ${found.phone} để tích điểm.`);
      return found;
    }
    return null;
  };

  const logoutCustomer = () => {
    if (loggedInCustomer) {
      addSystemAuditLog('MEMBER_LOGOUT', `Thành viên [${loggedInCustomer.name}] đăng xuất.`);
    }
    setLoggedInCustomer(null);
  };

  // Toggle offline simulator
  const toggleOfflineMode = () => {
    setIsOffline(prev => {
      const nextState = !prev;
      addSystemAuditLog(
        nextState ? 'OFFLINE_ENTER' : 'OFFLINE_EXIT', 
        nextState ? 'Hệ thống chuyển sang chế độ hoạt động ngoại tuyến. Dữ liệu lưu trữ cục bộ có bảo vệ.' : 'Đã kết nối trực tuyến. Tiến hành đồng bộ hóa xếp hàng tác vụ ngoại tuyến...',
        nextState ? 'warn' : 'info'
      );
      
      if (!nextState) {
        // Synchronize queue
        setTimeout(() => {
          syncOfflineQueue();
        }, 800);
      }
      return nextState;
    });
  };

  // Syncing offline actions
  const syncOfflineQueue = async () => {
    const queueData = localStorage.getItem(KEYS.QUEUE);
    if (!queueData) return;
    const actions: OfflineAction[] = JSON.parse(queueData);
    if (actions.length === 0) return;

    addSystemAuditLog('SYNC_START', `Bắt đầu đồng bộ hóa ${actions.length} giao dịch ngoại tuyến lên Cloud...`);
    
    if (supabase) {
      try {
        for (const act of actions) {
          if (act.type === 'PLACE_ORDER') {
            const ordId = act.payload.id;
            const fullOrder = orders.find(o => o.id === ordId);
            if (fullOrder) {
              await supabase.from('orders').insert({
                id: fullOrder.id,
                customer_phone: fullOrder.customerPhone,
                customer_name: fullOrder.customerName,
                items: fullOrder.items,
                subtotal: fullOrder.subtotal,
                discount: fullOrder.discount,
                total: fullOrder.total,
                payment_method: fullOrder.paymentMethod,
                payment_status: fullOrder.paymentStatus,
                status: fullOrder.status,
                points_earned: fullOrder.pointsEarned,
                created_at: fullOrder.createdAt,
                role_placed: fullOrder.rolePlaced,
                is_offline_created: true
              });

              // Sync ingredients stock
              const ingUpdates = ingredients.map(ing => ({
                id: ing.id,
                name: ing.name,
                current_stock: ing.currentStock,
                min_stock: ing.minStock,
                unit: ing.unit,
                unit_cost: ing.unitCost
              }));
              await supabase.from('ingredients').upsert(ingUpdates);

              // Sync customer points
              if (fullOrder.customerPhone) {
                const cust = customers.find(c => c.phone === fullOrder.customerPhone);
                if (cust) {
                  await supabase.from('customers').upsert({
                    phone: cust.phone,
                    name: cust.name,
                    email: cust.email,
                    points: cust.points,
                    tier: cust.tier,
                    total_spent: cust.totalSpent,
                    created_at: cust.createdAt
                  });
                }
              }
            }
            addSystemAuditLog('SYNC_ORDER', `Đồng bộ đơn hàng ${act.payload.id} thành công lên máy chủ trung tâm.`);
          } else if (act.type === 'UPDATE_STOCK') {
            const ingUpdates = ingredients.map(ing => ({
              id: ing.id,
              name: ing.name,
              current_stock: ing.currentStock,
              min_stock: ing.minStock,
              unit: ing.unit,
              unit_cost: ing.unitCost
            }));
            await supabase.from('ingredients').upsert(ingUpdates);
            addSystemAuditLog('SYNC_STOCK', `Cập nhật bổ sung kho từ xa thành công.`);
          } else if (act.type === 'REGISTER_CUSTOMER') {
            const cust = customers.find(c => c.phone === act.payload.phone);
            if (cust) {
              await supabase.from('customers').insert({
                phone: cust.phone,
                name: cust.name,
                email: cust.email,
                points: cust.points,
                tier: cust.tier,
                total_spent: cust.totalSpent,
                created_at: cust.createdAt
              });
            }
            addSystemAuditLog('SYNC_CUSTOMER', `Đồng bộ thành viên mới: ${act.payload.name} (${act.payload.phone}).`);
          }
        }
      } catch (err) {
        console.error("Lỗi đồng bộ hàng đợi ngoại tuyến lên Supabase:", err);
        addSystemAuditLog('SYNC_ERROR', `Đồng bộ thất bại: ${err instanceof Error ? err.message : String(err)}`, 'error');
        return;
      }
    }

    // Clear queue
    localStorage.setItem(KEYS.QUEUE, JSON.stringify([]));
    setOfflineQueue([]);
    addSystemAuditLog('SYNC_COMPLETED', `Tất cả dữ liệu ngoại tuyến đã được bảo mật & đồng bộ thành công.`);
  };

  // Place bubble tea Order
  const createOrder = (
    orderItems: any[], 
    subtotal: number, 
    discount: number, 
    paymentMethod: PaymentMethod,
    appliedCode?: string
  ): Order => {
    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    
    const finalTotal = subtotal - discount;
    let pointsEarned = Math.floor(finalTotal / 10000);
    
    if (loggedInCustomer) {
      if (loggedInCustomer.tier === MembershipTier.SILVER) pointsEarned = Math.floor(pointsEarned * 1.05);
      if (loggedInCustomer.tier === MembershipTier.GOLD) pointsEarned = Math.floor(pointsEarned * 1.10);
      if (loggedInCustomer.tier === MembershipTier.PLATINUM) pointsEarned = Math.floor(pointsEarned * 1.15);
    }

    const newOrder: Order = {
      id: orderId,
      customerPhone: loggedInCustomer?.phone || undefined,
      customerName: loggedInCustomer?.name || undefined,
      items: orderItems,
      subtotal,
      discount,
      total: finalTotal,
      paymentMethod,
      paymentStatus: paymentMethod === PaymentMethod.ONLINE_QR ? PaymentStatus.PAID : PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
      pointsEarned: loggedInCustomer ? pointsEarned : 0,
      createdAt: new Date().toISOString(),
      rolePlaced: currentRole,
      isOfflineCreated: isOffline
    };

    // 1. UPDATE INVENTORY
    let updatedIngredients = [...ingredients];
    orderItems.forEach((item: any) => {
      const menuItem = menu.find(m => m.id === item.menuItemId);
      if (menuItem) {
        menuItem.recipe.forEach(recipeItem => {
          const ingredient = updatedIngredients.find(ing => ing.id === recipeItem.ingredientId);
          if (ingredient) {
            ingredient.currentStock = Math.max(0, ingredient.currentStock - (recipeItem.amount * item.quantity));
          }
        });
      }
    });
    setIngredients(updatedIngredients);
    saveItemAndSign(KEYS.INGREDIENTS, updatedIngredients);

    if (supabase && !isOffline) {
      const ingUpdates = updatedIngredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        current_stock: ing.currentStock,
        min_stock: ing.minStock,
        unit: ing.unit,
        unit_cost: ing.unitCost
      }));
      supabase.from('ingredients').upsert(ingUpdates).then(({ error }) => {
        if (error) console.error("Error upserting ingredients on createOrder:", error);
      });
    }

    // 2. UPDATE LOYALTY POINTS
    let updatedCustomers = [...customers];
    if (loggedInCustomer) {
      updatedCustomers = customers.map(c => {
        if (c.phone === loggedInCustomer.phone) {
          const newPoints = c.points + pointsEarned;
          const newTotalSpent = c.totalSpent + finalTotal;
          
          let newTier = MembershipTier.BRONZE;
          if (newPoints >= 500) newTier = MembershipTier.PLATINUM;
          else if (newPoints >= 200) newTier = MembershipTier.GOLD;
          else if (newPoints >= 50) newTier = MembershipTier.SILVER;

          const updatedC = {
            ...c,
            points: newPoints,
            totalSpent: newTotalSpent,
            tier: newTier
          };
          
          setLoggedInCustomer(updatedC);
          return updatedC;
        }
        return c;
      });
      setCustomers(updatedCustomers);
      saveItemAndSign(KEYS.CUSTOMERS, updatedCustomers);

      if (supabase && !isOffline) {
        const targetCust = updatedCustomers.find(c => c.phone === loggedInCustomer.phone);
        if (targetCust) {
          supabase.from('customers').upsert({
            phone: targetCust.phone,
            name: targetCust.name,
            email: targetCust.email,
            points: targetCust.points,
            tier: targetCust.tier,
            total_spent: targetCust.totalSpent,
            created_at: targetCust.createdAt
          }).then(({ error }) => {
            if (error) console.error("Error upserting customer on createOrder:", error);
          });
        }
      }
    }

    // 3. PERSIST ORDER
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveItemAndSign(KEYS.ORDERS, updatedOrders);

    if (supabase && !isOffline) {
      supabase.from('orders').insert({
        id: newOrder.id,
        customer_phone: newOrder.customerPhone,
        customer_name: newOrder.customerName,
        items: newOrder.items,
        subtotal: newOrder.subtotal,
        discount: newOrder.discount,
        total: newOrder.total,
        payment_method: newOrder.paymentMethod,
        payment_status: newOrder.paymentStatus,
        status: newOrder.status,
        points_earned: newOrder.pointsEarned,
        created_at: newOrder.createdAt,
        role_placed: newOrder.rolePlaced,
        is_offline_created: newOrder.isOfflineCreated || false
      }).then(({ error }) => {
        if (error) console.error("Error inserting order to Supabase:", error);
      });
    }

    // 4. HANDLE OFFLINE QUEUE
    if (isOffline) {
      const offlineAct: OfflineAction = {
        id: 'ACT_' + Date.now(),
        type: 'PLACE_ORDER',
        payload: { id: orderId, total: finalTotal },
        timestamp: new Date().toISOString()
      };
      const updatedQueue = [...offlineQueue, offlineAct];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(KEYS.QUEUE, JSON.stringify(updatedQueue));
    }

    // Audit Log
    addSystemAuditLog(
      'ORDER_PLACE', 
      `Đặt hàng thành thục đơn ly ${orderId}. Tổng thanh toán: ${finalTotal.toLocaleString()} đ. Phương thức: ${paymentMethod}. Tích điểm: +${pointsEarned} p. Chế độ: ${isOffline ? 'Offline' : 'Online'}`
    );

    return newOrder;
  };

  // Staff completes or cancels order
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    const updated = orders.map(ord => {
      if (ord.id === orderId) {
        let paymentStatus = ord.paymentStatus;
        if (newStatus === OrderStatus.COMPLETED) {
          paymentStatus = PaymentStatus.PAID;
        } else if (newStatus === OrderStatus.CANCELLED && ord.paymentStatus === PaymentStatus.PAID && ord.paymentMethod === PaymentMethod.ONLINE_QR) {
          paymentStatus = PaymentStatus.REFUNDED;
          
          // Return inventory ingredients if cancelled
          let restoredIngredients = [...ingredients];
          ord.items.forEach((item: any) => {
            const menuItem = menu.find(m => m.id === item.menuItemId);
            if (menuItem) {
              menuItem.recipe.forEach(recipeItem => {
                const ingredient = restoredIngredients.find(ing => ing.id === recipeItem.ingredientId);
                if (ingredient) {
                  ingredient.currentStock += (recipeItem.amount * item.quantity);
                }
              });
            }
          });
          setIngredients(restoredIngredients);
          saveItemAndSign(KEYS.INGREDIENTS, restoredIngredients);

          if (supabase && !isOffline) {
            const ingUpdates = restoredIngredients.map(ing => ({
              id: ing.id,
              name: ing.name,
              current_stock: ing.currentStock,
              min_stock: ing.minStock,
              unit: ing.unit,
              unit_cost: ing.unitCost
            }));
            supabase.from('ingredients').upsert(ingUpdates).then(({ error }) => {
              if (error) console.error("Error upserting ingredients stock on cancel:", error);
            });
          }
        }
        
        const updatedOrder = {
          ...ord,
          status: newStatus,
          paymentStatus
        };

        if (supabase && !isOffline) {
          supabase.from('orders').update({
            status: updatedOrder.status,
            payment_status: updatedOrder.paymentStatus
          }).eq('id', orderId).then(({ error }) => {
            if (error) console.error("Error updating order status on Supabase:", error);
          });
        }

        return updatedOrder;
      }
      return ord;
    });

    setOrders(updated);
    saveItemAndSign(KEYS.ORDERS, updated);
    addSystemAuditLog(
      'ORDER_STATUS_UPDATE', 
      `Đơn hàng ${orderId} chuyển trạng thái thành [${newStatus}].`
    );
  };

  // Admin imports inventory stock
  const reimportStock = (ingredientId: string, amount: number) => {
    const updated = ingredients.map(ing => {
      if (ing.id === ingredientId) {
        const updatedIng = {
          ...ing,
          currentStock: ing.currentStock + amount
        };

        if (supabase && !isOffline) {
          supabase.from('ingredients').update({
            current_stock: updatedIng.currentStock
          }).eq('id', ingredientId).then(({ error }) => {
            if (error) console.error("Error updating stock on Supabase:", error);
          });
        }

        return updatedIng;
      }
      return ing;
    });

    setIngredients(updated);
    saveItemAndSign(KEYS.INGREDIENTS, updated);
    
    addSystemAuditLog(
      'STOCK_REIMPORT', 
      `Nhập kho bổ sung nguyên liệu: [${ingredients.find(i=>i.id===ingredientId)?.name}] +${amount} ${ingredients.find(i=>i.id===ingredientId)?.unit}`
    );

    if (isOffline) {
      const offlineAct: OfflineAction = {
        id: 'ACT_' + Date.now(),
        type: 'UPDATE_STOCK',
        payload: { ingredientId, amount },
        timestamp: new Date().toISOString()
      };
      const updatedQueue = [...offlineQueue, offlineAct];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(KEYS.QUEUE, JSON.stringify(updatedQueue));
    }
  };

  // Register loyalty member
  const registerNewMember = (name: string, phone: string, email?: string): CustomerAccount | string => {
    const cleanedPhone = phone.trim();
    if (customers.find(c => c.phone === cleanedPhone)) {
      return 'Số điện thoại thành viên này đã tồn tại trên hệ thống bảo mật.';
    }

    const newCust: CustomerAccount = {
      phone: cleanedPhone,
      name: name.trim(),
      email: email ? email.trim() : undefined,
      points: 10,
      tier: MembershipTier.BRONZE,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };

    const updated = [...customers, newCust];
    setCustomers(updated);
    saveItemAndSign(KEYS.CUSTOMERS, updated);

    setLoggedInCustomer(newCust);

    if (supabase && !isOffline) {
      supabase.from('customers').insert([{
        phone: newCust.phone,
        name: newCust.name,
        email: newCust.email,
        points: newCust.points,
        tier: newCust.tier,
        total_spent: newCust.totalSpent,
        created_at: newCust.createdAt
      }]).then(({ error }) => {
        if (error) console.error("Error registering customer on Supabase:", error);
      });
    }

    addSystemAuditLog(
      'MEMBER_REGISTER', 
      `Đăng ký thành viên mới: ${newCust.name} (${newCust.phone}) - Tặng ngay 10 điểm chào mừng.`
    );

    if (isOffline) {
      const offlineAct: OfflineAction = {
        id: 'ACT_' + Date.now(),
        type: 'REGISTER_CUSTOMER',
        payload: newCust,
        timestamp: new Date().toISOString()
      };
      const updatedQueue = [...offlineQueue, offlineAct];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(KEYS.QUEUE, JSON.stringify(updatedQueue));
    }

    return newCust;
  };

  // Add notification promo
  const addNewPromotion = (promo: Omit<PromotionNotification, 'id'>) => {
    const newPromo: PromotionNotification = {
      ...promo,
      id: 'promo_' + Date.now(),
    };
    const updated = [newPromo, ...promotions];
    setPromotions(updated);
    saveItemAndSign(KEYS.PROMOTIONS, updated);

    if (supabase && !isOffline) {
      supabase.from('promotions').insert([{
        id: newPromo.id,
        title: newPromo.title,
        content: newPromo.content,
        code: newPromo.code,
        discount_percent: newPromo.discountPercent,
        active: newPromo.active,
        expiry_date: newPromo.expiryDate
      }]).then(({ error }) => {
        if (error) console.error("Error inserting promotion to Supabase:", error);
      });
    }

    addSystemAuditLog('PROMO_ADD', `Tạo thông báo khuyến mãi mới: ${newPromo.title} [Mã: ${newPromo.code}]`);
  };

  // Manage menu items
  const updateMenuItem = (updatedItem: MenuItem) => {
    const updated = menu.map(item => item.id === updatedItem.id ? updatedItem : item);
    setMenu(updated);
    saveItemAndSign(KEYS.MENU, updated);

    if (supabase && !isOffline) {
      supabase.from('menu').update({
        name: updatedItem.name,
        price: updatedItem.price,
        category: updatedItem.category,
        image_url: updatedItem.imageUrl,
        recipe: updatedItem.recipe,
        available: updatedItem.available,
        description: updatedItem.description
      }).eq('id', updatedItem.id).then(({ error }) => {
        if (error) console.error("Error updating menu item on Supabase:", error);
      });
    }

    addSystemAuditLog('MENU_EDIT', `Cập nhật thông tin món: ${updatedItem.name} [Mã: ${updatedItem.id}]`);
  };

  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: 'm_' + Date.now().toString()
    };
    const updated = [...menu, newItem];
    setMenu(updated);
    saveItemAndSign(KEYS.MENU, updated);

    if (supabase && !isOffline) {
      supabase.from('menu').insert([{
        id: newItem.id,
        name: newItem.name,
        price: newItem.price,
        category: newItem.category,
        image_url: newItem.imageUrl,
        recipe: newItem.recipe,
        available: newItem.available,
        description: newItem.description
      }]).then(({ error }) => {
        if (error) console.error("Error inserting menu item to Supabase:", error);
      });
    }

    addSystemAuditLog('MENU_ADD', `Thêm món mới vào thực đơn: ${newItem.name} [Giá: ${newItem.price.toLocaleString()}đ]`);
  };

  const deleteMenuItem = (id: string) => {
    const itemToDelete = menu.find(item => item.id === id);
    if (!itemToDelete) return;
    const updated = menu.filter(item => item.id !== id);
    setMenu(updated);
    saveItemAndSign(KEYS.MENU, updated);

    if (supabase && !isOffline) {
      supabase.from('menu').delete().eq('id', id).then(({ error }) => {
        if (error) console.error("Error deleting menu item from Supabase:", error);
      });
    }

    addSystemAuditLog('MENU_DELETE', `Xóa món khỏi thực đơn: ${itemToDelete.name} [Mã: ${id}]`);
  };

  // Security Simulation Tools
  const triggerTamperDemo = () => {
    localStorage.setItem(KEYS.CUSTOMERS, 'MALICIOUS_TAMPERED_TEXT_X_100_POINTS');
    
    addSystemAuditLog(
      'DATABASE_BREACH_SIMULATED', 
      'CẢNH BÁO: Phát hiện chỉnh sửa cơ sở dữ liệu vật lý ngoài vùng kiểm soát ứng dụng. Ngắt kết nối đồng bộ.', 
      'error'
    );
    
    loadDatabase();
  };

  const restoreCleanDatabase = () => {
    saveItemAndSign(KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
    saveItemAndSign(KEYS.MENU, INITIAL_MENU);
    saveItemAndSign(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    saveItemAndSign(KEYS.ORDERS, INITIAL_ORDERS);
    saveItemAndSign(KEYS.PROMOTIONS, INITIAL_PROMOTIONS);
    
    const repairLog: SecurityAuditLog = {
      id: 'LOG_REPAIR_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: 'SECURE_FIREWALL',
      role: UserRole.ADMIN,
      action: 'SELF_HEALING',
      details: 'Khôi phục và vá lỗ hổng cơ sở dữ liệu thành công. Chữ ký băm bảo an được cấp lại.',
      ipAddress: 'System Core Engine',
      integrityVerified: true
    };
    saveItemAndSign(KEYS.SECURITY, [repairLog]);
    
    setIsTampered(false);
    setTamperMessage('');

    if (supabase && !isOffline) {
      Promise.all([
        supabase.from('orders').delete().neq('id', ''),
        supabase.from('ingredients').delete().neq('id', ''),
        supabase.from('menu').delete().neq('id', ''),
        supabase.from('customers').delete().neq('phone', ''),
        supabase.from('promotions').delete().neq('id', ''),
        supabase.from('security_logs').delete().neq('id', '')
      ]).then(() => {
        populateSupabaseDefaults().then(() => {
          loadDatabase();
        });
      }).catch(err => {
        console.error("Error wiping Supabase on restore:", err);
      });
    } else {
      loadDatabase();
    }
  };


  return (
    <StoreContext.Provider value={{
      ingredients,
      menu,
      customers,
      orders,
      promotions,
      securityLogs,
      offlineQueue,
      currentRole,
      setCurrentRole,
      loggedInCustomer,
      loginCustomer,
      logoutCustomer,
      isOffline,
      toggleOfflineMode,
      isTampered,
      tamperMessage,
      triggerTamperDemo,
      restoreCleanDatabase,
      createOrder,
      updateOrderStatus,
      reimportStock,
      registerNewMember,
      addNewPromotion,
      addSystemAuditLog,
      updateMenuItem,
      addMenuItem,
      deleteMenuItem
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
