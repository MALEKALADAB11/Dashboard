import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    rows: 150000,
    stores: 5,
    advisorsPerStore: 4,
    out: 'public/data/telecom_sales.csv',
    start: '2025-01-01',
    end: '2025-12-31',
    seed: 42,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--rows') args.rows = Number(next), i++;
    else if (a === '--stores') args.stores = Number(next), i++;
    else if (a === '--advisors-per-store') args.advisorsPerStore = Number(next), i++;
    else if (a === '--out') args.out = String(next), i++;
    else if (a === '--start') args.start = String(next), i++;
    else if (a === '--end') args.end = String(next), i++;
    else if (a === '--seed') args.seed = Number(next), i++;
  }
  return args;
}

/** Deterministic RNG (Mulberry32) */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatIsoLocal(d) {
  // Keep it simple: write local-time-ish ISO without timezone.
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function daysBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 3600 * 1000)) + 1;
}

function pickWeighted(rng, items) {
  // items: [{ value, w }]
  let total = 0;
  for (const it of items) total += it.w;
  let x = rng() * total;
  for (const it of items) {
    x -= it.w;
    if (x <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

function randomInt(rng, min, maxInclusive) {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

function randomChoice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function monthMultiplier(monthIndex0) {
  // monthIndex0: 0..11
  // Jul/Aug: -10%, Nov/Dec: +20%
  if (monthIndex0 === 6 || monthIndex0 === 7) return 0.90;
  if (monthIndex0 === 10 || monthIndex0 === 11) return 1.20;
  return 1.0;
}

function weekdayMultiplier(dayOfWeek) {
  // JS: 0 Sun .. 6 Sat
  if (dayOfWeek === 6) return 1.25; // Sat
  if (dayOfWeek === 0) return 1.15; // Sun
  if (dayOfWeek === 1) return 0.90; // Mon
  return 1.0;
}

function hourMultiplier(hour) {
  // Peaks: 11-13 and 16-19
  if ((hour >= 11 && hour <= 13) || (hour >= 16 && hour <= 19)) return 1.20;
  return 1.0;
}

function isFibrePromoDay(d) {
  // 1 promo week per month: days 8..14 inclusive
  const day = d.getDate();
  return day >= 8 && day <= 14;
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function buildStores(count) {
  // Simple deterministic store/region mapping
  const regions = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];
  const stores = [];
  for (let i = 1; i <= count; i++) {
    stores.push({
      store: `Store-${pad2(i)}`,
      region: regions[(i - 1) % regions.length],
    });
  }
  return stores;
}

function buildAdvisors(stores, advisorsPerStore) {
  // Each store gets 4 advisors (top/good/avg/junior) for ranking realism
  const roleByIndex = ['top', 'good', 'avg', 'junior'];
  const namesPool = [
    'Karim', 'Sara', 'Amine', 'Leila', 'Youssef', 'Nadia', 'Imane', 'Omar', 'Hajar', 'Rania',
    'Walid', 'Aya', 'Sofiane', 'Meryem', 'Hamza', 'Salma', 'Reda', 'Khadija', 'Anas', 'Ines',
  ];
  const lastPool = [
    'Benali', 'Moulai', 'Tazi', 'Khadri', 'El Idrissi', 'Benkirane', 'Alaoui', 'Fassi', 'Amrani', 'Berrada',
    'Saidi', 'Cherkaoui', 'Tahiri', 'Lahlou', 'Ziani', 'Boulahcen', 'Mansouri', 'Kabbaj', 'Haddad', 'Zeroual',
  ];

  let idx = 0;
  const advisors = [];
  for (const s of stores) {
    for (let j = 0; j < advisorsPerStore; j++) {
      const role = roleByIndex[j] ?? 'avg';
      const first = namesPool[idx % namesPool.length];
      const last = lastPool[idx % lastPool.length];
      const advisor_id = `A-${s.store}-${pad2(j + 1)}`;
      advisors.push({
        advisor_id,
        advisor_name: `${first} ${last}`,
        store: s.store,
        region: s.region,
        role,
      });
      idx++;
    }
  }
  return advisors;
}

function advisorMultipliers(role) {
  // Controls volume/panier/remise
  // Top: +25% volume, +10% basket, less discount
  // Good: +10% volume, +5% basket
  // Avg: baseline
  // Junior: -15% volume, -5% basket, more discount
  if (role === 'top') return { vol: 1.25, basket: 1.10, discBias: -0.03 };
  if (role === 'good') return { vol: 1.10, basket: 1.05, discBias: -0.01 };
  if (role === 'junior') return { vol: 0.85, basket: 0.95, discBias: +0.03 };
  return { vol: 1.0, basket: 1.0, discBias: 0.0 };
}

function buildCatalog() {
  // "Telecom flavored" catalog
  return [
    // Mobile plans
    { product: 'Forfait 5G Max 120Go', category: 'Mobile', basePrice: 39.99, costPct: 0.25, baseW: 18 },
    { product: 'Forfait 5G Start 60Go', category: 'Mobile', basePrice: 24.99, costPct: 0.25, baseW: 16 },
    { product: 'Forfait 4G Essential 30Go', category: 'Mobile', basePrice: 14.99, costPct: 0.25, baseW: 10 },

    // Fibre
    { product: 'Fibre 1Gb', category: 'Fibre', basePrice: 34.99, costPct: 0.30, baseW: 12 },
    { product: 'Fibre 2Gb', category: 'Fibre', basePrice: 49.99, costPct: 0.30, baseW: 8, promoBoostW: 22 },

    // Devices
    { product: 'iPhone 16 Pro', category: 'Device', basePrice: 1299.0, costPct: 0.82, baseW: 6 },
    { product: 'Samsung Galaxy S25', category: 'Device', basePrice: 999.0, costPct: 0.80, baseW: 6 },
    { product: 'Google Pixel 10', category: 'Device', basePrice: 899.0, costPct: 0.78, baseW: 4 },

    // Insurance
    { product: 'Assurance Premium', category: 'Insurance', basePrice: 9.0, costPct: 0.20, baseW: 8 },

    // Accessories
    { product: 'Coque + Verre trempé', category: 'Accessories', basePrice: 39.0, costPct: 0.45, baseW: 10 },
    { product: 'AirPods Pro', category: 'Accessories', basePrice: 279.0, costPct: 0.75, baseW: 3 },

    // Bundles
    { product: 'Pack Pro Business', category: 'Bundle', basePrice: 89.0, costPct: 0.35, baseW: 5 },
  ];
}

function discountPct(rng, category, promoActive, discBias) {
  // Baseline discounts by category
  let base = 0.0;
  if (category === 'Device') base = 0.05;
  else if (category === 'Fibre') base = 0.08;
  else if (category === 'Bundle') base = 0.10;
  else if (category === 'Accessories') base = 0.04;
  else if (category === 'Mobile') base = 0.03;
  else if (category === 'Insurance') base = 0.00;

  if (promoActive && category === 'Fibre') base += 0.08;

  // random spread
  const spread = category === 'Device' ? 0.10 : category === 'Fibre' ? 0.12 : 0.06;
  let d = base + (rng() - 0.5) * spread + discBias;
  d = clamp01(d);

  // cap per category
  const cap = category === 'Device' ? 0.20 : category === 'Fibre' ? 0.30 : 0.15;
  return Math.min(d, cap);
}

function qty(rng, category) {
  if (category === 'Mobile' || category === 'Fibre' || category === 'Insurance' || category === 'Bundle') return 1;
  // accessories sometimes 1-3
  if (category === 'Accessories') return rng() < 0.85 ? 1 : rng() < 0.97 ? 2 : 3;
  // device 1
  if (category === 'Device') return 1;
  return 1;
}

function sampleTimestampForDay(rng, dayDate) {
  // Choose hour with bias towards peaks
  const hours = [
    { h: 10, w: 4 }, { h: 11, w: 9 }, { h: 12, w: 10 }, { h: 13, w: 8 },
    { h: 14, w: 4 }, { h: 15, w: 5 }, { h: 16, w: 10 }, { h: 17, w: 10 },
    { h: 18, w: 9 }, { h: 19, w: 7 }, { h: 20, w: 3 },
  ];
  const hour = pickWeighted(rng, hours.map(x => ({ value: x.h, w: x.w })));
  const minute = randomInt(rng, 0, 59);
  const second = randomInt(rng, 0, 59);
  const d = new Date(dayDate);
  d.setHours(hour, minute, second, 0);
  return d;
}

function buildDailyWeights(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const nDays = daysBetween(start, end);

  const days = [];
  for (let i = 0; i < nDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const mMult = monthMultiplier(d.getMonth());
    const wMult = weekdayMultiplier(d.getDay());

    // base day weight (month + weekday)
    const weight = mMult * wMult;
    days.push({ date: d, weight });
  }

  // normalize weights to sum=1
  const total = days.reduce((s, x) => s + x.weight, 0);
  const norm = days.map(x => ({ date: x.date, p: x.weight / total }));
  return norm;
}

function pickDayIndex(rng, dailyP) {
  // dailyP: array of {date,p}
  let x = rng();
  for (let i = 0; i < dailyP.length; i++) {
    x -= dailyP[i].p;
    if (x <= 0) return i;
  }
  return dailyP.length - 1;
}

function main() {
  const args = parseArgs(process.argv);
  const rng = mulberry32(args.seed);

  const stores = buildStores(args.stores);
  const advisors = buildAdvisors(stores, args.advisorsPerStore);
  const catalog = buildCatalog();
  const dailyP = buildDailyWeights(args.start, args.end);

  ensureDir(args.out);
  const ws = fs.createWriteStream(args.out, { encoding: 'utf8' });

  const header = [
    'order_id',
    'line_id',
    'timestamp',
    'store',
    'region',
    'advisor_id',
    'advisor_name',
    'product',
    'category',
    'quantity',
    'unit_price',
    'discount_pct',
    'revenue',
    'cost',
    'margin',
    'promo_flag',
    'promo_name',
  ].join(',');
  ws.write(header + '\n');

  let orderId = 100000;
  let lineId = 1;

  // We'll generate "line items". Some orders will have 1 line, some 2-3 lines due to cross-sell.
  while (lineId <= args.rows) {
    orderId++;

    // pick a store and advisor (advisor must belong to store)
    const store = randomChoice(rng, stores);
    const advisorsInStore = advisors.filter(a => a.store === store.store);
    const advisor = pickWeighted(rng, advisorsInStore.map(a => {
      const m = advisorMultipliers(a.role);
      return { value: a, w: 1 * m.vol };
    }));

    // pick day + timestamp
    const dayIdx = pickDayIndex(rng, dailyP);
    const dayDate = dailyP[dayIdx].date;
    const ts = sampleTimestampForDay(rng, dayDate);

    // apply hour multiplier by influencing probability of extra lines (busier)
    const hMult = hourMultiplier(ts.getHours());

    const promoActive = isFibrePromoDay(ts);
    const promoName = promoActive ? 'FIBRE_2GB_WEEK' : '';

    const advM = advisorMultipliers(advisor.role);

    // pick primary product with weights (promo boosts Fibre 2Gb)
    const primary = pickWeighted(rng, catalog.map(p => {
      let w = p.baseW;
      if (promoActive && p.product === 'Fibre 2Gb') w = p.promoBoostW ?? (w * 2);
      // advisor basket influences: top sells more devices/bundles, junior more mobile
      if (advisor.role === 'top' && (p.category === 'Device' || p.category === 'Bundle')) w *= 1.25;
      if (advisor.role === 'junior' && (p.category === 'Device' || p.category === 'Bundle')) w *= 0.85;
      return { value: p, w };
    }));

    // create order lines (at least 1)
    const lines = [];

    function addLine(productObj) {
      const q = qty(rng, productObj.category);
      const unitPrice = round2(productObj.basePrice * advM.basket);
      const dPct = discountPct(rng, productObj.category, promoActive, advM.discBias);
      const revenue = round2(q * unitPrice * (1 - dPct));
      const cost = round2(revenue * productObj.costPct); // cost proportional to revenue post-discount
      const margin = round2(revenue - cost);

      lines.push({
        order_id: String(orderId),
        line_id: String(lineId),
        timestamp: formatIsoLocal(ts),
        store: store.store,
        region: store.region,
        advisor_id: advisor.advisor_id,
        advisor_name: advisor.advisor_name,
        product: productObj.product,
        category: productObj.category,
        quantity: String(q),
        unit_price: unitPrice.toFixed(2),
        discount_pct: dPct.toFixed(4),
        revenue: revenue.toFixed(2),
        cost: cost.toFixed(2),
        margin: margin.toFixed(2),
        promo_flag: promoActive ? '1' : '0',
        promo_name: promoName,
      });

      lineId++;
    }

    addLine(primary);

    // Cross-sell logic
    // If primary is Device => Insurance with 35-55% probability + Accessories 20-30%
    // Also slightly more cross-sell during peak hours/weekends
    const crossSellBoost = clamp01((hMult - 1) * 0.8 + (weekdayMultiplier(ts.getDay()) - 1) * 0.5);

    if (primary.category === 'Device') {
      const insuranceProb = 0.35 + rng() * 0.20 + crossSellBoost * 0.10; // up to ~0.65
      if (rng() < insuranceProb && lineId <= args.rows) {
        const insurance = catalog.find(x => x.category === 'Insurance');
        if (insurance) addLine(insurance);
      }

      const accProb = 0.20 + rng() * 0.10 + crossSellBoost * 0.08; // up to ~0.38
      if (rng() < accProb && lineId <= args.rows) {
        const acc = pickWeighted(rng, catalog
          .filter(x => x.category === 'Accessories')
          .map(x => ({ value: x, w: x.baseW })));
        addLine(acc);
      }
    }

    // Fibre promo can create bundles (add Mobile or Accessories sometimes)
    if (promoActive && primary.category === 'Fibre') {
      const bundleProb = 0.15 + rng() * 0.10;
      if (rng() < bundleProb && lineId <= args.rows) {
        const mobile = pickWeighted(rng, catalog
          .filter(x => x.category === 'Mobile')
          .map(x => ({ value: x, w: x.baseW })));
        addLine(mobile);
      }
    }

    // Write lines
    for (const row of lines) {
      // Minimal CSV escaping: no commas in our values. (product names have spaces only)
      const out = [
        row.order_id,
        row.line_id,
        row.timestamp,
        row.store,
        row.region,
        row.advisor_id,
        row.advisor_name,
        row.product,
        row.category,
        row.quantity,
        row.unit_price,
        row.discount_pct,
        row.revenue,
        row.cost,
        row.margin,
        row.promo_flag,
        row.promo_name,
      ].join(',');
      ws.write(out + '\n');

      if (lineId > args.rows) break;
    }
  }

  ws.end();
  console.log(`✅ Generated ${args.rows} line items to: ${args.out}`);
  console.log(`   Period: ${args.start} → ${args.end}`);
  console.log(`   Stores: ${args.stores}, Advisors/store: ${args.advisorsPerStore} (total advisors: ${args.stores * args.advisorsPerStore})`);
}

main();