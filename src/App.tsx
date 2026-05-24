/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { CustomerPanel } from './components/CustomerPanel';
import { StaffPanel } from './components/StaffPanel';
import { AdminPanel } from './components/AdminPanel';
import { UserRole } from './types';
import { 
  Wifi, WifiOff, ShieldCheck, ShieldAlert, Users, Landmark, 
  Settings, ClipboardList, Menu, Coffee, BadgeHelp, CheckCircle2 
} from 'lucide-react';

function DashboardShell() {
  const { 
    currentRole, setCurrentRole, isOffline, toggleOfflineMode, 
    isTampered, loggedInCustomer, offlineQueue 
  } = useStore();

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 flex flex-col font-sans">
      
      {/* PERSISTENT TOP SYSTEM RIBBON */}
      <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3.5">
          
          {/* Logo brand and Title */}
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#8FB9A8] rounded-full text-white shadow-sm">
              <Coffee className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-850 flex items-center gap-1.5">
                <span>TeaFlow POS SECURE</span>
                <span className="text-[10px] font-mono bg-slate-100 text-[#423E3A] px-1.5 py-0.5 rounded border border-slate-200">v1.2</span>
              </h1>
              <p className="text-[10px] text-slate-400">Hệ thống quản lý quán trà sữa có bảo mật & ngoại tuyến</p>
            </div>
          </div>

          {/* Controls: Connection, Security and Quick Role Selector */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            
            {/* Dynamic Security Indicator Badge */}
            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-[10px] ${
              isTampered 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-emerald-50 border-emerald-100 text-emerald-800'
            }`}>
              {isTampered ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Sổ cái bị giả mạo</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8FB9A8] shrink-0" />
                  <span>Bảo mật: Mã hóa AES-XOR</span>
                </>
              )}
            </div>

            {/* Offline Simulator Selector Tab */}
            <button
              id="offline-toggle-btn"
              onClick={toggleOfflineMode}
              className={`px-3 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 transition cursor-pointer select-none ${
                isOffline
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Ngoại tuyến ({offlineQueue.length} chờ đồng bộ)</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Trực tuyến (Online)</span>
                </>
              )}
            </button>

            {/* Simulated Privilege Role Selector Tab (Desktop only) */}
            <div className="hidden md:flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
              <span className="px-2 text-[10px] font-mono text-slate-400">TRUY CẬP:</span>
              
              <button
                id="role-cust-btn"
                onClick={() => setCurrentRole(UserRole.CUSTOMER)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  currentRole === UserRole.CUSTOMER 
                    ? 'bg-[#8FB9A8] text-white font-bold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Khách Hàng
              </button>

              <button
                id="role-staff-btn"
                onClick={() => setCurrentRole(UserRole.STAFF)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  currentRole === UserRole.STAFF 
                    ? 'bg-[#8FB9A8] text-white font-bold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Nhân Viên
              </button>

              <button
                id="role-admin-btn"
                onClick={() => setCurrentRole(UserRole.ADMIN)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  currentRole === UserRole.ADMIN 
                    ? 'bg-[#8FB9A8] text-white font-bold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Quản Trị viên
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* SUB-HEADER OR CURRENT ROLE DETAIL VIEW */}
      <div className="hidden sm:block bg-white border-b border-slate-100 py-3 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs text-slate-600 font-medium">
              Bạn đang trải nghiệm giao diện phân quyền dành cho:{' '}
              <strong className="text-amber-850 uppercase font-mono tracking-wider">
                {currentRole === UserRole.CUSTOMER ? 'Khách hàng (Đặt món & tích điểm)' : currentRole === UserRole.STAFF ? 'Nhân viên lễ tân / POS Cashier' : 'Chủ quán (Doanh thu & Quản lý kho)'}
              </strong>
            </p>
          </div>
          
          <div className="text-[10px] font-mono text-slate-400">
            Giờ hệ thống: 24/05/2026 UTC
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE / CONTENT PANELS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-28 md:pb-12">
        
        {/* Dynamic Panel Dispatch based on active privileges */}
        {currentRole === UserRole.CUSTOMER && <CustomerPanel />}
        {currentRole === UserRole.STAFF && <StaffPanel />}
        {currentRole === UserRole.ADMIN && <AdminPanel />}

      </main>

      {/* APP FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 mb-20 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 text-center md:flex md:items-center md:justify-between text-xs text-slate-400 font-mono">
          <p>© 2026 Bobatea Secure Software. Bảo mật 0-Trust phân vùng.</p>
          <p className="mt-1 md:mt-0">Thiết kế tinh gọn cho Điện thoại & Máy tính bảng</p>
        </div>
      </footer>

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-100 py-2.5 pb-safe flex justify-around items-center md:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.05)] no-print">
        <button
          onClick={() => setCurrentRole(UserRole.CUSTOMER)}
          className={`flex flex-col items-center gap-1 cursor-pointer transition active:scale-95 btn-press-effect ${
            currentRole === UserRole.CUSTOMER ? 'text-[#8FB9A8]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Coffee className="w-5 h-5" />
          <span className="text-[10px] font-bold">Khách Hàng</span>
        </button>
        
        <button
          onClick={() => setCurrentRole(UserRole.STAFF)}
          className={`flex flex-col items-center gap-1 cursor-pointer transition active:scale-95 btn-press-effect ${
            currentRole === UserRole.STAFF ? 'text-[#8FB9A8]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] font-bold">Nhân Viên</span>
        </button>
        
        <button
          onClick={() => setCurrentRole(UserRole.ADMIN)}
          className={`flex flex-col items-center gap-1 cursor-pointer transition active:scale-95 btn-press-effect ${
            currentRole === UserRole.ADMIN ? 'text-[#8FB9A8]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">Quản Trị</span>
        </button>
      </nav>

      {/* REAL-TIME SYSTEM ALERTS LAYER CONTROLLERS */}
      <div 
        id="flash-alerts-container" 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-xs pointer-events-none"
      />

    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <DashboardShell />
    </StoreProvider>
  );
}
