export interface TelecomSalesRow {
  order_id: string;
  line_id: string;
  timestamp: string;

  store: string;
  region: string;

  advisor_id: string;
  advisor_name: string;

  product: string;
  category: 'Mobile' | 'Fibre' | 'Device' | 'Insurance' | 'Accessories' | 'Bundle';

  quantity: number;
  unit_price: number;
  discount_pct: number;

  revenue: number;
  cost: number;
  margin: number;

  promo_flag: 0 | 1;
  promo_name: string;
}