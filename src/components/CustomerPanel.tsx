/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { MenuItem, PaymentMethod, OrderItem, MembershipTier } from '../types';
import { generateVietQRUrl } from '../utils/security';
import { recommendDrinks } from '../utils/ai';
import { 
  Coffee, Search, Sparkles, Tag, ShoppingCart, Check, User, Heart, 
  ChevronRight, Smartphone, AlertCircle, RefreshCw, X, Receipt, CheckCircle2,
  MessageSquare, Send
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

export const CustomerPanel: React.FC = () => {
  const { 
    menu, promotions, loggedInCustomer, loginCustomer, logoutCustomer, 
    registerNewMember, createOrder, isOffline 
  } = useStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  
  // Cart state
  const [cart, setCart] = useState<{
    menuItem: MenuItem;
    quantity: number;
    sweetness: number;
    ice: number;
    size: 'M' | 'L' | 'XL';
    toppings: { toppingId: string; name: string; price: number }[];
  }[]>([]);

  // Promo state
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Selector or modal state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [sweetness, setSweetness] = useState<number>(100);
  const [ice, setIce] = useState<number>(100);
  const [size, setSize] = useState<'M' | 'L' | 'XL'>('M');
  const [selectedToppings, setSelectedToppings] = useState<{ toppingId: string; name: string; price: number }[]>([]);

  // Auth form
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Checkout modal
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.ONLINE_QR);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment' | 'success'>('details');
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [qrSimulationTimer, setQrSimulationTimer] = useState<boolean>(false);

  // AI Assistant Chatbot states
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Xin chào! Tôi là Trợ lý Pha chế AI của TeaFlow 🧋. Tôi có thể gợi ý các món nước tuyệt vời dựa trên khẩu vị hoặc tâm trạng của bạn hôm nay.\n\nHãy thử hỏi: *"Tôi muốn một ly trà sữa mát lạnh, ít béo"* hoặc *"Trà trái cây nào bán chạy nhất?"*' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // AI Quick Matcher states
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [aiMatchResult, setAiMatchResult] = useState<{
    menuItem: MenuItem;
    reason: string;
    suggestedSweetness: number;
    suggestedIce: number;
  } | null>(null);
  const [aiMatchError, setAiMatchError] = useState('');

  // Auto scroll chat to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiChatOpen]);

  const handleQuickAIMatch = async (mood: string) => {
    setAiMatchLoading(true);
    setAiMatchError('');
    setAiMatchResult(null);
    
    try {
      const systemPrompt = `Dựa trên thực đơn sau đây, hãy đề xuất đúng một món nước duy nhất phù hợp tốt nhất với mô tả tâm trạng hoặc yêu cầu: "${mood}".
      Thực đơn: ${JSON.stringify(menu.map(m => ({ id: m.id, name: m.name, category: m.category, description: m.description, price: m.price })))}
      
      Bạn PHẢI trả về kết quả dưới dạng một chuỗi JSON hợp lệ tuyệt đối, không chứa dấu mở đầu hay kết thúc bằng chữ hay markdown bên ngoài block JSON, theo cấu trúc định dạng chính xác sau:
      {
        "itemId": "id_món_khớp",
        "reason": "Giải thích cuốn hút ngắn gọn tiếng Việt dưới 30 từ tại sao món này cực hợp",
        "suggestedSweetness": 70,
        "suggestedIce": 70
      }`;

      const responseText = await recommendDrinks(menu, systemPrompt, []);
      
      // Extract pure JSON
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      const matchedItem = menu.find(m => m.id === parsed.itemId);
      if (!matchedItem) {
        throw new Error("Không tìm thấy món nước khớp.");
      }
      
      setAiMatchResult({
        menuItem: matchedItem,
        reason: parsed.reason,
        suggestedSweetness: parsed.suggestedSweetness ?? 70,
        suggestedIce: parsed.suggestedIce ?? 70
      });
    } catch (err: any) {
      console.error(err);
      // Fallback matching
      const randomItem = menu[Math.floor(Math.random() * menu.length)];
      setAiMatchResult({
        menuItem: randomItem,
        reason: `Món nước đặc sắc thanh mát được đề xuất riêng cho bạn hôm nay!`,
        suggestedSweetness: 70,
        suggestedIce: 70
      });
    } finally {
      setAiMatchLoading(false);
    }
  };

  // Handle chatbot send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMsg = aiInput.trim();
    setAiInput('');
    const newMessages = [...aiMessages, { role: 'user' as const, text: userMsg }];
    setAiMessages(newMessages);
    setAiLoading(true);

    try {
      const responseText = await recommendDrinks(menu, userMsg, newMessages);
      setAiMessages([...newMessages, { role: 'model', text: responseText }]);
    } catch (err: any) {
      setAiMessages([...newMessages, { role: 'model', text: `❌ Rất tiếc, đã xảy ra lỗi khi kết nối với Trợ lý AI: ${err.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Render chatbot message contents with order buttons
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[ORDER:[a-zA-Z0-9_-]+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[ORDER:([a-zA-Z0-9_-]+)\]/);
      if (match) {
        const itemId = match[1];
        const menuItem = menu.find(m => m.id === itemId);
        if (!menuItem) return null;
        return (
          <button
            key={index}
            onClick={() => {
              openCustomizer(menuItem);
              setAiChatOpen(false); // Close chat to customize
            }}
            className="my-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 w-fit cursor-pointer shadow-xs active:scale-95 border border-slate-700/50"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chọn {menuItem.name} ({menuItem.price.toLocaleString()}đ)</span>
          </button>
        );
      }
      return <span key={index} className="whitespace-pre-line leading-relaxed">{part}</span>;
    });
  };

  // Categories extraction
  const categories = ['Tất cả', ...Array.from(new Set(menu.map(item => item.category)))];


  // Filter menu
  const filteredMenu = menu.filter(item => {
    const itemName = item.name || '';
    const itemDesc = item.description || '';
    const matchesSearch = itemName.toLowerCase().includes(search.toLowerCase()) || 
                          itemDesc.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchesSearch && matchesCategory && item.available;
  });

  // Handle addition setup
  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setSweetness(100);
    setIce(100);
    setSize('M');
    setSelectedToppings([]);
  };

  const handleToppingToggle = (id: string, name: string, price: number) => {
    const exists = selectedToppings.find(t => t.toppingId === id);
    if (exists) {
      setSelectedToppings(selectedToppings.filter(t => t.toppingId !== id));
    } else {
      setSelectedToppings([...selectedToppings, { toppingId: id, name, price }]);
    }
  };

  const addToCartDirect = () => {
    if (!customizingItem) return;
    
    setCart([
      ...cart,
      {
        menuItem: customizingItem,
        quantity: 1,
        sweetness,
        ice,
        size,
        toppings: selectedToppings
      }
    ]);
    
    setCustomizingItem(null);
  };

  // Modify cart item quantity
  const updateCartQty = (index: number, delta: number) => {
    const updated = [...cart];
    updated[index].quantity += delta;
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    }
    setCart(updated);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!phoneInput) {
      setAuthError('Vui lòng nhập số điện thoại.');
      return;
    }
    const customer = loginCustomer(phoneInput);
    if (customer) {
      setAuthSuccess(`Xin chào mừng, ${customer.name}!`);
      setPhoneInput('');
    } else {
      setAuthError('Số điện thoại chưa có trên hệ thống bảo mật. Bạn có muốn đăng ký thành viên mới bên dưới?');
      setIsRegistering(true);
    }
  };

  // Register handler
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!nameInput || !phoneInput) {
      setAuthError('Vui lòng nhập cả họ tên và số điện thoại.');
      return;
    }
    const res = registerNewMember(nameInput, phoneInput);
    if (typeof res === 'string') {
      setAuthError(res);
    } else {
      setAuthSuccess(`Chúc mừng thành viên mới ${res.name}! Bạn được tặng 10 điểm chào mừng.`);
      setPhoneInput('');
      setNameInput('');
      setIsRegistering(false);
    }
  };

  // Apply discount coupon code
  const handleApplyPromo = () => {
    setPromoError('');
    const found = promotions.find(p => p.code.toLowerCase() === promoCode.trim().toLowerCase() && p.active);
    if (found) {
      setAppliedPromo({
        code: found.code,
        percent: found.discountPercent
      });
      setPromoCode('');
    } else {
      setPromoError('Mã khuyến mãi không tồn tại hoặc đã hết hạn.');
    }
  };

  // Totals calculations
  const calculateCartSubtotal = () => {
    return cart.reduce((acc, item) => {
      const sizeSurcharge = item.size === 'L' ? 5000 : item.size === 'XL' ? 10000 : 0;
      const toppingsCost = item.toppings.reduce((tc, t) => tc + t.price, 0);
      return acc + (item.menuItem.price + sizeSurcharge + toppingsCost) * item.quantity;
    }, 0);
  };

  // Automated "Buy 2 Get 1 Free" rule (for every 3 items, the cheapest one is free)
  const getMua2Tang1Discount = () => {
    const flatPrices: number[] = [];
    cart.forEach(item => {
      const sizeSurcharge = item.size === 'L' ? 5000 : item.size === 'XL' ? 10000 : 0;
      const toppingsCost = item.toppings.reduce((tc, t) => tc + t.price, 0);
      const itemPriceWithSurcharges = item.menuItem.price + sizeSurcharge + toppingsCost;
      for (let i = 0; i < item.quantity; i++) {
        flatPrices.push(itemPriceWithSurcharges);
      }
    });

    if (flatPrices.length < 3) return 0;
    
    // Sort ascending
    flatPrices.sort((a, b) => a - b);
    
    const freeItemsCount = Math.floor(flatPrices.length / 3);
    let discountAmt = 0;
    for (let j = 0; j < freeItemsCount; j++) {
      discountAmt += flatPrices[j];
    }
    return discountAmt;
  };

  // Discount based on either applied Coupon or membership tier rewards
  const getSavings = () => {
    const subtotal = calculateCartSubtotal();
    const b2g1 = getMua2Tang1Discount();
    let percent = 0;
    
    // Member automatic discounts
    if (loggedInCustomer) {
      if (loggedInCustomer.tier === MembershipTier.GOLD) percent = 5; // 5% off
      if (loggedInCustomer.tier === MembershipTier.PLATINUM) percent = 10; // 10% off
    }

    // Compare with applied promo code (pick highest)
    if (appliedPromo) {
      percent = Math.max(percent, appliedPromo.percent);
    }

    // Apply percentage discount on the remaining total after Buy-2-Get-1
    return Math.floor(((subtotal - b2g1) * percent) / 100);
  };

  const getActiveDiscountPercentage = () => {
    let percent = 0;
    if (loggedInCustomer) {
      if (loggedInCustomer.tier === MembershipTier.GOLD) percent = 5;
      if (loggedInCustomer.tier === MembershipTier.PLATINUM) percent = 10;
    }
    if (appliedPromo) {
      percent = Math.max(percent, appliedPromo.percent);
    }
    return percent;
  };

  const handleCheckoutSubmit = () => {
    const subtotal = calculateCartSubtotal();
    const b2g1 = getMua2Tang1Discount();
    const savings = getSavings();
    const discount = b2g1 + savings;
    
    // Format orderItems
    const orderItems: OrderItem[] = cart.map((item, idx) => {
      const sizeSurcharge = item.size === 'L' ? 5000 : item.size === 'XL' ? 10000 : 0;
      return {
        id: `item_${idx}_${Date.now()}`,
        menuItemId: item.menuItem.id,
        name: `${item.menuItem.name} (${item.size})`,
        price: item.menuItem.price + sizeSurcharge,
        quantity: item.quantity,
        sweetness: item.sweetness,
        ice: item.ice,
        toppings: item.toppings
      };
    });

    const finalOrder = createOrder(
      orderItems, 
      subtotal, 
      discount, 
      paymentMethod,
      appliedPromo?.code || (b2g1 > 0 ? 'MUA2TANG1' : undefined)
    );

    setCreatedOrder(finalOrder);

    if (paymentMethod === PaymentMethod.ONLINE_QR) {
      setCheckoutStep('payment');
      // Simulate automatic scanning in 5 seconds
      setQrSimulationTimer(true);
      setTimeout(() => {
        setQrSimulationTimer(false);
        setCheckoutStep('success');
        setCart([]);
        setAppliedPromo(null);
      }, 4500);
    } else {
      setCheckoutStep('success');
      setCart([]);
      setAppliedPromo(null);
    }
  };

  const handleManualPaymentVerify = () => {
    setQrSimulationTimer(false);
    setCheckoutStep('success');
    setCart([]);
    setAppliedPromo(null);
  };

  // Render point goals progress
  const getPointsProgress = () => {
    if (!loggedInCustomer) return null;
    let nextTier = 'Silver';
    let targetPoints = 50;
    
    if (loggedInCustomer.tier === MembershipTier.SILVER) {
      nextTier = 'Vàng (Gold)';
      targetPoints = 200;
    } else if (loggedInCustomer.tier === MembershipTier.GOLD) {
      nextTier = 'Kim Cương (Platinum)';
      targetPoints = 500;
    } else if (loggedInCustomer.tier === MembershipTier.PLATINUM) {
      return (
        <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Thượng khách Kim Cương tối cao
        </span>
      );
    }

    const currentPoints = loggedInCustomer.points;
    const progressPercent = Math.min(100, Math.floor((currentPoints / targetPoints) * 100));

    return (
      <div className="w-full mt-2.5 bg-slate-100 rounded-full h-2 overflow-hidden relative border border-slate-200">
        <div 
          className="bg-amber-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-mono text-slate-500">
          <span>{currentPoints} điểm</span>
          <span>Hạng mới: {nextTier} ({targetPoints} p)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-1">
      {/* MENU AND CATALOG COLUMN */}
      <div className="col-span-1 lg:col-span-2 space-y-6">
        {/* Banner Khuyến Mãi */}
        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-5 shadow-xs overflow-hidden relative">
          <div className="absolute right-4 top-4 text-amber-200 pointer-events-none">
            <Sparkles className="w-16 h-16 rotate-12" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-amber-400 text-white rounded-lg">
              <Tag className="w-4 h-4" />
            </span>
            <h3 className="font-semibold text-slate-800 text-sm tracking-tight">Khu Vực Phân Phối Ưu Đãi Giảm Giá</h3>
          </div>
          <div className="space-y-3">
            {promotions.filter(p => p.active).slice(0, 2).map(promo => (
              <div key={promo.id} className="bg-white/90 border border-amber-200/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-xs">
                <div>
                  <h4 className="font-medium text-amber-900 mb-0.5">{promo.title}</h4>
                  <p className="text-slate-500 line-clamp-2 pr-4">{promo.content}</p>
                </div>
                <button
                  id={`apply-${promo.code}`}
                  onClick={() => {
                    setAppliedPromo({ code: promo.code, percent: promo.discountPercent });
                    addNotificationFlash(`Đã tự động áp dụng mã ưu đãi: ${promo.code}`);
                  }}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-3.5 py-1.5 rounded-lg font-mono font-medium transition cursor-pointer flex items-center gap-1 justify-center"
                >
                  Áp dụng [ {promo.code} ]
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Gemini AI Matcher Card Widget */}
        <div className="glass-panel rounded-3xl p-5 border border-slate-100/60 shadow-xs space-y-4 bg-gradient-to-r from-emerald-50/10 via-white to-amber-50/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#8FB9A8] text-white rounded-xl shadow-xs animate-pulse-gentle">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                  <span>Gemini AI Khớp Món Chân Ái</span>
                  <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-[#8FB9A8]/20 text-[#3f6b57]">Độc quyền</span>
                </h3>
                <p className="text-[10px] text-slate-400">Chọn tâm trạng của bạn hôm nay, Gemini AI sẽ chọn món nước hoàn hảo!</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: '❄️ Giải nhiệt ngày hè', mood: 'Tôi muốn giải nhiệt nắng nóng, sảng khoái tức thì' },
              { label: '⚡ Tỉnh táo tập trung', mood: 'Tôi cần nhiều năng lượng để tỉnh táo học tập và làm việc' },
              { label: '🌸 Ít béo & Lành mạnh', mood: 'Tôi thích đồ uống lành mạnh, healthy, thanh đạm, ít ngọt béo' },
              { label: '💖 Ngọt ngào lãng mạn', mood: 'Tôi muốn một ly trà ngọt ngào, lãng mạn cho buổi chiều thư thả' }
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAIMatch(preset.mood)}
                disabled={aiMatchLoading}
                className="px-3.5 py-2 rounded-2xl bg-white hover:bg-[#8FB9A8]/10 text-slate-700 hover:text-[#3f6b57] border border-slate-200/60 hover:border-[#8FB9A8]/40 transition text-xs font-semibold btn-press-effect disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Loading state */}
          {aiMatchLoading && (
            <div className="p-4 bg-slate-50/70 border border-dashed border-slate-250 rounded-2xl flex items-center justify-center gap-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-[#8FB9A8]" />
              <span className="text-xs text-slate-600 font-bold font-sans">Gemini AI đang lắng nghe nhịp tim vị giác của bạn...</span>
            </div>
          )}

          {/* Result state */}
          {aiMatchResult && !aiMatchLoading && (
            <div className="p-4 bg-white/80 backdrop-blur-md border border-[#8FB9A8]/30 rounded-2xl shadow-sm animate-slide-in-up flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 border relative">
                <MenuImage 
                  src={aiMatchResult.menuItem.imageUrl} 
                  alt={aiMatchResult.menuItem.name} 
                  category={aiMatchResult.menuItem.category}
                />
              </div>
              <div className="flex-1 space-y-1 text-center sm:text-left min-w-0">
                <span className="text-[8px] font-mono tracking-wider bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">
                  Đề xuất tối ưu nhất
                </span>
                <h4 className="font-extrabold text-slate-800 text-sm mt-1 truncate">{aiMatchResult.menuItem.name}</h4>
                <p className="text-[11px] text-slate-500 italic leading-snug">{aiMatchResult.reason}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[9px] text-[#3f6b57] font-mono font-bold">
                  <span>💡 Khuyên dùng: Đường {aiMatchResult.suggestedSweetness}%</span>
                  <span>•</span>
                  <span>Đá {aiMatchResult.suggestedIce === 70 ? 'Đủ' : `${aiMatchResult.suggestedIce}%`}</span>
                </div>
              </div>
              <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                <button
                  onClick={() => {
                    setCart([
                      ...cart,
                      {
                        menuItem: aiMatchResult.menuItem,
                        quantity: 1,
                        sweetness: aiMatchResult.suggestedSweetness,
                        ice: aiMatchResult.suggestedIce,
                        size: 'M',
                        toppings: []
                      }
                    ]);
                    addNotificationFlash(`Đã thêm nhanh ${aiMatchResult.menuItem.name} (Gợi ý bởi AI) vào giỏ!`);
                  }}
                  className="w-full bg-[#8FB9A8] hover:bg-[#7ba897] active:scale-95 btn-press-effect text-white font-bold px-4 py-2.5 rounded-2xl text-[11px] transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 animate-pulse-gentle"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Thêm nhanh ({aiMatchResult.menuItem.price.toLocaleString()}đ)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter / Search Controls */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-600" />
              <span>Khám Phá Menu Trà Sữa</span>
            </h3>
            
            {/* Search */}
            <div className="relative w-full md:w-64">
              <input
                id="search-menu"
                type="text"
                placeholder="Tìm trà sữa, matcha..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all placeholder:text-slate-400 bg-slate-50/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Categories Tab (Scrollbar-none horizontally swipeable capsules) */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory">
            {categories.map(cat => (
              <button
                id={`cat-${cat}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all btn-press-effect snap-start ${
                  selectedCategory === cat 
                    ? 'bg-[#8FB9A8] text-white shadow-md shadow-[#8FB9A8]/20' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Milk Tea Catalog Grid (Glassmorphism & premium hover effects) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenu.length > 0 ? (
            filteredMenu.map(item => (
              <div 
                key={item.id}
                id={`menu-card-${item.id}`}
                className="glass-panel hover-card-premium rounded-3xl border border-slate-100/60 overflow-hidden flex flex-col group justify-between"
              >
                <div className="p-4.5 flex gap-4">
                  <div className="w-22 h-22 rounded-2xl overflow-hidden shrink-0 bg-slate-100 border border-slate-100/50 relative">
                    <MenuImage 
                      src={item.imageUrl} 
                      alt={item.name} 
                      category={item.category}
                      className="w-full h-full object-cover group-hover:scale-108 transition duration-500"
                    />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-white/95 backdrop-blur-xs rounded-lg text-[9px] font-mono text-slate-500 font-bold shadow-3xs">
                      🧋
                    </span>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-[#5f8776] bg-[#8FB9A8]/10 px-2 py-0.5 rounded-md w-fit inline-block">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#5f8776] transition mt-1 truncate" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-medium">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="px-4.5 pb-4.5 pt-1.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/30">
                  <span className="font-mono font-extrabold text-[#3a3734] text-xs">
                    {item.price.toLocaleString()}đ
                  </span>
                  <button
                    id={`add-btn-${item.id}`}
                    onClick={() => openCustomizer(item)}
                    className="bg-[#8FB9A8] hover:bg-[#7ba897] active:scale-95 btn-press-effect text-white px-4.5 py-2 rounded-2xl text-[11px] font-bold cursor-pointer transition flex items-center gap-1 shadow-sm"
                  >
                    <span>Chọn món</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center text-center justify-center p-6">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Không tìm thấy món nước phù hợp với yêu cầu của bạn.</p>
            </div>
          )}
        </div>
      </div>

      {/* SHOPPING CART AND ACCOUNT LOYALTY COLUMN */}
      <div className="space-y-6">
        {/* LOYALTY / ACCOUNT CARD */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-5">
            <User className="w-48 h-48 -mr-12 -mb-12" />
          </div>
          
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Thẻ Thành Viên BobaTea Secure</span>
            </h3>
            <span className="text-[10px] font-mono tracking-widest text-[#ccd]">VIP PASSPORT</span>
          </div>

          {!loggedInCustomer ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Đăng nhập bằng số điện thoại để hưởng mức giá ưu đãi thành viên và tự động tích điểm thưởng!
              </p>
              
              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-3">
                {isRegistering && (
                  <div>
                    <label className="block text-[10px] font-mono tracking-wide mb-1 text-slate-400">TÊN CỦA BẠN</label>
                    <input
                      id="customer-name-input"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-mono tracking-wide mb-1 text-slate-400">SỐ ĐIỆN THOẠI</label>
                  <input
                    id="customer-phone-input"
                    type="tel"
                    placeholder="Nhập 10 số (ví dụ: 0987654321)"
                    required
                    maxLength={10}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {authError && (
                  <p className="text-[11px] text-rose-400 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </p>
                )}

                {authSuccess && (
                  <p className="text-[11px] text-emerald-400 flex items-start gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{authSuccess}</span>
                  </p>
                )}

                <div className="flex gap-2 pt-1.5">
                  <button
                    id="submit-auth-btn"
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-semibold py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    {isRegistering ? 'Đăng Ký Thành Viên' : 'Đăng Nhập'}
                  </button>
                  <button
                    id="toggle-register-btn"
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setAuthError('');
                    }}
                    className="px-3 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-xs transition transition-colors"
                  >
                    {isRegistering ? 'Quay lại' : 'Tạo thẻ mới'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-mono tracking-wide text-slate-400">HỌ TÊN THÀNH VIÊN</p>
                  <h4 className="font-semibold text-amber-300 mt-0.5">{loggedInCustomer.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{loggedInCustomer.phone}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full border ${
                    loggedInCustomer.tier === MembershipTier.PLATINUM 
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : loggedInCustomer.tier === MembershipTier.GOLD
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : loggedInCustomer.tier === MembershipTier.SILVER
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-stone-800 text-stone-400 border-stone-800'
                  }`}>
                    {loggedInCustomer.tier} MEMBER
                  </span>
                  
                  {loggedInCustomer.tier === MembershipTier.GOLD && (
                    <p className="text-[10px] text-amber-400 mt-1">🏷️ Tự động giảm 5% hóa đơn</p>
                  )}
                  {loggedInCustomer.tier === MembershipTier.PLATINUM && (
                    <p className="text-[10px] text-purple-300 mt-1">✨ Tự động giảm 10% hóa đơn</p>
                  )}
                </div>
              </div>

              {/* Thẻ tích điểm Mua 5 Tặng 1 */}
              <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-2.5">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span className="font-semibold text-[#8FB9A8]">🎫 THẺ TÍCH ĐIỂM (MUA 5 LY TẶNG 1):</span>
                  <span className="font-bold text-amber-300">{loggedInCustomer.points} ly</span>
                </div>
                
                {/* Stamp circles mimicking the poster */}
                <div className="grid grid-cols-6 gap-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800/60 items-center">
                  {[1, 2, 3, 4, 5].map(stampNum => {
                    const activeStamps = loggedInCustomer.points % 5;
                    const isStamped = loggedInCustomer.points > 0 && (activeStamps === 0 ? true : stampNum <= activeStamps);
                    return (
                      <div key={stampNum} className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                          isStamped 
                            ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-sm shadow-amber-400/20 scale-105' 
                            : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}>
                          {isStamped ? '✓' : stampNum}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-xl border-2 border-dashed flex items-center justify-center text-xs transition-all ${
                      loggedInCustomer.points > 0 && loggedInCustomer.points % 5 === 0 
                        ? 'bg-emerald-500 border-emerald-400 text-white animate-bounce' 
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`} title="Tặng 1 ly miễn phí">
                      🎁
                    </div>
                  </div>
                </div>
                <p className="text-[9.5px] text-slate-400 text-center leading-normal">
                  {loggedInCustomer.points > 0 && loggedInCustomer.points % 5 === 0 ? (
                    <span className="text-emerald-400 font-bold font-mono">🎉 Chúc mừng! Bạn có 1 ly quà tặng miễn phí!</span>
                  ) : (
                    <span>Mua thêm <strong className="text-amber-300 font-mono">{5 - (loggedInCustomer.points % 5)}</strong> ly để được tặng ngay 1 ly nước cực hịn 🎁</span>
                  )}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/5 pt-3">
                <span>Tổng chi tiêu: <strong>{loggedInCustomer.totalSpent.toLocaleString()} đ</strong></span>
                <button
                  id="logout-membership-btn"
                  onClick={logoutCustomer}
                  className="text-slate-400 hover:text-rose-400 text-[10px] font-mono flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <X className="w-3 h-3" /> Đăng xuất khách hàng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CUSTOMER CART */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-800" />
              <span>Giỏ Đồ Uống Của Bạn</span>
            </h3>
            <span className="bg-amber-800 text-amber-50 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)} ly
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {cart.length > 0 ? (
              cart.map((item, idx) => (
                <div key={idx} className="py-3 flex justify-between gap-3 text-xs first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <h5 className="font-semibold text-slate-800 leading-tight flex items-center gap-1.5 flex-wrap">
                      <span>{item.menuItem.name}</span>
                      <span className="text-[10px] bg-[#8FB9A8]/20 text-[#3f6b57] font-bold px-1.5 py-0.2 rounded-md font-mono shrink-0">
                        {item.size}
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Ngọt: {item.sweetness}% | Đá: {item.ice}%
                    </p>
                    {item.toppings.length > 0 && (
                      <p className="text-[10px] text-amber-800 font-medium">
                        + Topping: {item.toppings.map(t => t.name).join(', ')}
                      </p>
                    )}
                    <span className="font-mono text-[11px] font-bold text-slate-500 inline-block mt-0.5">
                      {(((item.menuItem.price + (item.size === 'L' ? 5000 : item.size === 'XL' ? 10000 : 0)) + item.toppings.reduce((s, t) => s + t.price, 0)) * item.quantity).toLocaleString()}đ
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    <button
                      id={`dec-qty-${idx}`}
                      onClick={() => updateCartQty(idx, -1)}
                      className="w-6 h-6 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center font-bold text-[#444] text-xs active:scale-90 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-semibold text-slate-700 w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      id={`inc-qty-${idx}`}
                      onClick={() => updateCartQty(idx, 1)}
                      className="w-6 h-6 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center font-bold text-[#444] text-xs active:scale-90 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <ShoppingCart className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Giỏ hàng rỗng. Hãy chọn món sữa ngon bên trái nhé!</p>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3 text-xs">
              {/* Shipping info banner */}
              <div className="bg-[#8FB9A8]/10 text-[#2f5441] p-2.5 rounded-xl text-[10px] border border-[#8FB9A8]/25 space-y-1">
                <p className="font-bold flex items-center gap-1 justify-center">
                  🏍️ Giao hàng tận nơi áp dụng từ 30K
                </p>
                <p className="text-center font-mono">
                  Hotline đặt hàng: <span className="font-bold text-emerald-800">0933.387.547</span>
                </p>
                {calculateCartSubtotal() >= 30000 ? (
                  <p className="text-center font-bold text-emerald-700 text-[9px]">✓ Đơn hàng ĐỦ điều kiện miễn phí giao hàng!</p>
                ) : (
                  <p className="text-center text-rose-600 text-[9px] font-medium">✗ Thiếu {(30000 - calculateCartSubtotal()).toLocaleString()}đ để đủ điều kiện ship hàng.</p>
                )}
              </div>

              {/* Promo code inputs */}
              <div className="flex gap-2">
                <input
                  id="promo-code-input"
                  type="text"
                  placeholder="Mã voucher (HE2026, ...)"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoError('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:outline-none focus:ring-amber-500"
                />
                <button
                  id="apply-code-btn"
                  onClick={handleApplyPromo}
                  className="bg-slate-800 text-white hover:bg-slate-900 active:scale-95 px-3 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                >
                  Nhập mã
                </button>
              </div>
              {promoError && <p className="text-[10px] text-rose-500 font-mono">{promoError}</p>}
              {appliedPromo && (
                <div className="flex justify-between text-[11px] text-emerald-600 font-medium font-mono">
                  <span>🎟️ Áp dụng voucher {appliedPromo.code}:</span>
                  <span>-{appliedPromo.percent}%</span>
                </div>
              )}

              {/* Point previews */}
              {loggedInCustomer && (
                <div className="flex justify-between text-[11px] text-slate-500 border-b border-dashed border-slate-200 pb-2">
                  <span>Điểm thưởng tích lũy ước tính:</span>
                  <span className="font-bold text-green-700 font-mono">+{Math.floor((calculateCartSubtotal() - getMua2Tang1Discount() - getSavings()) / 10000)} điểm</span>
                </div>
              )}

              {/* Bill Details */}
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Cộng tiền hàng:</span>
                  <span>{calculateCartSubtotal().toLocaleString()} đ</span>
                </div>
                {getMua2Tang1Discount() > 0 && (
                  <div className="flex justify-between text-emerald-600 text-[11px] font-semibold">
                    <span>🔥 Khuyến mãi MUA 2 TẶNG 1:</span>
                    <span>-{getMua2Tang1Discount().toLocaleString()} đ</span>
                  </div>
                )}
                {getSavings() > 0 && (
                  <div className="flex justify-between text-rose-500 text-[11px] font-medium">
                    <span>Ưu đãi voucher/thành viên:</span>
                    <span>-{getSavings().toLocaleString()} đ</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-800 text-sm font-bold border-t border-slate-200 pt-2">
                  <span>Tổng thanh toán:</span>
                  <span className="text-amber-900">{(calculateCartSubtotal() - getMua2Tang1Discount() - getSavings()).toLocaleString()} đ</span>
                </div>
              </div>

              {/* Method choice / Checkout action */}
              <button
                id="checkout-btn"
                onClick={() => {
                  setCheckoutStep('details');
                  setCheckingOut(true);
                }}
                className="w-full bg-amber-800 hover:bg-amber-900 active:scale-[0.98] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-4 h-4" />
                <span>Tiến hành đặt món trực tuyến</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOMIZER MENU POPUP MODAL (Bottom sheet drawer on Mobile, Centered Modal on Desktop) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4 no-print">
          <div className="bg-white rounded-t-[32px] md:rounded-3xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl animate-slide-up md:animate-in md:fade-in md:zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm">Cá nhân hóa ly trà sữa</h4>
              <button
                id="close-customizer-btn"
                onClick={() => setCustomizingItem(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product header */}
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border relative">
                  <MenuImage 
                    src={customizingItem.imageUrl} 
                    alt={customizingItem.name} 
                    category={customizingItem.category}
                  />
                </div>
                <div>
                  <h5 className="font-semibold text-slate-800">{customizingItem.name}</h5>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{customizingItem.description}</p>
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Chọn kích cỡ (Size):</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 'M', label: 'Size M (500ml)', surcharge: 'Gốc' },
                    { val: 'L', label: 'Size L (700ml)', surcharge: '+5.000đ' },
                    { val: 'XL', label: 'Size XL (1000ml)', surcharge: '+10.000đ' },
                  ].map(sz => (
                    <button
                      id={`size-${sz.val}`}
                      key={sz.val}
                      type="button"
                      onClick={() => setSize(sz.val as any)}
                      className={`p-2 rounded-xl text-xs flex flex-col items-center justify-center transition cursor-pointer border ${
                        size === sz.val 
                          ? 'bg-[#8FB9A8] border-[#8FB9A8] text-white font-semibold' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{sz.label}</span>
                      <span className={`text-[9px] font-mono mt-0.5 ${size === sz.val ? 'text-white' : 'text-slate-400'}`}>
                        {sz.surcharge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sweetness Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Mức Độ Đường (Ngọt):</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { val: 0, label: '0% (Không ngọt)' },
                    { val: 30, label: '30% (Ít ngọt)' },
                    { val: 50, label: '50% (Vừa)' },
                    { val: 70, label: '70% (Ít ngọt)' },
                    { val: 100, label: '100% (Ngọt)' },
                  ].map(sVal => (
                    <button
                      id={`sweet-${sVal.val}`}
                      key={sVal.val}
                      type="button"
                      onClick={() => setSweetness(sVal.val)}
                      className={`py-2 rounded-xl text-[10px] font-mono font-semibold transition cursor-pointer border flex flex-col items-center justify-center text-center ${
                        sweetness === sVal.val 
                          ? 'bg-[#8FB9A8] border-[#8FB9A8] text-white' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                      title={sVal.label}
                    >
                      <span className="font-bold">{sVal.val}%</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ice Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Mức Độ Lạnh (Đá):</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { val: 0, label: '0% (Không đá)' },
                    { val: 50, label: '50% (Ít đá)' },
                    { val: 70, label: '70% (Bình thường)' },
                    { val: 100, label: '100% (Nhiều đá)' },
                  ].map(iVal => (
                    <button
                      id={`ice-${iVal.val}`}
                      key={iVal.val}
                      type="button"
                      onClick={() => setIce(iVal.val)}
                      className={`py-2 rounded-xl text-[10px] font-mono font-semibold transition cursor-pointer border flex flex-col items-center justify-center text-center ${
                        ice === iVal.val 
                          ? 'bg-[#8FB9A8] border-[#8FB9A8] text-white' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                      title={iVal.label}
                    >
                      <span className="font-bold">{iVal.val === 70 ? '70% (Đủ)' : `${iVal.val}%`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toppings Addition Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Bổ sung Topping dòn dai đồng giá (+3.000đ):</label>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[
                    { id: 'top_thach_tc', name: 'Thạch Trái Cây', price: 3000 },
                    { id: 'top_thach_dua', name: 'Thạch Dừa', price: 3000 },
                    { id: 'top_hat_chia', name: 'Hạt Chia', price: 3000 },
                    { id: 'top_tc_trang', name: 'Trân Châu Trắng', price: 3000 },
                    { id: 'top_tc_den', name: 'Trân Châu Đen', price: 3000 },
                    { id: 'top_pudding', name: 'Pudding mềm', price: 3000 },
                    { id: 'top_nha_dam', name: 'Nha Đam tươi', price: 3000 },
                    { id: 'top_thach_phomai', name: 'Thạch Phô Mai', price: 3000 },
                  ].map(top => {
                    const checked = selectedToppings.some(t => t.toppingId === top.id);
                    return (
                      <button
                        id={`topping-${top.id}`}
                        key={top.id}
                        type="button"
                        onClick={() => handleToppingToggle(top.id, top.name, top.price)}
                        className={`p-2 rounded-xl border flex items-center justify-between text-[11px] font-medium transition cursor-pointer ${
                          checked 
                            ? 'bg-emerald-50/50 border-[#8FB9A8] text-emerald-900 shadow-3xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Check className={`w-3 h-3 text-emerald-600 shrink-0 ${checked ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="truncate">{top.name}</span>
                        </span>
                        <span className="font-mono text-slate-400 shrink-0 text-[10px]">+3k</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                id="cancel-customizer-btn"
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-medium transition"
              >
                Hủy bỏ
              </button>
              <button
                id="submit-customizer-btn"
                type="button"
                onClick={addToCartDirect}
                className="bg-amber-800 hover:bg-amber-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL DRAWER */}
      {checkingOut && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-800" />
                <span>Thanh Toán Hoá Đơn</span>
              </h4>
              <button
                id="close-checkout-btn"
                onClick={() => setCheckingOut(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: choosing options */}
            {checkoutStep === 'details' && (
              <div className="p-5 space-y-4">
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 border-dashed text-slate-800 text-xs text-center space-y-1 font-mono">
                  <p className="text-slate-500">Số tiền cần thanh toán:</p>
                  <p className="text-lg font-bold text-amber-900">
                    {(calculateCartSubtotal() - getSavings()).toLocaleString()} VND
                  </p>
                  {getActiveDiscountPercentage() > 0 && (
                    <p className="text-[10px] text-emerald-600">(Đã được giảm trừ {getActiveDiscountPercentage()}% ưu đãi)</p>
                  )}
                </div>

                {isOffline && (
                  <div className="bg-amber-500/10 text-amber-700 text-[10px] p-3 rounded-xl border border-amber-200/40 flex items-start gap-1.5 leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Hệ thống hiện đang hoạt động <strong>Ngoại Tuyến (Offline)</strong>. Giao dịch trực tuyến của bạn sẽ được bảo mật, hàng chờ tự động xử lý và đồng bộ khi kết nối mạng được phục hồi.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-755">Chọn cách thức thanh toán:</label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="pay-qr-btn"
                      type="button"
                      onClick={() => setPaymentMethod(PaymentMethod.ONLINE_QR)}
                      className={`p-3 rounded-2xl border text-center font-medium transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === PaymentMethod.ONLINE_QR
                          ? 'bg-amber-50/50 border-amber-600 text-amber-950'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-indigo-700" />
                      <span className="text-xs font-semibold leading-none">Chuyển Khoản QR</span>
                      <span className="text-[9px] text-slate-400 font-normal">Xử lý tự động nhanh</span>
                    </button>

                    <button
                      id="pay-cash-btn"
                      type="button"
                      disabled={isOffline}
                      onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                      className={`p-3 rounded-2xl border text-center font-medium transition flex flex-col items-center justify-center gap-1.5 ${
                        isOffline 
                          ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-300' 
                          : paymentMethod === PaymentMethod.CASH
                          ? 'bg-amber-50/50 border-amber-600 text-amber-950 cursor-pointer'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer'
                      }`}
                    >
                      <Receipt className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-semibold leading-none">Tiền Mặt tại POS</span>
                      <span className="text-[9px] text-slate-400 font-normal">Quầy thanh toán</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2.5">
                  <button
                    id="back-cart-btn"
                    onClick={() => setCheckingOut(false)}
                    className="w-full py-2.5 text-center border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Xem lại giỏ đồ
                  </button>
                  <button
                    id="submit-checkout-btn"
                    onClick={handleCheckoutSubmit}
                    className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: VietQR image simulation */}
            {checkoutStep === 'payment' && (
              <div className="p-5 space-y-4 text-center">
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-800 text-sm">Quét Mã VietQR Chuyển Khoản</h5>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Hệ thống tích hợp cổng thanh toán bảo mật VietQR. Vui lòng mở ngân hàng hoặc ví điện tử để quét mã.
                  </p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 inline-block shadow-xs mx-auto relative group">
                  <img
                    src={generateVietQRUrl(createdOrder?.total || 0, createdOrder?.id || '')}
                    alt="VietQR Scan"
                    className="w-48 h-48 mx-auto"
                  />
                  
                  {qrSimulationTimer && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-3xs flex flex-col items-center justify-center p-3 animate-pulse">
                      <RefreshCw className="w-8 h-8 text-amber-700 animate-spin mb-2" />
                      <p className="text-xs text-slate-700 font-medium">Đang mô phỏng giao dịch...</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">Đang lắng nghe phản hồi ngân hàng</p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 font-mono text-left text-[11px] text-indigo-900 space-y-1">
                  <p>🔹 <strong>Chủ TK:</strong> NGUYEN VAN ANH</p>
                  <p>🔹 <strong>Số TK:</strong> 0988668899 (MB Bank)</p>
                  <p>🔹 <strong>Giá trị:</strong> {createdOrder?.total.toLocaleString()}đ</p>
                  <p className="text-[10px]">🔹 <strong>Nội dung:</strong> MA DON {createdOrder?.id}</p>
                </div>

                <button
                  id="manual-verify-payment-btn"
                  onClick={handleManualPaymentVerify}
                  className="w-full py-2 bg-indigo-650 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Tôi đã hoàn tất chuyển khoản
                </button>
              </div>
            )}

            {/* Step 3: Success Screen */}
            {checkoutStep === 'success' && (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 text-sm">Đặt hàng và thanh toán trực tuyến thành công</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Hóa đơn bảo mật mang mã số <strong>{createdOrder?.id}</strong> đã được lưu trữ an toàn trong ví thành viên.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border text-left space-y-1 font-mono text-[10px] text-slate-500">
                  <p>✔️ Mã giao dịch: {createdOrder?.id}</p>
                  <p>✔️ Tổng hoá đơn: {createdOrder?.total.toLocaleString()} đ</p>
                  <p>✔️ Tích lũy: {createdOrder?.pointsEarned > 0 ? `+${createdOrder?.pointsEarned} điểm thành viên` : 'Chưa đăng nhập tích điểm'}</p>
                  <p>✔️ Trạng thái: Đang chuẩn bị pha chế...</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    id="finish-checkout-btn"
                    onClick={() => setCheckingOut(false)}
                    className="w-full py-2 bg-[#8FB9A8] hover:bg-[#7ba897] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Tiếp tục Order
                  </button>
                  <button
                    id="print-receipt-btn"
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200/60"
                  >
                    🖨️ In Hóa Đơn Nhiệt (Print)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING PILL STICKY CART BAR (MOBILE ONLY) */}
      {cart.length > 0 && !checkingOut && (
        <div className="fixed bottom-18 left-4 right-4 z-40 md:hidden animate-slide-in-up no-print">
          <button
            onClick={() => {
              setCheckoutStep('details');
              setCheckingOut(true);
            }}
            className="w-full bg-[#8FB9A8] hover:bg-[#7ba897] active:scale-95 text-white py-3 px-4.5 rounded-full flex items-center justify-between shadow-[0_8px_30px_rgba(143,185,168,0.22)] border border-[#8FB9A8]/20 btn-press-effect font-bold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="p-1 bg-white/20 rounded-full text-white">
                <ShoppingCart className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px]">Giỏ hàng: {cart.reduce((s, i) => s + i.quantity, 0)} ly</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span>Tính tiền:</span>
              <span className="font-mono text-xs">{(calculateCartSubtotal() - getSavings()).toLocaleString()}đ</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </div>
          </button>
        </div>
      )}

      {/* FLOATING AI ASSISTANT CHAT BUBBLE */}
      <div className="fixed bottom-6 right-6 z-45 no-print">
        <button
          id="ai-chat-bubble-btn"
          onClick={() => setAiChatOpen(true)}
          className="w-12 h-12 bg-slate-900 text-white hover:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition active:scale-95 animate-chat-bounce border border-slate-700/80"
          title="Trò chuyện với Trợ lý AI"
        >
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse-gentle" />
        </button>
      </div>

      {/* AI ASSISTANT DRAWER PANEL */}
      {aiChatOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-3xs flex justify-end no-print animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm h-full shadow-2xl border-l flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#8FB9A8] text-white rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight">Trợ lý Pha chế AI</h4>
                  <p className="text-[10px] text-slate-400">Gợi ý đồ uống theo gu của bạn</p>
                </div>
              </div>
              <button
                id="close-ai-chat-btn"
                onClick={() => setAiChatOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
              {aiMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-3xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#8FB9A8] text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium'
                    }`}
                  >
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border rounded-2xl rounded-tl-none p-3.5 text-xs shadow-3xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Trợ lý đang tìm công thức nước ngon...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Chat form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t bg-white flex gap-2">
              <input
                id="ai-chat-input-box"
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Nhập yêu cầu của bạn (VD: trà sữa ít ngọt, béo)..."
                disabled={aiLoading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition disabled:opacity-50"
              />
              <button
                id="ai-send-btn"
                type="submit"
                disabled={!aiInput.trim() || aiLoading}
                className="bg-[#8FB9A8] hover:bg-[#7ba897] disabled:opacity-50 text-white p-2 rounded-xl transition shrink-0 cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE THERMAL RECEIPT (VISIBLE ONLY ON PRINT) */}
      <div id="thermal-receipt-print-area" className="hidden">
        <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '1px dashed black' }}>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>TEAFLOW BOBA TEA SECURE</h2>
          <p style={{ margin: '2px 0', fontSize: '8px' }}>Đ/C: 123 Đường Láng, Đống Đa, Hà Nội</p>
          <p style={{ margin: '2px 0', fontSize: '8px' }}>Hotline: 0933.387.547</p>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>HÓA ĐƠN BÁN HÀNG (MUA ONLINE)</h3>
          <p style={{ margin: '2px 0', fontSize: '8px', fontFamily: 'monospace' }}>Mã đơn: {createdOrder?.id}</p>
          <p style={{ margin: '2px 0', fontSize: '8px' }}>Ngày: {createdOrder ? new Date(createdOrder.createdAt).toLocaleString('vi-VN') : ''}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '9px' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed black' }}>
              <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Tên món</th>
              <th style={{ textAlign: 'center', paddingBottom: '4px', width: '25px' }}>SL</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px', width: '60px' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {createdOrder?.items.map((it: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px dotted #ddd' }}>
                <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 'bold' }}>{it.name}</div>
                  <div style={{ fontSize: '7.5px', color: '#666' }}>
                    Đường: {it.sweetness}% | Đá: {it.ice}%
                  </div>
                  {it.toppings && it.toppings.length > 0 && (
                    <div style={{ fontSize: '7.5px', color: '#666' }}>
                      Topping: {it.toppings.map((t: any) => t.name).join(', ')}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center', padding: '4px 0', verticalAlign: 'top' }}>{it.quantity}</td>
                <td style={{ textAlign: 'right', padding: '4px 0', verticalAlign: 'top', fontFamily: 'monospace' }}>
                  {(it.price * it.quantity).toLocaleString()}đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed black', fontSize: '9px', fontFamily: 'monospace', lineHeight: '1.4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tiền hàng:</span>
            <span>{createdOrder?.subtotal.toLocaleString()}đ</span>
          </div>
          {createdOrder?.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ưu đãi giảm giá:</span>
              <span>-{createdOrder.discount.toLocaleString()}đ</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px', marginTop: '4px', borderTop: '1px dotted black', paddingTop: '4px' }}>
            <span>TỔNG CỘNG:</span>
            <span>{createdOrder?.total.toLocaleString()}đ</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px', borderTop: '1px dashed black', paddingTop: '8px' }}>
          <p style={{ margin: '2px 0', fontSize: '9px', fontWeight: 'bold' }}>CẢM ƠN QUÝ KHÁCH HÀNG!</p>
          <p style={{ margin: '2px 0', fontSize: '6.5px', color: '#555' }}>Hệ thống POS bảo mật 0-Trust</p>
        </div>
      </div>
    </div>
  );
};


// Global inline utility function to flash message
function addNotificationFlash(msg: string) {
  const container = document.getElementById('flash-alerts-container');
  if (!container) return;
  const alert = document.createElement('div');
  alert.className = "bg-slate-900 border border-slate-800 text-slate-100 px-4 py-2.5 rounded-xl shadows text-xs font-semibold flex items-center gap-1.5 opacity-90 animate-in slide-in-from-bottom duration-200 shrink-0";
  alert.innerHTML = `🌟 <span>${msg}</span>`;
  container.appendChild(alert);
  setTimeout(() => {
    alert.classList.add('animate-out', 'fade-out', 'duration-300');
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}
