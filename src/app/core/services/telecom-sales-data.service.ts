import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Advisor, AlertItem, KpiCard } from '../models/models';
import { TelecomSalesRow } from '../models/telecom-sales';

type StoreDayKey = string; // `${store}__${YYYY-MM-DD}`

interface StoreDayAgg {
  store: string;
  region: string;
  day: string; // YYYY-MM-DD

  revenue: number;
  orders: Set<string>;

  promoFibre2Gb: boolean;

  deviceCount: number;
  insuranceCount: number;
  accessoriesCount: number;

  advisorRevenue: Map<string, number>;
  advisorName: Map<string, string>;
  advisorCategoryCount: Map<string, Map<string, number>>;

  productRevenue: Map<string, number>;
}

interface DataStats {
  loaded: boolean;
  rows: number;
  stores: number;
  days: number;
  lastDay: string | null;

  activeStore: string | null;
  activeDay: string | null;

  ordersActive: number;
  revenueActive: number;
  promoActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class TelecomSalesDataService {
  private readonly rows = signal<TelecomSalesRow[]>([]);
  private readonly loaded = signal(false);

  private readonly dailyTargetPerAdvisor = 2000;
  private readonly advisorsShown = 4;
  private readonly dayStartHour = 10;
  private readonly dayEndHour = 20;

  constructor(private readonly http: HttpClient) {}

  async loadOnce(): Promise<void> {
    if (this.loaded()) return;

    const csv = await firstValueFrom(
      this.http.get('data/telecom_sales.csv', { responseType: 'text' })
    );

    const parsed = this.parseCsv(csv);
    this.rows.set(parsed);
    this.loaded.set(true);
  }

  // ===================== Build index (one pass) =====================

  private readonly storeDayAgg = computed(() => {
    const rows = this.rows();
    const map = new Map<StoreDayKey, StoreDayAgg>();

    for (const r of rows) {
      const day = this.toDayKey(r.timestamp);
      const key: StoreDayKey = `${r.store}__${day}`;

      let agg = map.get(key);
      if (!agg) {
        agg = {
          store: r.store,
          region: r.region,
          day,

          revenue: 0,
          orders: new Set<string>(),

          promoFibre2Gb: false,

          deviceCount: 0,
          insuranceCount: 0,
          accessoriesCount: 0,

          advisorRevenue: new Map(),
          advisorName: new Map(),
          advisorCategoryCount: new Map(),

          productRevenue: new Map(),
        };
        map.set(key, agg);
      }

      agg.revenue += r.revenue;
      agg.orders.add(r.order_id);

      if (r.promo_flag === 1 && r.promo_name === 'FIBRE_2GB_WEEK') agg.promoFibre2Gb = true;

      if (r.category === 'Device') agg.deviceCount++;
      if (r.category === 'Insurance') agg.insuranceCount++;
      if (r.category === 'Accessories') agg.accessoriesCount++;

      agg.advisorRevenue.set(r.advisor_id, (agg.advisorRevenue.get(r.advisor_id) ?? 0) + r.revenue);
      agg.advisorName.set(r.advisor_id, r.advisor_name);

      let catMap = agg.advisorCategoryCount.get(r.advisor_id);
      if (!catMap) {
        catMap = new Map();
        agg.advisorCategoryCount.set(r.advisor_id, catMap);
      }
      catMap.set(r.category, (catMap.get(r.category) ?? 0) + 1);

      agg.productRevenue.set(r.product, (agg.productRevenue.get(r.product) ?? 0) + r.revenue);
    }

    return map;
  });

  readonly days = computed<string[]>(() => {
    const set = new Set<string>();
    for (const r of this.rows()) set.add(this.toDayKey(r.timestamp));
    return Array.from(set).sort();
  });

  readonly stores = computed<string[]>(() => {
    const set = new Set<string>();
    for (const r of this.rows()) set.add(r.store);
    return Array.from(set).sort();
  });

  readonly referenceDay = computed<string | null>(() => {
    const ds = this.days();
    return ds.length ? ds[ds.length - 1] : null;
  });

  readonly activeStore = computed<string | null>(() => {
    const day = this.referenceDay();
    if (!day) return null;

    let bestStore: string | null = null;
    let bestRevenue = -1;

    for (const agg of this.storeDayAgg().values()) {
      if (agg.day !== day) continue;
      if (agg.revenue > bestRevenue) {
        bestRevenue = agg.revenue;
        bestStore = agg.store;
      }
    }
    return bestStore;
  });

  private readonly activeAgg = computed<StoreDayAgg | null>(() => {
    const day = this.referenceDay();
    const store = this.activeStore();
    if (!day || !store) return null;
    return this.storeDayAgg().get(`${store}__${day}`) ?? null;
  });

  // ===================== Targets (credible business) =====================

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
    return sorted[idx];
  }

