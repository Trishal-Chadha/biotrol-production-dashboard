import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  unit: string | null;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type ProductionEntry = {
  id: string;
  entry_date: string | null;
  product_id: string | null;
  quantity_produced: number | null;
  lot_number: string | null;
  batch_number: string | null;
  operator: string | null;
  remarks: string | null;
  created_at: string;
  products?: Product;
};

export type Employee = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
  created_at: string;
};

export type ProductionData = {
  id: string;
  entry_date: string;
  product_id: string | null;
  batch_number: string;
  produced_units: number;
  produced_sheets: number;
  target_sheets: number;
  production_employees: number;
  production_incharge_id: string | null;
  production_remarks: string | null;
  pkg_product_id: string | null;
  pkg_employees: number | null;
  pkg_incharge_id: string | null;
  pkg_remarks: string | null;
  test_pouch_produced: number;
  day_remarks: string | null;
  created_at: string;
  // joined
  products?: Product;
  pkg_product?: Product;
  production_incharge?: Employee;
  pkg_incharge?: Employee;
};

export type SheetEntry = {
  id: string;
  entry_date: string;
  sheet_code: string;
  num_sheets: number | null;
  production_time: string;
  dhd_employees: number | null;
  packing_employees: number | null;
  total_employees: number | null;
  sheets_per_employee: number | null;
  remarks: string | null;
  created_at: string;
};
