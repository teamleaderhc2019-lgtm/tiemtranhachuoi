/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';


// Create a single supabase client for interacting with your database
// Handle empty values gracefully without crashing during build or load
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn(
    'Supabase URL hoặc Anon Key bị thiếu. Hệ thống đang chạy ở chế độ Cục bộ (Local/Offline) sử dụng LocalStorage.'
  );
}
