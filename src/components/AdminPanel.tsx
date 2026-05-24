/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { OrderStatus, UserRole } from '../types';
import { analyzeBusiness } from '../utils/ai';
import { 
  TrendingUp, Layers, DollarSign, BatteryWarning, RefreshCw, PlusCircle, 
  ShieldAlert, ShieldCheck, Database, Ban, CheckCircle, Package, ArrowUpRight, FileText,
  Settings, Edit2, Trash2, Eye, EyeOff, Save, Check, X, Coffee,
  Sparkles, Download, Upload
} from 'lucide-react';


export const AdminPanel: React.FC = () => {
  const { 
    orders, ingredients, menu, reimportStock, securityLogs, 
    isTampered, tamperMessage, triggerTamperDemo, restoreCleanDatabase,
    updateMenuItem, addMenuItem, deleteMenuItem
  } = useStore();

  const [activeTab, setActiveTab] = useState<'reports' | 'menu_settings' | 'ai_insights'>('reports');
  const [importQty, setImportQty] = useState<{ [id: string]: string }>({});
  const [selectedMonth, setSelectedMonth] = useState('2026-05');

  // AI Insights & Security Backup states
  const [customApiKey, setCustomApiKey] = useState('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load custom key from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('TEAFLOW_CUSTOM_GEMINI_KEY');
    if (saved) setCustomApiKey(saved);
  }, []);

  // Save custom key
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('TEAFLOW_CUSTOM_GEMINI_KEY', customApiKey.trim());
    setNotification({ type: 'success', message: 'Đã cập nhật API Key Gemini cá nhân an toàn vào LocalStorage!' });
  };

  // Clear custom key
  const handleClearApiKey = () => {
    localStorage.removeItem('TEAFLOW_CUSTOM_GEMINI_KEY');
    setCustomApiKey('');
    setNotification({ type: 'success', message: 'Đã xóa API Key cá nhân. Hệ thống sẽ sử dụng key mặc định từ Cloud.' });
  };

  // Run AI Business Analysis
  const handleRunAIAnalysis = async () => {
    setAiAnalyzing(true);
    setAiAnalysisResult('');
    
    // Construct rich financial/inventory report data for Gemini
    const reportData = {
      selectedMonth,
      financials: {
        totalRevenue,
        totalIngredientCost,
        rentOverhead,
        netProfit,
        profitMarginPercent
      },
      lowStockCount,
      menuItemsCount: menu.length,
      ordersCount: orders.length,
      completedOrdersCount: completedOrders.length,
      ingredientsStock: ingredients.map(i => ({
        name: i.name,
        stock: i.currentStock,
        minStock: i.minStock,
        unit: i.unit,
        isLow: i.currentStock <= i.minStock
      })),
      consumedIngredients: consumedIngredientsReport
    };

    try {
      const insight = await analyzeBusiness(reportData, customApiKey);
      setAiAnalysisResult(insight);
      setNotification({ type: 'success', message: 'Trợ lý AI đã hoàn thành báo cáo phân tích chiến lược!' });
    } catch (err: any) {
      setAiAnalysisResult(`❌ Lỗi phân tích AI: ${err.message || 'Không thể kết nối đến máy chủ.'}`);
      setNotification({ type: 'error', message: 'Phân tích dữ liệu kinh doanh bằng AI gặp sự cố.' });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Export local database to a .json backup file
  const handleExportBackup = () => {
    try {
      // Gather raw localStorage content to keep encryption and signatures!
      const backupObj = {
        ingredients: localStorage.getItem('MILKTEA_SECURE_V1_ingredients') || '',
        ingredients_hash: localStorage.getItem('MILKTEA_SECURE_V1_ingredients_hash') || '',
        menu: localStorage.getItem('MILKTEA_SECURE_V1_menu') || '',
        menu_hash: localStorage.getItem('MILKTEA_SECURE_V1_menu_hash') || '',
        customers: localStorage.getItem('MILKTEA_SECURE_V1_customers') || '',
        customers_hash: localStorage.getItem('MILKTEA_SECURE_V1_customers_hash') || '',
        orders: localStorage.getItem('MILKTEA_SECURE_V1_orders') || '',
        orders_hash: localStorage.getItem('MILKTEA_SECURE_V1_orders_hash') || '',
        promotions: localStorage.getItem('MILKTEA_SECURE_V1_promotions') || '',
        promotions_hash: localStorage.getItem('MILKTEA_SECURE_V1_promotions_hash') || '',
        security: localStorage.getItem('MILKTEA_SECURE_V1_security') || '',
        security_hash: localStorage.getItem('MILKTEA_SECURE_V1_security_hash') || '',
        backupTimestamp: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Bao_Mat_BobaTea_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setNotification({ type: 'success', message: 'Xuất tệp tin sao lưu cơ sở dữ liệu có chữ ký số hoàn tất!' });
    } catch (err: any) {
      setNotification({ type: 'error', message: `Lỗi xuất sao lưu: ${err.message}` });
    }
  };

  // Import local database backup and restore perfectly
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // Validation check for key fields
        if (!importedData.ingredients || !importedData.menu || !importedData.customers || !importedData.orders) {
          throw new Error("Định dạng tệp sao lưu không hợp lệ hoặc thiếu phân vùng!");
        }

        // Restore exactly to localStorage (including hashes to prevent tamper alarms!)
        localStorage.setItem('MILKTEA_SECURE_V1_ingredients', importedData.ingredients);
        localStorage.setItem('MILKTEA_SECURE_V1_ingredients_hash', importedData.ingredients_hash);
        localStorage.setItem('MILKTEA_SECURE_V1_menu', importedData.menu);
        localStorage.setItem('MILKTEA_SECURE_V1_menu_hash', importedData.menu_hash);
        localStorage.setItem('MILKTEA_SECURE_V1_customers', importedData.customers);
        localStorage.setItem('MILKTEA_SECURE_V1_customers_hash', importedData.customers_hash);
        localStorage.setItem('MILKTEA_SECURE_V1_orders', importedData.orders);
        localStorage.setItem('MILKTEA_SECURE_V1_orders_hash', importedData.orders_hash);
        localStorage.setItem('MILKTEA_SECURE_V1_promotions', importedData.promotions || '');
        localStorage.setItem('MILKTEA_SECURE_V1_promotions_hash', importedData.promotions_hash || '');
        localStorage.setItem('MILKTEA_SECURE_V1_security', importedData.security || '');
        localStorage.setItem('MILKTEA_SECURE_V1_security_hash', importedData.security_hash || '');

        setNotification({ type: 'success', message: 'Phục hồi cơ sở dữ liệu thành công! Hệ thống đang khởi động lại...' });
        
        // Force refresh context and UI by reloading window or trigger restore hook
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err: any) {
        setNotification({ type: 'error', message: `Không thể khôi phục dữ liệu: ${err.message}` });
      }
    };
    fileReader.readAsText(file);
  };

  // Menu Settings local states
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(20000);
  const [formCategory, setFormCategory] = useState('Trà Trái Cây');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRecipe, setFormRecipe] = useState<{ ingredientId: string; amount: number }[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss notification after 4000ms
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);


  const startEdit = (item: any) => {
    setEditingItem(item);
    setIsAddingNew(false);
    setFormName(item.name);
    setFormPrice(item.price);
    
    const standardCategories = ['Trà Trái Cây', 'Trà Trái Cây Nhiệt Đới', 'Trà Sữa / Trà Sữa Trái Cây'];
    if (standardCategories.includes(item.category)) {
      setFormCategory(item.category);
      setUseCustomCategory(false);
      setCustomCategory('');
    } else {
      setFormCategory('OTHER');
      setUseCustomCategory(true);
      setCustomCategory(item.category);
    }
    
    setFormImage(item.imageUrl || '');
    setFormDesc(item.description || '');
    setFormRecipe(item.recipe || []);
  };

  const startAdd = () => {
    setEditingItem(null);
    setIsAddingNew(true);
    setFormName('');
    setFormPrice(18000);
    setFormCategory('Trà Trái Cây');
    setUseCustomCategory(false);
    setCustomCategory('');
    setFormImage('https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400');
    setFormDesc('');
    setFormRecipe([]);
  };

  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const finalCategory = useCustomCategory ? (customCategory.trim() || 'Khác') : formCategory;
    const recipeCleaned = formRecipe.filter(r => r.amount > 0);

    if (editingItem) {
      updateMenuItem({
        ...editingItem,
        name: formName,
        price: formPrice,
        category: finalCategory,
        imageUrl: formImage,
        description: formDesc,
        recipe: recipeCleaned,
      });
      setNotification({ type: 'success', message: `Đã cập nhật cấu hình cho món "${formName}" thành công!` });
      setEditingItem(null);
    } else if (isAddingNew) {
      addMenuItem({
        name: formName,
        price: formPrice,
        category: finalCategory,
        imageUrl: formImage,
        description: formDesc,
        recipe: recipeCleaned,
        available: true,
      });
      setNotification({ type: 'success', message: `Đã thêm món nước mới "${formName}" vào thực đơn thành công!` });
      setIsAddingNew(false);
    }
  };

  const handleRecipeAmountChange = (ingId: string, value: string) => {
    const amt = parseFloat(value);
    const numAmt = isNaN(amt) || amt < 0 ? 0 : amt;
    
    const existing = formRecipe.find(r => r.ingredientId === ingId);
    if (existing) {
      if (numAmt === 0) {
        setFormRecipe(formRecipe.filter(r => r.ingredientId !== ingId));
      } else {
        setFormRecipe(formRecipe.map(r => r.ingredientId === ingId ? { ...r, amount: numAmt } : r));
      }
    } else if (numAmt > 0) {
      setFormRecipe([...formRecipe, { ingredientId: ingId, amount: numAmt }]);
    }
  };

  // Completed orders
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);

  // DYNAMIC COMPUTATIONS: FINANCIALS
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  // Dynamic cost calculation based on actual ingredients consumed in completed orders
  const calculateIngredientUsageAndCost = () => {
    const consumptionMap: { [id: string]: { name: string; amount: number; unit: string; totalCost: number } } = {};
    
    // Initialize
    ingredients.forEach(ing => {
      consumptionMap[ing.id] = {
        name: ing.name,
        amount: 0,
        unit: ing.unit,
        totalCost: 0
      };
    });

    // Sum from completed orders
    completedOrders.forEach(ord => {
      ord.items.forEach(item => {
        const menuItem = menu.find(m => m.id === item.menuItemId);
        if (menuItem) {
          menuItem.recipe.forEach(recipeItem => {
            if (consumptionMap[recipeItem.ingredientId]) {
              consumptionMap[recipeItem.ingredientId].amount += recipeItem.amount * item.quantity;
            }
          });
        }
      });
    });

    // Calculate final costs
    return Object.keys(consumptionMap).map(id => {
      const ingDef = ingredients.find(i => i.id === id);
      const unitCost = ingDef?.unitCost || 0;
      const amount = consumptionMap[id].amount;
      const totalCost = amount * unitCost;
      consumptionMap[id].totalCost = totalCost;
      return {
        id,
        ...consumptionMap[id]
      };
    }).filter(c => c.amount > 0); // Only return used ingredients for clean reporting
  };

  const consumedIngredientsReport = calculateIngredientUsageAndCost();
  const totalIngredientCost = consumedIngredientsReport.reduce((sum, item) => sum + item.totalCost, 0);
  
  // Simulated utility/rent overhead: 1,500,000đ per month
  const rentOverhead = totalRevenue > 0 ? 1500000 : 0;
  const netProfit = Math.max(0, totalRevenue - totalIngredientCost - rentOverhead);
  const profitMarginPercent = totalRevenue > 0 ? Math.floor((netProfit / totalRevenue) * 100) : 0;

  // Stock alert counter
  const lowStockCount = ingredients.filter(i => i.currentStock <= i.minStock).length;

  // Handle stock reimport
  const handleReimportSubmit = (e: React.FormEvent, ingredientId: string) => {
    e.preventDefault();
    const qtyStr = importQty[ingredientId];
    if (!qtyStr) return;
    const qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0) return;

    const ing = ingredients.find(i => i.id === ingredientId);
    reimportStock(ingredientId, qty);
    setNotification({ type: 'success', message: `Bổ sung ${qty} ${ing?.unit || ''} cho nguyên liệu "${ing?.name || ingredientId}" thành công!` });
    setImportQty({
      ...importQty,
      [ingredientId]: ''
    });
  };

  // SVG CHART DATA: Simple Daily Trend helper
  const getDailySalesData = () => {
    // Generate dates: 2026-05-01 to 2026-05-24
    const salesByDay: { [day: string]: number } = {};
    for (let i = 1; i <= 24; i++) {
      const dayStr = `0${i}`.slice(-2);
      salesByDay[dayStr] = 0;
    }

    completedOrders.forEach(ord => {
      const day = ord.createdAt.substring(8, 10); // get DD from ISO
      if (salesByDay[day] !== undefined) {
        salesByDay[day] += ord.total;
      }
    });

    return Object.keys(salesByDay).map(day => ({
      day: parseInt(day),
      revenue: salesByDay[day]
    }));
  };

  const salesTrend = getDailySalesData();
  const maxDaySales = Math.max(...salesTrend.map(t => t.revenue), 100000);

  return (
    <div className="space-y-6">
      
      {/* SECURITY TAMPER WARNING ALERT (CRITICAL DATA PROTECTION) */}
      {isTampered && (
        <div className="bg-rose-950 text-white p-5 border-2 border-rose-500 rounded-3xl space-y-3 shadow-2xl relative overflow-hidden animate-pulse">
          <div className="absolute right-0 bottom-0 text-rose-900 pointer-events-none opacity-10">
            <ShieldAlert className="w-48 h-48 -mr-12 -mb-12" />
          </div>
          
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
            <h3 className="text-sm font-bold tracking-tight uppercase">PHÁT HIỆN THÂM NHẬP & GIẢ MẠO CƠ SỞ DỮ LIỆU</h3>
          </div>
          <p className="text-xs text-rose-300 leading-relaxed max-w-2xl">
            {tamperMessage}. Hệ thống bảo mật nâng cao BobaTea Secure đã kích hoạt tính năng đóng băng bộ nhớ để tự vệ, chặn tất cả đồng bộ lưu kho ngoại tuyến. Sổ cái toàn vẹn đã phát hiện một sự sai lệch nghiêm trọng ngoài dải nhị phân an toàn.
          </p>
          <div className="flex gap-2.5 pt-1">
            <button
              id="admin-restore-db"
              onClick={restoreCleanDatabase}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs text-white font-bold px-4 py-2 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-4 h-4" /> Khôi phục & Cấp lại chữ ký chứng thực
            </button>
          </div>
        </div>
      )}

      {/* Visual notification banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between gap-3 mb-4 animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs' 
            : 'bg-rose-50 text-rose-800 border-rose-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{notification.message}</span>
          </div>
          <button 
            id="close-notification"
            onClick={() => setNotification(null)} 
            className="text-slate-400 hover:text-slate-600 px-2 py-1 rounded font-normal text-xs cursor-pointer bg-slate-100 hover:bg-slate-200/60"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Tab Controls */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit border border-slate-200/50">
        <button
          id="tab-reports"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Tổng quan & Kho hàng
        </button>
        <button
          id="tab-menu"
          onClick={() => {
            setActiveTab('menu_settings');
            setEditingItem(null);
            setIsAddingNew(false);
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'menu_settings'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Settings className="w-3.5 h-3.5" /> Thể lệ Thực đơn (Menu)
        </button>
        <button
          id="tab-ai-insights"
          onClick={() => {
            setActiveTab('ai_insights');
            setEditingItem(null);
            setIsAddingNew(false);
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ai_insights'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse-gentle" /> Cơ sở dữ liệu & Trợ lý AI
        </button>
      </div>

      {activeTab === 'reports' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Revenue */}
        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-3xs flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-900 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#7DA897]" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-mono tracking-wide text-slate-400 truncate">TỔNG DOANH THU</p>
            <h4 className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-800 mt-0.5 truncate">{totalRevenue.toLocaleString()}đ</h4>
            <span className="text-[8px] sm:text-[9px] font-mono font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 mt-1 w-fit mx-auto sm:mx-0">
              <ArrowUpRight className="w-2.5 h-2.5" /> +15% tháng này
            </span>
          </div>
        </div>

        {/* Metric 2: Material Cost */}
        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-3xs flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
          <div className="p-2.5 bg-sky-50 rounded-xl text-sky-900 shrink-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-sky-850" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-mono tracking-wide text-slate-400 truncate">CHI PHÍ NGUYÊN LIỆU</p>
            <h4 className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-800 mt-0.5 truncate">{totalIngredientCost.toLocaleString()}đ</h4>
            <p className="text-[8px] sm:text-[9px] text-slate-400 mt-1 font-mono truncate">Khấu hao cốc & thìa</p>
          </div>
        </div>

        {/* Metric 3: Net Profit */}
        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-3xs flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-950 shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#7DA897]" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-mono tracking-wide text-slate-400 truncate">LỢI NHUẬN RÒNG</p>
            <h4 className="text-sm sm:text-base lg:text-lg font-extrabold text-emerald-900 mt-0.5 truncate">{netProfit.toLocaleString()}đ</h4>
            <span className="text-[8px] sm:text-[9px] font-mono font-bold text-[#5f8776] bg-[#8FB9A8]/10 px-1.5 py-0.5 rounded mt-1 inline-block">
              Tỷ suất: {profitMarginPercent}%
            </span>
          </div>
        </div>

        {/* Metric 4: Stock warning */}
        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-3xs flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3">
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-950 shrink-0">
            <BatteryWarning className="w-4 h-4 sm:w-5 sm:h-5 text-rose-705" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-mono tracking-wide text-slate-400 truncate">CẢNH BÁO KHO</p>
            <h4 className={`text-sm sm:text-base lg:text-lg font-extrabold mt-0.5 truncate ${lowStockCount > 0 ? 'text-rose-600 animate-pulse font-black' : 'text-slate-700'}`}>
              {lowStockCount} loại
            </h4>
            <p className="text-[8px] sm:text-[9px] text-slate-400 mt-1 truncate">Đạt ngưỡng tối thiểu</p>
          </div>
        </div>

      </div>

      {/* DYNAMIC REPORTS AND VISUALISATION COLUMN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART AND MONTHLY MATERIAL COST REPORT */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* SECURE MONTHLY COST REPORT */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-800" />
                <span>Báo Cáo Chi Phí Nguyên Liệu Hàng Tháng</span>
              </h3>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Chọn kỳ báo cáo:</span>
                <select 
                  id="report-month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border rounded-lg px-2 py-1 text-xs font-mono font-semibold text-slate-700"
                >
                  <option value="2026-05">Tháng 05/2026 (Hiện hành)</option>
                  <option value="2026-04" disabled>Tháng 04/2026</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-150 text-slate-400 font-mono text-[10px]">
                    <th className="pb-2.5 font-semibold">TÊN NGUYÊN LIỆU TRONG KHO</th>
                    <th className="pb-2.5 font-semibold text-center">LƯỢNG TIÊU THỤ THỰC</th>
                    <th className="pb-2.5 font-semibold text-right">ĐƠN GIÁ HAO</th>
                    <th className="pb-2.5 font-semibold text-right">TỔNG THẤT THOÁT (VND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {consumedIngredientsReport.length > 0 ? (
                    consumedIngredientsReport.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-medium text-slate-800">{item.name}</td>
                        <td className="py-2.5 text-center font-mono font-bold text-slate-600">
                          {item.amount.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-500">
                          {(ingredients.find(i=>i.id===item.id)?.unitCost || 0).toLocaleString()}đ
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-800">
                          {item.totalCost.toLocaleString()}đ
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">Chưa có số liệu tiêu phí nguyên liệu (Đặt món cốc đầu tiên để bắt đầu sinh sổ sách).</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial summaries */}
            <div className="bg-slate-50 rounded-xl p-4 mt-5 space-y-2 border border-slate-100 font-mono text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Doanh thu thuần may ly:</span>
                <span className="font-bold text-slate-800">{totalRevenue.toLocaleString()} đ</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tổng chiết xuất nguyên liệu:</span>
                <span className="font-bold text-rose-600">-{totalIngredientCost.toLocaleString()} đ</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Overhead (Mặt bằng & vận hành phỏng định):</span>
                <span className="font-bold text-rose-600">-{rentOverhead.toLocaleString()} đ</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-200 pt-2.5 text-slate-800 font-sans">
                <span>Lợi Nhuận Ròng Thu Hoạch:</span>
                <span className="text-emerald-700 font-mono">{netProfit.toLocaleString()} VND</span>
              </div>
            </div>
          </div>

          {/* SVG PURE CHART FOR SALES TREND */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 text-xs tracking-tight">Biểu Đồ Xu Hướng Doanh Thu Ngày (Tháng 5/2026)</h4>
            
            {/* Pure SVG responsive area chart */}
            <div className="w-full h-48 bg-slate-50 rounded-xl p-3 border relative overflow-hidden flex flex-col justify-end">
              <svg viewBox="0 0 500 120" className="w-full h-full text-[#8FB9A8]" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8FB9A8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#8FB9A8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* SVG Line / Path */}
                <path
                  d={salesTrend.reduce((acc, item, idx) => {
                    const x = (idx / (salesTrend.length - 1)) * 500;
                    const y = 110 - (item.revenue / maxDaySales) * 80;
                    return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }, '')}
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="stroke-[#7DA897]"
                />
                {/* Filled Area */}
                <path
                  d={salesTrend.reduce((acc, item, idx) => {
                    const x = (idx / (salesTrend.length - 1)) * 500;
                    const y = 110 - (item.revenue / maxDaySales) * 80;
                    return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }, '') + ` L 500 115 L 0 115 Z`}
                  fill="url(#chart-grad)"
                />
              </svg>
              
              {/* Daily labels */}
              <div className="flex justify-between text-[8px] font-mono text-slate-400 pt-2 border-t">
                <span>01/05</span>
                <span>06/05</span>
                <span>12/05</span>
                <span>18/05</span>
                <span>24/05</span>
              </div>
            </div>
          </div>

        </div>

        {/* SIDE COLUMN: INVENTORY MANAGEMENT */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Database className="w-4 h-4 text-emerald-800" />
              <span>Quản Lý Kho Hàng Tự Động</span>
            </h3>

            <div className="space-y-3 max-h-[100vh] overflow-y-auto pr-1">
              {ingredients.map(ing => {
                const isUnderLevel = ing.currentStock <= ing.minStock;
                return (
                  <div key={ing.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-xs">{ing.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">Ngưỡng cảnh báo: &lt;{ing.minStock} {ing.unit}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        isUnderLevel 
                          ? 'bg-rose-100 text-rose-700 animate-pulse' 
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isUnderLevel ? 'Hết hàng' : 'An toàn'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>Trong kho: <strong>{ing.currentStock.toLocaleString()} {ing.unit}</strong></span>
                    </div>

                    {/* Stock reimport quick form */}
                    <form onSubmit={(e) => handleReimportSubmit(e, ing.id)} className="flex gap-1">
                      <input
                        id={`inject-qty-${ing.id}`}
                        type="number"
                        placeholder={`Số lượng (${ing.unit})`}
                        value={importQty[ing.id] || ''}
                        onChange={(e) => setImportQty({ ...importQty, [ing.id]: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        id={`inject-btn-${ing.id}`}
                        type="submit"
                        className="bg-slate-800 text-white hover:bg-slate-900 px-3 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer flex items-center gap-0.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Bổ sung
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
      {activeTab === 'menu_settings' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: MENU EXPLORER */ }
          <div className="xl:col-span-7 space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-[#8FB9A8]" />
                    <span>Thiết lập Thực Đơn Quán (Menu Setup)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Thêm bớt đồ uống, điều chỉnh giá bán và liên kết định mức hao hụt kho nguyên vật liệu.</p>
                </div>
                
                <button
                  id="btn-add-menu-item"
                  type="button"
                  onClick={startAdd}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Thêm món mới
                </button>
              </div>

              {/* Grid of existing items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[85vh] overflow-y-auto pr-1">
                {menu.map(item => {
                  const itemRecipe = item.recipe || [];
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition relative overflow-hidden ${
                        editingItem?.id === item.id 
                          ? 'border-emerald-600 bg-emerald-50/25 ring-2 ring-emerald-600/10' 
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      {/* Category Badge & Availability switch */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[9px] font-mono uppercase bg-slate-500/10 text-slate-600 px-1.5 py-0.5 rounded font-bold truncate max-w-[120px]">{item.category}</span>
                        
                        <button
                          id={`toggle-quick-${item.id}`}
                          onClick={() => {
                            updateMenuItem({
                              ...item,
                              available: !item.available
                            });
                          }}
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer shrink-0 ${
                            item.available 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/75' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Bật/Tắt bán đồ uống nhanh"
                        >
                          {item.available ? '● Đang bán' : '○ Tạm ngưng'}
                        </button>
                      </div>

                      <div className="flex gap-3 items-start">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=400';
                            }}
                          />
                        )}
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs truncate" title={item.name}>{item.name}</h4>
                          <p className="text-emerald-850 font-mono font-bold text-xs">{item.price.toLocaleString()}đ</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1 italic">{item.description || 'Chưa định nghĩa mô tả'}</p>
                        </div>
                      </div>

                      {/* Recipe formula badge info */}
                      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] text-slate-400 font-bold mr-1 shrink-0">Bếp tiêu hao:</span>
                        {itemRecipe.length > 0 ? (
                          itemRecipe.map(rec => {
                            const ing = ingredients.find(i => i.id === rec.ingredientId);
                            return (
                              <span key={rec.ingredientId} className="text-[8.5px] font-mono bg-amber-500/10 text-amber-900 border border-amber-500/10 px-1 py-0.2 rounded shrink-0">
                                {ing?.name || 'Nguyên liệu'}: {rec.amount}{ing?.unit || ''}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[8.5px] italic text-rose-500 font-medium">Bán tự do (Không cấu hao kho)</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5 justify-end mt-3 pt-2.5 border-t border-slate-100">
                        <button
                          id={`btn-edit-${item.id}`}
                          onClick={() => startEdit(item)}
                          className="bg-white border hover:bg-slate-50 text-slate-700 px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" /> Cập nhật
                        </button>
                        <button
                          id={`btn-delete-${item.id}`}
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa món "${item.name}" khỏi thực đơn không?`)) {
                              deleteMenuItem(item.id);
                              setNotification({ type: 'success', message: `Gỡ bỏ món "${item.name}" khỏi thực đơn hoàn tất!` });
                              if (editingItem?.id === item.id) {
                                setEditingItem(null);
                              }
                            }
                          }}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" /> Gỡ bỏ
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: EDITOR COMPOSER */}
          <div className="xl:col-span-5">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              {editingItem || isAddingNew ? (
                <form onSubmit={handleSaveMenu} className="space-y-4">
                  <div className="pb-3 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-slate-700" />
                      <span>{editingItem ? 'SỬA THÔNG TIN ĐỒ UỐNG' : 'THÊM BẢN VẼ ĐỒ UỐNG MỚI'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setIsAddingNew(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drink Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Tên món nước (Beverage Name):</label>
                    <input
                      id="menu-form-name"
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="VD: Trà Xoài Chanh Dây..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Price and Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Giá bán (Size M) (VNĐ):</label>
                      <input
                        id="menu-form-price"
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={formPrice}
                        onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Danh mục nhóm trà:</label>
                      <select
                        id="menu-form-category-select"
                        value={useCustomCategory ? 'OTHER' : formCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OTHER') {
                            setUseCustomCategory(true);
                          } else {
                            setUseCustomCategory(false);
                            setFormCategory(val);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Trà Trái Cây">Trà Trái Cây</option>
                        <option value="Trà Trái Cây Nhiệt Đới">Trà Trái Cây Nhiệt Đới</option>
                        <option value="Trà Sữa / Trà Sữa Trái Cây">Trà Sữa / Trà Sữa Trái Cây</option>
                        <option value="OTHER">-- Nhóm Khác (Tự Nhập) --</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Category text box */}
                  {useCustomCategory && (
                    <div className="space-y-1 bg-amber-50/20 p-2.5 rounded-xl border border-dashed border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-600">Nhập tên danh mục tự chọn của bạn:</label>
                      <input
                        id="menu-form-custom-category"
                        type="text"
                        required
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="VD: Kem Cheese, Sữa Chua Đẹp Da..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {/* Image URL & Preview */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Đường dẫn ảnh minh họa:</label>
                    <input
                      id="menu-form-image"
                      type="text"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="Không bắt buộc hoặc chèn đường dẫn hình ảnh..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {formImage && (
                      <div className="pt-2 flex items-center gap-3">
                        <img 
                          src={formImage} 
                          alt="Xem trước" 
                          className="w-14 h-14 bg-slate-100 rounded-lg object-cover border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=400';
                          }}
                        />
                        <span className="text-[10px] text-slate-400">Xem trước đồ uống</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Giới thiệu ngắn (mô tả vị giác):</label>
                    <textarea
                      id="menu-form-desc"
                      rows={2}
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Hương vị mát lịm, sảng khoái kết hợp trái cây chín mọng..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  {/* Recipe Builder Checklist */}
                  <div className="space-y-2 border-t pt-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Định mức trừ kho nguyên liệu (Khi có khách đặt):</label>
                      <p className="text-[9px] text-slate-400 mt-0.5">Hệ thống sẽ cộng trừ tự động kho nguyên vật liệu tương ứng.</p>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {ingredients.map(ing => {
                        const existingRecipeItem = formRecipe.find(r => r.ingredientId === ing.id);
                        const isChecked = !!existingRecipeItem;
                        const defaultAmount = existingRecipeItem ? existingRecipeItem.amount : 0;
                        
                        return (
                          <div key={ing.id} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                              <input
                                id={`recipe-check-${ing.id}`}
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleRecipeAmountChange(ing.id, '10'); // mặc định hao 10
                                  } else {
                                    handleRecipeAmountChange(ing.id, '0');
                                  }
                                }}
                                className="rounded text-emerald-650 focus:ring-emerald-500 w-3.5 h-3.5 border-slate-300"
                              />
                              <span>{ing.name}</span>
                            </label>

                            {isChecked && (
                              <div className="flex items-center gap-1">
                                <input
                                  id={`recipe-amount-${ing.id}`}
                                  type="number"
                                  min="0.1"
                                  step="any"
                                  required
                                  value={defaultAmount || ''}
                                  onChange={(e) => handleRecipeAmountChange(ing.id, e.target.value)}
                                  className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-right font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <span className="text-[10px] text-slate-400 font-mono w-6 shrink-0">{ing.unit}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t flex gap-2">
                    <button
                      id="menu-form-save"
                      type="submit"
                      className="w-full bg-[#8FB9A8] hover:bg-[#7ba897] text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu cấu hình món
                    </button>
                    <button
                      id="menu-form-cancel"
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setIsAddingNew(false);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-24 space-y-3">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-dashed border-slate-200">
                    <Coffee className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs text-center">Bảng Pha Chế Bản Vẽ</h4>
                    <p className="text-[10.5px] text-slate-400 max-w-xs mt-1 leading-normal text-center">
                      Chọn một cốc nước trong thực đơn bên cạnh để cập nhật chi phí, hoặc nhấp vào "Thêm món mới" để bắt đầu thiết kế hương vị đặc sắc của quán!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )}

      {activeTab === 'ai_insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-slide-in-up">
          
          {/* LEFT: DATABASE BACKUP & API SETTINGS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* API Settings */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b pb-3">
                <Settings className="w-4 h-4 text-slate-650" />
                <span>Cấu hình Google Gemini API Key</span>
              </h3>
              
              <p className="text-[11px] text-slate-400 leading-normal">
                Để chạy các tính năng Trợ lý AI Pha chế và Trợ lý Phân tích Kinh doanh, vui lòng cấu hình khóa API Key của riêng bạn từ Google AI Studio (lưu trữ bảo mật cục bộ tại trình duyệt).
              </p>

              <form onSubmit={handleSaveApiKey} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Gemini API Key cá nhân:</label>
                  <div className="relative">
                    <input
                      id="admin-api-key-input"
                      type={showApiKey ? 'text' : 'password'}
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="Nhập khóa AIzaSy..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-slate-450 hover:text-slate-700 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id="save-api-key-btn"
                    type="submit"
                    className="bg-[#8FB9A8] hover:bg-[#7ba897] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer flex-1"
                  >
                    Lưu API Key
                  </button>
                  {customApiKey && (
                    <button
                      id="clear-api-key-btn"
                      type="button"
                      onClick={handleClearApiKey}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer border border-rose-100"
                    >
                      Xóa Key
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Local Database Backup & Restore */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b pb-3">
                <Database className="w-4 h-4 text-[#8FB9A8]" />
                <span>Sao Lưu & Phục Hồi Dữ Liệu</span>
              </h3>
              
              <p className="text-[11px] text-slate-400 leading-normal">
                Xuất tệp sao lưu để chuyển dữ liệu sang trình duyệt khác hoặc đề phòng xóa dữ liệu web. Cơ sở dữ liệu được mã hóa và ký chứng thực toàn vẹn tự động.
              </p>

              <div className="space-y-3 pt-1">
                {/* Export */}
                <button
                  id="export-backup-btn"
                  onClick={handleExportBackup}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" /> Xuất Bản Sao Lưu (.json)
                </button>

                {/* Import */}
                <div className="border-t border-slate-100 pt-3.5 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Khôi phục dữ liệu từ tệp tin:</label>
                  <div className="relative flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#8FB9A8] rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition duration-200 cursor-pointer">
                    <input
                      id="import-backup-file"
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-center space-y-1">
                      <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-650 font-semibold">Tải lên tệp tin sao lưu .json</p>
                      <p className="text-[9px] text-slate-400">Hệ thống sẽ đối soát toàn vẹn chữ ký bảo an</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: AI BUSINESS INSIGHTS */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-5 min-h-[50vh] flex flex-col">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse-gentle" />
                    <span>Trợ Lý Giám Đốc Kinh Doanh AI</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Gemini 2.5 Flash chẩn đoán dòng tiền, phân tích xu hướng bán chạy và đề xuất chiến lược.</p>
                </div>

                <button
                  id="run-ai-analysis-btn"
                  onClick={handleRunAIAnalysis}
                  disabled={aiAnalyzing}
                  className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
                >
                  {aiAnalyzing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang phân tích sổ sách...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-405" />
                      <span>Phân Tích Doanh Thu</span>
                    </>
                  )}
                </button>
              </div>

              {/* Result Area */}
              <div className="flex-1 flex flex-col">
                {aiAnalysisResult ? (
                  <div className="bg-amber-50/20 border border-[#8FB9A8]/20 rounded-2xl p-5 text-xs text-slate-750 leading-relaxed font-sans overflow-y-auto max-h-[70vh] space-y-4">
                    <div className="whitespace-pre-wrap leading-relaxed prose max-w-none text-slate-800">
                      {aiAnalysisResult}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 space-y-3.5 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#8FB9A8] border border-[#8FB9A8]/30">
                      <Sparkles className="w-5 h-5 animate-pulse-gentle" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs text-center">Báo Cáo Chiến Lược Chưa Kích Hoạt</h4>
                      <p className="text-[10.5px] text-slate-400 max-w-xs mt-1.5 leading-normal text-center">
                        Nhấn nút **"Phân Tích Doanh Thu"** để cho phép Trợ lý AI đọc dữ liệu bán hàng, hóa đơn & kiểm kho thực tế. Gemini sẽ cung cấp bản báo cáo tài chính chuyên sâu và khuyến nghị nâng cao!
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* COMPREHENSIVE SECURITY AUDIT TRAIL LOGS */}
      <div className="glass-panel-dark text-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2 text-white">
              <CheckCircle className="w-4 h-4 text-[#8FB9A8]" />
              <span>Sổ Cái Truy Vết Thẩm Định An Ninh Toàn Vẹn (Audit Ledger)</span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
              Ghi nhận chuỗi khối sự kiện chống chối bỏ. Mọi hoạt động ghi chép được bảo mật bằng chữ ký FNV-1a đối sánh thời gian thực.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              id="admin-tamper-demo-btn"
              onClick={triggerTamperDemo}
              className="bg-rose-900/20 hover:bg-rose-900/40 border border-rose-800/40 text-rose-300 px-3.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition active:scale-95 btn-press-effect"
            >
              Simulate Database Tamper (Test)
            </button>
          </div>
        </div>

        <div className="font-mono text-[10px] space-y-2.5 max-h-56 overflow-y-auto pr-2 scrollbar-none">
          {securityLogs.length > 0 ? (
            securityLogs.map(log => (
              <div key={log.id} className="border-b border-white/5 pb-2.5 text-[10.5px] leading-relaxed flex gap-3.5 items-start justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#8FB9A8] font-bold">[{log.timestamp.substring(11, 19)}]</span>
                    <span className="text-slate-400 font-semibold uppercase text-[9px] bg-white/5 px-1.5 py-0.2 rounded border border-white/5">({log.role})</span>
                    <span className="text-white font-bold">{log.action}</span>
                  </div>
                  <p className="text-slate-350 mt-1 font-sans">{log.details}</p>
                  <span className="text-[9px] text-slate-500 block mt-0.5">IP Node: {log.ipAddress}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wide border ${
                    log.integrityVerified 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/30 animate-pulse'
                  }`}>
                    {log.integrityVerified ? 'LEGITIMATE' : 'CORRUPTED/FAILED'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-500 text-center py-6">Sổ cái trống.</div>
          )}
        </div>
      </div>

    </div>
  );
};
