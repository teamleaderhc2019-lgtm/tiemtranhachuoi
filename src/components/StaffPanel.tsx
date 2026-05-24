/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from '../types';
import { 
  ClipboardList, CheckCircle, Flame, AlertTriangle, RefreshCcw, Landmark, 
  Trash2, Search, Sparkles, Plus, Minus, Check, X, Bell, Receipt
} from 'lucide-react';

const MenuImage: React.FC<{ src: string; alt: string; category: string; className?: string }> = ({ src, alt, category, className = "w-full h-full object-cover" }) => {
  const [hasError, setHasError] = React.useState(false);

  const getGradient = () => {
    if (category.includes('Trái Cây')) {
      return 'from-orange-400 to-rose-400';
    }
    if (category.includes('Trà Sữa')) {
      return 'from-amber-500/80 to-amber-600';
    }
    return 'from-emerald-500/80 to-emerald-600';
  };

  if (hasError || !src) {
    return (
      <div className={`w-full h-full bg-gradient-to-tr ${getGradient()} flex flex-col items-center justify-center p-2 text-center text-white relative rounded-xl border border-white/10 shadow-inner`}>
        <span className="text-xl drop-shadow-md">🧋</span>
        <span className="text-[7.5px] font-extrabold tracking-wider uppercase mt-1 truncate w-full drop-shadow-xs">{alt}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      onError={() => setHasError(true)}
      className={`${className} transition duration-500`}
      referrerPolicy="no-referrer"
    />
  );
};

export const StaffPanel: React.FC = () => {
  const { 
    orders, updateOrderStatus, ingredients, menu, createOrder, 
    loginCustomer, loggedInCustomer, logoutCustomer, registerNewMember, isOffline 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'pos'>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [mobileKitchenTab, setMobileKitchenTab] = useState<'pending' | 'brewing' | 'history'>('pending');
  
  // Quick POS states
  const [posCart, setPosCart] = useState<{ menuItemId: string; name: string; price: number; quantity: number }[]>([]);
  const [posMemberPhone, setPosMemberPhone] = useState('');
  const [posMemberName, setPosMemberName] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  
  const [posAuthError, setPosAuthError] = useState('');
  const [posAuthSuccess, setPosAuthSuccess] = useState('');
  const [printedPOSOrder, setPrintedPOSOrder] = useState<any | null>(null);


  // Sưu tập nguyên liệu sắp hết hàng
  const lowStockIngredients = ingredients.filter(ing => ing.currentStock <= ing.minStock);

  // Active status queues
  const filteredOrders = orders.filter(ord => {
    if (orderSearch) {
      return ord.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
             (ord.customerPhone && ord.customerPhone.includes(orderSearch));
    }
    return true;
  });

  const pendingOrders = filteredOrders.filter(o => o.status === OrderStatus.PENDING);
  const brewingOrders = filteredOrders.filter(o => o.status === OrderStatus.BREWING);
  const completedOrders = filteredOrders.filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED).slice(0, 15);

  // POS Add item
  const handlePOSAddToCart = (menuItem: any) => {
    const existing = posCart.find(item => item.menuItemId === menuItem.id);
    if (existing) {
      setPosCart(posCart.map(item => 
        item.menuItemId === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setPosCart([...posCart, { menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: 1 }]);
    }
  };

  const handlePOSUpdateQty = (menuItemId: string, delta: number) => {
    const updated = posCart.map(item => {
      if (item.menuItemId === menuItemId) {
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setPosCart(updated);
  };

  // Check customer points login inside POS
  const handlePOSVerifyMember = () => {
    setPosAuthError('');
    setPosAuthSuccess('');
    if (!posMemberPhone) {
      setPosAuthError('Vui lòng nhập số điện thoại');
      return;
    }
    const customer = loginCustomer(posMemberPhone);
    if (customer) {
      setPosAuthSuccess(`Đã áp dụng thành viên: ${customer.name} (Hạng ${customer.tier})`);
    } else {
      setPosAuthError('Thành viên này chưa có trong bộ cơ sở dữ liệu bảo mật!');
    }
  };

  const handlePOSCheckout = () => {
    if (posCart.length === 0) return;
    
    const subtotal = posCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let discount = 0;
    
    if (loggedInCustomer) {
      // 5% reduction for gold, 10% for platinum
      const percent = loggedInCustomer.tier === 'GOLD' ? 5 : loggedInCustomer.tier === 'PLATINUM' ? 10 : 0;
      discount = Math.floor((subtotal * percent) / 100);
    }

    // Adapt to standard items structure
    const orderLines = posCart.map((item, idx) => ({
      id: `pos_line_${idx}_${Date.now()}`,
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      sweetness: 100,
      ice: 100,
      toppings: []
    }));

    // Place order directly
    const created = createOrder(
      orderLines,
      subtotal,
      discount,
      posPaymentMethod,
      undefined
    );

    // Complete POS order automatically since it is handled manually at register
    updateOrderStatus(created.id, OrderStatus.COMPLETED);

    // Reset POS form
    setPosCart([]);
    setPosMemberPhone('');
    setPosMemberName('');
    logoutCustomer();
    setPosAuthSuccess('');
    setPosAuthError('');
    
    // Save for receipt printing modal
    setPrintedPOSOrder(created);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-amber-100 text-amber-900 border-amber-200 animate-pulse';
      case OrderStatus.BREWING: return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      case OrderStatus.COMPLETED: return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case OrderStatus.CANCELLED: return 'bg-slate-200 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab select & critical alerts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
          <button
            id="tab-orders-queue"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'orders' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Quản Lý Quầy Pha Chế
          </button>
          <button
            id="tab-pos-terminal"
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'pos' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đơn Thanh Toán Tại Quầy (POS Cashier)
          </button>
        </div>

        {/* Real-time inventory alert notification */}
        {lowStockIngredients.length > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-3.5 py-2 rounded-2xl text-xs text-rose-800 shadow-3xs animate-bounce">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">Cảnh báo: {lowStockIngredients.length} nguyên liệu trong kho sắp hết hàng!</span>
          </div>
        )}
      </div>

      {/* RENDER QUEUE ACCORDINGLY */}
      {activeTab === 'orders' ? (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-4 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#8FB9A8]" />
              <span>Tiến Độ Bếp / Monitor</span>
            </h3>

            {/* In-tab search order */}
            <div className="relative w-full sm:w-64">
              <input
                id="search-order-id"
                type="text"
                placeholder="Tìm mã hoá đơn, sđt..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-[#8FB9A8]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Mobile Kitchen Tabs */}
          <div className="flex lg:hidden gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
            {(['pending', 'brewing', 'history'] as const).map(tab => {
              const label = tab === 'pending' ? 'Chờ tiếp nhận' : tab === 'brewing' ? 'Đang pha chế' : 'Lịch sử';
              const count = tab === 'pending' ? pendingOrders.length : tab === 'brewing' ? brewingOrders.length : completedOrders.length;
              const active = mobileKitchenTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setMobileKitchenTab(tab)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all btn-press-effect flex items-center justify-center gap-1 ${
                    active 
                      ? 'bg-[#8FB9A8] text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                    active ? 'bg-white text-[#5f8776]' : 'bg-slate-250 text-slate-605'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: PENDING ORDERS */}
            <div className={`${mobileKitchenTab === 'pending' ? 'block' : 'hidden lg:block'} space-y-4`}>
              <div className="flex justify-between items-center pb-2 border-b border-[#8FB9A8]">
                <span className="text-xs font-bold text-slate-850 flex items-center gap-1.5 bg-[#8FB9A8]/10 px-3 py-1.5 rounded-full">
                  📥 Chờ tiếp nhận
                  <span className="w-5 h-5 bg-[#8FB9A8] text-white text-[10px] font-mono flex items-center justify-center rounded-full">
                    {pendingOrders.length}
                  </span>
                </span>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {pendingOrders.length > 0 ? (
                  pendingOrders.map(ord => (
                    <div key={ord.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs hover:border-amber-200 space-y-3 transition duration-200">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-amber-900 block bg-amber-50 px-2 py-0.5 rounded w-fit">
                            {ord.id}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono block mt-1">
                            {new Date(ord.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[9px] px-2 py-0.5 rounded-full border bg-blue-50 text-indigo-800 border-indigo-100">
                          {ord.paymentMethod === PaymentMethod.ONLINE_QR ? 'ONLINE QR (PAID)' : 'TIỀN MẶT'}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="border-t border-dashed border-slate-100 pt-2.5 space-y-1.5 text-xs">
                        {ord.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-[11px] font-medium">
                            <span className="text-slate-800">
                              {it.quantity}x {it.name} <span className="text-[9px] text-slate-400 font-normal">(Ngọt: {it.sweetness}% | Đá: {it.ice}%)</span>
                            </span>
                            <span className="text-slate-500 font-mono">{(it.price * it.quantity).toLocaleString()}đ</span>
                          </div>
                        ))}
                      </div>

                      {/* Customer loyalty detail */}
                      {ord.customerName && (
                        <div className="bg-slate-50 rounded-xl p-2 border text-[10px] text-slate-600 font-mono">
                          👤 Khách hàng: <strong>{ord.customerName}</strong> ({ord.customerPhone})
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-slate-50">
                        <button
                          id={`cancel-order-${ord.id}`}
                          onClick={() => updateOrderStatus(ord.id, OrderStatus.CANCELLED)}
                          className="w-full py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-semibold rounded-xl cursor-pointer"
                        >
                          Hủy đơn
                        </button>
                        <button
                          id={`brew-order-${ord.id}`}
                          onClick={() => {
                            updateOrderStatus(ord.id, OrderStatus.BREWING);
                            setMobileKitchenTab('brewing');
                          }}
                          className="w-full py-1.5 bg-amber-800 text-amber-50 hover:bg-amber-900 text-[10px] font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Flame className="w-3.5 h-3.5" /> Pha chế
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-350 text-xs">Không có yêu cầu trực tuyến nào.</div>
                )}
              </div>
            </div>

            {/* COLUMN 2: BREWING PROCESS */}
            <div className={`${mobileKitchenTab === 'brewing' ? 'block' : 'hidden lg:block'} space-y-4`}>
              <div className="flex justify-between items-center pb-2 border-b border-[#8FB9A8]">
                <span className="text-xs font-bold text-slate-850 flex items-center gap-1.5 bg-[#8FB9A8]/10 px-3 py-1.5 rounded-full">
                  🧋 Đang pha chế
                  <span className="w-5 h-5 bg-[#8FB9A8] text-white text-[10px] font-mono flex items-center justify-center rounded-full">
                    {brewingOrders.length}
                  </span>
                </span>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {brewingOrders.length > 0 ? (
                  brewingOrders.map(ord => (
                    <div key={ord.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-3xs hover:border-indigo-200 space-y-3 transition duration-200">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-indigo-900 block bg-indigo-50 px-2 py-0.5 rounded w-fit">
                            {ord.id}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono block mt-1">
                            {new Date(ord.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-indigo-700">
                          Boba Bar Mode
                        </span>
                      </div>

                      {/* Items */}
                      <div className="border-t border-dashed border-slate-100 pt-2.5 space-y-1.5 text-xs">
                        {ord.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-[11px] font-medium">
                            <span className="text-slate-800">
                              {it.quantity}x {it.name} <span className="text-[9px] text-slate-400 font-normal">(Ngọt: {it.sweetness}% | Đá: {it.ice}%)</span>
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-50">
                        <button
                          id={`complete-order-${ord.id}`}
                          onClick={() => {
                            updateOrderStatus(ord.id, OrderStatus.COMPLETED);
                            if (pendingOrders.length > 0) {
                              setMobileKitchenTab('pending');
                            } else {
                              setMobileKitchenTab('history');
                            }
                          }}
                          className="w-full py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Hoàn thành ly nước
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-350 text-xs">Hiện quầy bar đang tạm trống.</div>
                )}
              </div>
            </div>

            {/* COLUMN 3: HISTORIC TRANSACTIONS (PAST COMPLETED / CANCELLED) */}
            <div className={`${mobileKitchenTab === 'history' ? 'block' : 'hidden lg:block'} space-y-4`}>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-850 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                  💼 Hoá đơn lịch sử gần đây
                  <span className="w-5 h-5 bg-slate-500 text-white text-[10px] font-mono flex items-center justify-center rounded-full">
                    {completedOrders.length}
                  </span>
                </span>
              </div>

              <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
                {completedOrders.length > 0 ? (
                  completedOrders.map(ord => (
                    <div key={ord.id} className="bg-slate-50/50 border border-slate-200/50 p-3.5 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px] text-slate-500 font-semibold">{ord.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getStatusColor(ord.status)}`}>
                          {ord.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-[11px] text-slate-600 font-mono">
                        {ord.items.map((it, idx) => (
                          <div key={idx}>• {it.quantity}x {it.name}</div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-2 font-mono">
                        <span>Tổng: <strong>{ord.total.toLocaleString()}đ</strong></span>
                        <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-350 text-xs text-center border p-6 rounded-xl border-dashed">Chưa có giao dịch lịch sử.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* POS CASHIER SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Grid: Click to Add Drink selection */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <div className="bg-white p-4 border border-slate-100 rounded-2xl">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Chọn nhanh đồ uống bỏ túi (Chạm POS):</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {drink => {}} {/* Dummy loop to avoid ts errors, actual map is below */}
                {menu.map(drink => (
                  <button
                    id={`pos-add-${drink.id}`}
                    key={drink.id}
                    onClick={() => handlePOSAddToCart(drink)}
                    className="glass-panel hover-card-premium rounded-2xl border border-slate-200/50 p-2.5 text-left transition select-none flex flex-col justify-between h-40 active:scale-96 cursor-pointer group relative overflow-hidden"
                  >
                    <div className="w-full h-20 rounded-xl overflow-hidden mb-2 bg-slate-100 border border-slate-100/50 relative">
                      <MenuImage 
                        src={drink.imageUrl} 
                        alt={drink.name} 
                        category={drink.category}
                        className="w-full h-full object-cover group-hover:scale-108 transition duration-500"
                      />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-white/95 backdrop-blur-xs rounded-md text-[8px] font-mono text-[#5f8776] bg-[#8FB9A8]/10 font-bold shadow-3xs">
                        {drink.category}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <h4 className="font-bold text-slate-800 text-[11px] truncate group-hover:text-[#5f8776] transition-colors" title={drink.name}>{drink.name}</h4>
                      <span className="font-mono font-extrabold text-xs text-slate-700 block mt-0.5">{drink.price.toLocaleString()}đ</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Area: POS bill calculator */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                🧾 <span>Hoá Đơn POS Đang Chọn</span>
              </h4>
            </div>

            {/* Bill rows */}
            <div className="p-4 divide-y divide-slate-100 overflow-y-auto max-h-72">
              {posCart.length > 0 ? (
                posCart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <h5 className="font-semibold text-slate-800">{item.name}</h5>
                      <span className="font-mono text-slate-400 text-[11px]">{(item.price * item.quantity).toLocaleString()}đ</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        id={`pos-dec-${item.menuItemId}`}
                        onClick={() => handlePOSUpdateQty(item.menuItemId, -1)}
                        className="w-5 h-5 rounded-md bg-slate-100 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold px-1 text-slate-700">{item.quantity}</span>
                      <button
                        id={`pos-inc-${item.menuItemId}`}
                        onClick={() => handlePOSUpdateQty(item.menuItemId, 1)}
                        className="w-5 h-5 rounded-md bg-slate-100 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">Chưa có đồ uống nào trong hoá đơn POS.</div>
              )}
            </div>

            {/* POS Client membership integration inside register */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-550">KIỂM TRA TÍCH ĐIỂM SĐT KHÁCH:</label>
                <div className="flex gap-2">
                  <input
                    id="pos-member-phone"
                    type="tel"
                    placeholder="SĐT thành viên (10 số)"
                    maxLength={10}
                    value={posMemberPhone}
                    onChange={(e) => setPosMemberPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    id="pos-verify-member-btn"
                    onClick={handlePOSVerifyMember}
                    className="bg-slate-850 hover:bg-slate-900 text-white font-medium px-3.5 rounded-lg text-xs cursor-pointer shrink-0"
                  >
                    Xác nhận
                  </button>
                </div>
                {posAuthError && <p className="text-[10px] text-rose-500 font-semibold">{posAuthError}</p>}
                {posAuthSuccess && <p className="text-[11px] text-emerald-600 font-semibold">{posAuthSuccess}</p>}
              </div>

              {/* Payment selection */}
              <div className="space-y-1">
                <span className="block text-[10px] font-mono text-slate-550">PHƯƠNG THỨC THANH TOÁN:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="pos-pay-cash"
                    type="button"
                    onClick={() => setPosPaymentMethod(PaymentMethod.CASH)}
                    className={`py-1.5 rounded-lg font-semibold text-center text-xs border ${
                      posPaymentMethod === PaymentMethod.CASH 
                        ? 'bg-amber-800 border-amber-800 text-amber-50' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    💵 Tiền mặt
                  </button>
                  <button
                    id="pos-pay-qr"
                    type="button"
                    onClick={() => setPosPaymentMethod(PaymentMethod.ONLINE_QR)}
                    className={`py-1.5 rounded-lg font-semibold text-center text-xs border ${
                      posPaymentMethod === PaymentMethod.ONLINE_QR 
                        ? 'bg-amber-800 border-amber-800 text-amber-50' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    📱 Chuyển QR
                  </button>
                </div>
              </div>

              {/* Bill statistics details */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5 font-mono text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Cộng tiền cốc:</span>
                  <span>{posCart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}đ</span>
                </div>
                {loggedInCustomer && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Ưu đãi thành viên ({loggedInCustomer.tier}):</span>
                    <span>
                      -{(Math.floor((posCart.reduce((s,i)=>s+(i.price*i.quantity),0) * (loggedInCustomer.tier==='GOLD'?5:loggedInCustomer.tier==='PLATINUM'?10:0))/100)).toLocaleString()}đ
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-800 text-sm font-bold border-t border-slate-200 pt-2 font-sans">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-amber-900">
                    {(posCart.reduce((s, i) => s + (i.price * i.quantity), 0) - (loggedInCustomer ? Math.floor((posCart.reduce((s, i) => s + (i.price * i.quantity), 0) * (loggedInCustomer.tier==='GOLD'?5:loggedInCustomer.tier==='PLATINUM'?10:0))/100) : 0)).toLocaleString()} đ
                  </span>
                </div>
              </div>

              <button
                id="pos-checkout-btn"
                disabled={posCart.length === 0}
                onClick={handlePOSCheckout}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition uppercase cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Hoàn tất & in hoá đơn POS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS THERMAL RECEIPT MODAL PREVIEW */}
      {printedPOSOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Hóa Đơn Thanh Toán POS</span>
              </h4>
              <button
                id="close-pos-receipt-btn"
                onClick={() => setPrintedPOSOrder(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Screen Preview */}
            <div className="p-5 max-h-[60vh] overflow-y-auto bg-slate-50/50">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs font-mono text-[10.5px] text-slate-700 space-y-4 max-w-xs mx-auto">
                <div className="text-center pb-3 border-b border-dashed">
                  <h3 className="font-bold text-xs text-slate-800 uppercase">TeaFlow Boba Tea POS</h3>
                  <p className="text-[9px] text-slate-450 mt-1">Đ/c: 123 Đường Láng, Đống Đa, HN</p>
                  <p className="text-[9px] text-slate-450">Hotline: 0933.387.547</p>
                  <div className="mt-3.5 bg-slate-100 py-1 px-2.5 rounded font-bold text-slate-700 text-[10px] w-fit mx-auto">
                    HÓA ĐƠN POS BÁN LẺ
                  </div>
                  <p className="mt-2 text-[9px] font-bold text-amber-900">{printedPOSOrder.id}</p>
                  <p className="text-[8.5px] text-slate-400 mt-0.5">{new Date(printedPOSOrder.createdAt).toLocaleString('vi-VN')}</p>
                </div>

                {/* Items */}
                <div className="space-y-2 border-b border-dashed pb-3">
                  {printedPOSOrder.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start gap-1">
                      <div className="max-w-[70%]">
                        <div className="font-semibold text-slate-800">{it.name}</div>
                        <div className="text-[8.5px] text-slate-400">Đường: {it.sweetness}% | Đá: {it.ice}%</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span>{it.quantity}x</span>
                        <span className="ml-2 font-bold">{(it.price * it.quantity).toLocaleString()}đ</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1.5 border-b border-dashed pb-3 font-semibold text-slate-650">
                  <div className="flex justify-between">
                    <span>Cộng tiền cốc:</span>
                    <span>{printedPOSOrder.subtotal.toLocaleString()}đ</span>
                  </div>
                  {printedPOSOrder.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Chiết khấu giảm giá:</span>
                      <span>-{printedPOSOrder.discount.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800 text-xs font-bold pt-1">
                    <span>TỔNG THANH TOÁN:</span>
                    <span className="text-amber-900">{printedPOSOrder.total.toLocaleString()}đ</span>
                  </div>
                </div>

                {/* Bank QR Code display inside staff view to show customer */}
                {printedPOSOrder.paymentMethod === PaymentMethod.ONLINE_QR && (
                  <div className="text-center pt-2 space-y-2 bg-slate-50 p-2.5 rounded-xl border">
                    <p className="text-[8.5px] text-indigo-850 font-bold">QUÉT MÃ VIETQR THANH TOÁN</p>
                    <img
                      src={`https://img.vietqr.io/image/MB-0988668899-compact2.png?amount=${printedPOSOrder.total}&addInfo=MA%2520DON%2520${printedPOSOrder.id}&accountName=QUAN%2520TRA%2520SUA%2520BOBA%2520TEA`}
                      alt="VietQR POS"
                      className="w-32 h-32 mx-auto border bg-white p-1 rounded-lg"
                    />
                    <p className="text-[7.5px] text-slate-400 font-mono">Tự động xác nhận giao dịch</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                id="close-pos-receipt-btn-footer"
                type="button"
                onClick={() => setPrintedPOSOrder(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-550 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                id="print-pos-receipt-btn"
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                🖨️ In Hóa Đơn Nhiệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE THERMAL RECEIPT (VISIBLE ONLY ON PRINT) */}
      {printedPOSOrder && (
        <div id="thermal-receipt-print-area" className="hidden">
          <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '1px dashed black' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>TEAFLOW BOBA TEA SECURE</h2>
            <p style={{ margin: '2px 0', fontSize: '8px' }}>Đ/C: 123 Đường Láng, Đống Đa, Hà Nội</p>
            <p style={{ margin: '2px 0', fontSize: '8px' }}>Hotline: 0933.387.547</p>
            <h3 style={{ margin: '8px 0 0 0', fontSize: '9px', fontWeight: 'bold' }}>HÓA ĐƠN BÁN LẺ (POS RECEIPT)</h3>
            <p style={{ margin: '2px 0', fontSize: '8px', fontFamily: 'monospace' }}>Mã: {printedPOSOrder.id}</p>
            <p style={{ margin: '2px 0', fontSize: '7.5px' }}>Ngày: {new Date(printedPOSOrder.createdAt).toLocaleString('vi-VN')}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '8.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed black' }}>
                <th style={{ textAlign: 'left', paddingBottom: '3px' }}>Món nước</th>
                <th style={{ textAlign: 'center', paddingBottom: '3px', width: '20px' }}>SL</th>
                <th style={{ textAlign: 'right', paddingBottom: '3px', width: '50px' }}>T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {printedPOSOrder.items.map((it: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px dotted #ddd' }}>
                  <td style={{ padding: '3px 0', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 'bold' }}>{it.name}</div>
                    <div style={{ fontSize: '7px', color: '#666' }}>
                      Đường: {it.sweetness}% | Đá: {it.ice}%
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '3px 0', verticalAlign: 'top' }}>{it.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '3px 0', verticalAlign: 'top', fontFamily: 'monospace' }}>
                    {(it.price * it.quantity).toLocaleString()}đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed black', fontSize: '8.5px', fontFamily: 'monospace', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cộng tiền cốc:</span>
              <span>{printedPOSOrder.subtotal.toLocaleString()}đ</span>
            </div>
            {printedPOSOrder.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Giảm giá:</span>
                <span>-{printedPOSOrder.discount.toLocaleString()}đ</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9.5px', marginTop: '4px', borderTop: '1px dotted black', paddingTop: '4px' }}>
              <span>TỔNG THU:</span>
              <span>{printedPOSOrder.total.toLocaleString()}đ</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px', borderTop: '1px dashed black', paddingTop: '8px' }}>
            {printedPOSOrder.paymentMethod === PaymentMethod.ONLINE_QR && (
              <div style={{ marginBottom: '8px', display: 'inline-block' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '7.5px', fontWeight: 'bold' }}>QUÉT MÃ THANH TOÁN (VIETQR)</p>
                <img
                  src={`https://img.vietqr.io/image/MB-0988668899-compact2.png?amount=${printedPOSOrder.total}&addInfo=MA%2520DON%2520${printedPOSOrder.id}&accountName=QUAN%2520TRA%2520SUA%2520BOBA%2520TEA`}
                  alt="VietQR Print"
                  style={{ width: '90px', height: '90px', margin: '0 auto', border: '1px solid #ccc', padding: '1px', background: 'white' }}
                />
              </div>
            )}
            <p style={{ margin: '2px 0', fontSize: '8px', fontWeight: 'bold' }}>HẸN GẶP LẠI QUÝ KHÁCH!</p>
            <p style={{ margin: '2px 0', fontSize: '6px', color: '#555' }}>Vận hành bởi TeaFlow POS v1.2</p>
          </div>
        </div>
      )}
    </div>
  );
};