  private readonly storeTargets = computed(() => {
    const map = new Map<string, number[]>();
    for (const agg of this.storeDayAgg().values()) {
      const arr = map.get(agg.store);
      if (arr) arr.push(agg.revenue);
      else map.set(agg.store, [agg.revenue]);
    }
    return map;
  });

  readonly teamTarget = computed(() => {
    const store = this.activeStore();
    const fallback = this.advisorsShown * this.dailyTargetPerAdvisor;
    if (!store) return fallback;

    const revs = this.storeTargets().get(store) ?? [];
    const p70 = this.percentile(revs, 70);
    return Math.max(fallback, Math.round(p70));
  });

  // ===================== Percentile rank (C2) =====================

  private percentileRank(values: number[], v: number): number {
    // percentile in [0..100] vs all peers
    if (values.length <= 1) return 100;

    const sorted = [...values].sort((a, b) => a - b);

    // upper bound index (last <= v)
    let lo = 0, hi = sorted.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] <= v) { ans = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return Math.round((ans / (sorted.length - 1)) * 100);
  }

  // ===================== “Data importance” layer =====================

  readonly dataStats = computed<DataStats>(() => {
    const agg = this.activeAgg();
    const day = this.referenceDay();
    const store = this.activeStore();

    return {
      loaded: this.loaded(),
      rows: this.rows().length,
      stores: this.stores().length,
      days: this.days().length,
      lastDay: day,

      activeStore: store,
      activeDay: day,

      ordersActive: agg?.orders.size ?? 0,
      revenueActive: agg?.revenue ?? 0,
      promoActive: agg?.promoFibre2Gb ?? false,
    };
  });

  readonly insights = computed(() => {
    const agg = this.activeAgg();
    if (!agg) {
      return { crossSellRate: 0, crossSellLabel: '—', promoLabel: '—' };
    }
    const cross = agg.deviceCount === 0 ? 0 : (agg.insuranceCount / agg.deviceCount);
    const crossPct = Math.round(cross * 100);

    return {
      crossSellRate: cross,
      crossSellLabel: `${crossPct}% (Assurance / Device)`,
      promoLabel: agg.promoFibre2Gb ? 'Promo Fibre 2Gb active' : 'Aucune promo détectée',
    };
  });

  readonly topProducts = computed(() => {
    const agg = this.activeAgg();
    if (!agg) return [];

    const arr = Array.from(agg.productRevenue.entries())
      .map(([product, revenue]) => ({ product, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return arr.slice(0, 5).map((x, i) => ({
      rank: i + 1,
      product: x.product,
      revenue: x.revenue,
      revenueLabel: this.moneyDT(x.revenue),
    }));
  });

  // ===================== UI data =====================

  readonly kpiCards = computed<KpiCard[]>(() => {
    const agg = this.activeAgg();
    const stats = this.dataStats();
    if (!agg || !stats.activeDay || !stats.activeStore) return [];

    const ca = agg.revenue;
    const objEquipe = this.teamTarget();

    const progress = Math.round((ca / objEquipe) * 100);
    const forecast = this.forecastEod(ca);
    const gapPct = Math.round(((forecast - objEquipe) / objEquipe) * 100);
    const visitors = this.estimateVisitors(agg.orders.size);
    const coaching = this.coachScoreFromAgg(agg);

    return [
      {
        label: 'CA Journalier',
        value: this.moneyDT(ca),
        sub: `Objectif ${this.moneyDT(objEquipe)} · ${this.clampInt(progress, 0, 999)}%`,
        color: 'blue',
        progress: this.clampInt(progress, 0, 100),
      },
      {
        label: 'Prévision EOD',
        value: this.moneyDT(forecast),
        sub: `Store ${stats.activeStore} · ${stats.activeDay}`,
        color: 'amber',
        trend: {
          type: gapPct >= 0 ? 'up' : 'down',
          label: `${gapPct >= 0 ? '↑' : '↓'} ${Math.abs(gapPct)}% vs objectif`,
        },
      },
      {
        label: 'Score Coaching',
        value: coaching.toFixed(2),
        sub: 'Cross-sell Device→Assurance/Accessoires',
        color: 'green',
        trend: { type: 'neutral', label: '⟳ stable' },
      },
      {
        label: 'Trafic Boutique',
        value: String(visitors),
        sub: `Orders ${agg.orders.size} · dataset ${stats.rows.toLocaleString('fr-FR')}`,
        color: 'purple',
        progress: this.clampInt(Math.round((visitors / 20) * 100), 0, 100),
      },
    ];
  });

  readonly leftStrip = computed(() => {
    const agg = this.activeAgg();
    if (!agg) {
      return { sales: '—', target: '—', gapPctLabel: '—', visitors: '—', progress: 0, timeLabel: '—' };
    }

    const ca = agg.revenue;
    const objEquipe = this.teamTarget();
    const progress = Math.round((ca / objEquipe) * 100);

    const forecast = this.forecastEod(ca);
    const gapPct = Math.round(((forecast - objEquipe) / objEquipe) * 100);

    const visitors = this.estimateVisitors(agg.orders.size);
    const timeLabel = `${this.clampInt(progress, 0, 100)}% · 3h28`;

    return {
      sales: this.moneyDT(ca),
      target: this.moneyDT(objEquipe),
      gapPctLabel: `${gapPct >= 0 ? '+' : '−'}${Math.abs(gapPct)}%`,
      visitors: String(visitors),
      progress: this.clampInt(progress, 0, 100),
      timeLabel,
    };
  });

  /** ✅ C2: perfPct calculé vs TOUS les conseillers du store/jour (pas seulement les 4 affichés) */
  readonly advisors = computed<Advisor[]>(() => {
    const agg = this.activeAgg();
    if (!agg) return [];

    const raw = Array.from(agg.advisorRevenue.entries()).map(([advisor_id, sales]) => {
      const name = agg.advisorName.get(advisor_id) ?? advisor_id;
      return { advisor_id, name, sales };
    });

    const allSales = raw.map(x => x.sales);

    const withPct = raw.map(x => ({
      ...x,
      perfPct: this.percentileRank(allSales, x.sales),
    }));

    withPct.sort((a, b) => b.sales - a.sales);
    const top = withPct.slice(0, this.advisorsShown);

    const perAdvisorTarget = Math.round(this.teamTarget() / this.advisorsShown);

    return top.map(x => {
      const target = perAdvisorTarget;
      const forecast = x.sales * 1.12;

      const coachScore = this.coachScoreForAdvisor(agg, x.advisor_id);

      // status basé sur percentile
      const pct = x.perfPct ?? 0;
      const status: Advisor['status'] = pct >= 75 ? 'sent' : pct >= 40 ? 'waiting' : 'urgent';

      return {
        initials: this.initials(x.name),
        name: x.name,
        specialty: this.pickSpecialtyForAdvisor(agg, x.advisor_id),
        avatar: this.colorFromString(x.advisor_id),
        sales: x.sales,
        target,
        forecast,
        coachScore,
        status,
        perfPct: pct,
      } satisfies Advisor;
    });
  });

  readonly alerts = computed<AlertItem[]>(() => {
    const agg = this.activeAgg();
    const adv = this.advisors();
    if (!agg) return [];

    const out: AlertItem[] = [];

    // alerte si percentile faible (plus cohérent que sales/target)
    for (const a of adv) {
      const pct = a.perfPct ?? 0;
      if (pct < 25) {
        out.push({
          title: `${a.name} — Rang faible (${pct}e percentile)`,
          desc: `Prévision EOD ${this.moneyDT(a.forecast)} · Coaching requis`,
          time: 'Aujourd’hui',
          severity: 'red',
        });
      }
    }

    if (agg.promoFibre2Gb) {
      out.push({
        title: 'Promo Fibre 2Gb active',
        desc: 'Semaine promo détectée · pousser upgrades & bundles',
        time: 'Temps réel',
        severity: 'amber',
      });
    }

    if (out.length === 0) {
      out.push({
        title: 'Système nominal',
        desc: 'Aucune alerte critique sur l’équipe',
        time: 'Temps réel',
        severity: 'green',
      });
    }

    return out.slice(0, 2);
  });

  // ===================== CSV parsing =====================

  private parseCsv(csv: string): TelecomSalesRow[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const header = lines[0].split(',');
    const idx = (name: string) => header.indexOf(name);

    const required = [
      'order_id','line_id','timestamp','store','region',
      'advisor_id','advisor_name','product','category','quantity',
      'unit_price','discount_pct','revenue','cost','margin','promo_flag','promo_name',
    ];

    for (const col of required) {
      if (idx(col) === -1) throw new Error(`CSV invalide: colonne manquante "${col}"`);
    }

    const out: TelecomSalesRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      out.push({
        order_id: parts[idx('order_id')],
        line_id: parts[idx('line_id')],
        timestamp: parts[idx('timestamp')],
        store: parts[idx('store')],
        region: parts[idx('region')],
        advisor_id: parts[idx('advisor_id')],
        advisor_name: parts[idx('advisor_name')],
        product: parts[idx('product')],
        category: parts[idx('category')] as TelecomSalesRow['category'],
        quantity: Number(parts[idx('quantity')]),
        unit_price: Number(parts[idx('unit_price')]),
        discount_pct: Number(parts[idx('discount_pct')]),
        revenue: Number(parts[idx('revenue')]),
        cost: Number(parts[idx('cost')]),
        margin: Number(parts[idx('margin')]),
        promo_flag: Number(parts[idx('promo_flag')]) as 0 | 1,
        promo_name: parts[idx('promo_name')],
      });
    }
    return out;
  }

  // ===================== Helpers =====================

  private toDayKey(ts: string): string {
    return ts.slice(0, 10);
  }

  private forecastEod(ca: number): number {
    const nowHour = 14;
    const elapsed = Math.min(0.95, Math.max(0.15,
      (nowHour - this.dayStartHour) / (this.dayEndHour - this.dayStartHour)
    ));
    return ca / elapsed;
  }

  private estimateVisitors(orderCount: number): number {
    return Math.max(5, Math.min(25, Math.round(orderCount * 1.7)));
  }

  private coachScoreFromAgg(agg: StoreDayAgg): number {
    const devices = agg.deviceCount;
    const ins = agg.insuranceCount;
    const acc = agg.accessoriesCount;

    const ratio = devices === 0 ? 0.4 : (ins + acc) / devices;
    const score = 0.65 + Math.min(0.30, ratio * 0.12);
    return Math.max(0.55, Math.min(0.95, score));
  }

  private coachScoreForAdvisor(agg: StoreDayAgg, advisorId: string): number {
    const m = agg.advisorCategoryCount.get(advisorId);
    if (!m) return 0.75;

    const devices = m.get('Device') ?? 0;
    const ins = m.get('Insurance') ?? 0;
    const acc = m.get('Accessories') ?? 0;

    const ratio = devices === 0 ? 0.4 : (ins + acc) / devices;
    const score = 0.65 + Math.min(0.30, ratio * 0.12);
    return Math.max(0.55, Math.min(0.95, score));
  }

  private pickSpecialtyForAdvisor(agg: StoreDayAgg, advisorId: string): string {
    const m = agg.advisorCategoryCount.get(advisorId);
    if (!m) return 'Ventes';

    let best: string | null = null;
    let bestN = -1;
    for (const [k, v] of m.entries()) {
      if (v > bestN) best = k, bestN = v;
    }

    return ({
      Mobile: 'Offres 4G/5G',
      Fibre: 'Fibre · Box',
      Device: 'Smartphones',
      Insurance: 'Assurance',
      Accessories: 'Accessoires',
      Bundle: 'Offres Pro',
    } as any)[best ?? 'Mobile'] ?? 'Ventes';
  }

  private moneyDT(n: number): string {
    const x = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${x}DT`;
  }

  private initials(fullName: string): string {
    const parts = fullName.split(' ').filter(Boolean);
    return (parts[0]?.[0] ?? 'X') + (parts[1]?.[0] ?? 'X');
  }

  private colorFromString(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const colors = ['#2563EB', '#059669', '#DC2626', '#7C3AED', '#0EA5E9', '#F59E0B'];
    return colors[h % colors.length];
  }

  private clampInt(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(n)));
  }
}