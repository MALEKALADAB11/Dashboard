import {
  Component, inject, viewChild, ElementRef,
  AfterViewChecked, effect
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card';

import { KpiCard } from '../../core/models/models';
import { ChatStateService } from '../../core/services/chat-state';
import { MarkdownPipe } from '../../shared/pipes/markdown-pipe';

interface TsPoint {
  label: string; objectif: number; realise: number; meteo: string;
}

interface Advisor {
  initials: string; name: string; specialty: string;
  avatar: string; sales: number; target: number;
  forecast: number; status: string;
}

interface AlertItem {
  title: string; desc: string; time: string; severity: string;
}

const TS: TsPoint[] = [
  { label:'01/10', objectif:102750, realise:85034,  meteo:'Nuageux'    },
  { label:'02/10', objectif:101296, realise:97233,  meteo:'Venteux'    },
  { label:'03/10', objectif:92981,  realise:72721,  meteo:'Nuageux'    },
  { label:'04/10', objectif:118811, realise:99281,  meteo:'Ensoleillé' },
  { label:'07/10', objectif:96594,  realise:94344,  meteo:'Doux'       },
  { label:'09/10', objectif:119713, realise:144198, meteo:'Doux'       },
  { label:'13/10', objectif:78701,  realise:92162,  meteo:'Ensoleillé' },
  { label:'16/10', objectif:115992, realise:136267, meteo:'Nuageux'    },
  { label:'21/10', objectif:98481,  realise:110842, meteo:'Ensoleillé' },
  { label:'26/10', objectif:150165, realise:189784, meteo:'Doux'       },
  { label:'31/10', objectif:98012,  realise:104278, meteo:'Ensoleillé' },
  { label:'05/11', objectif:94610,  realise:104500, meteo:'Venteux'    },
  { label:'08/11', objectif:194935, realise:189651, meteo:'Doux'       },
  { label:'12/11', objectif:120585, realise:128511, meteo:'Ensoleillé' },
  { label:'15/11', objectif:84650,  realise:87561,  meteo:'Doux'       },
  { label:'20/11', objectif:80193,  realise:92297,  meteo:'Venteux'    },
  { label:'25/11', objectif:174268, realise:200990, meteo:'Ensoleillé' },
  { label:'29/11', objectif:370251, realise:261967, meteo:'Ensoleillé' },
  { label:'02/12', objectif:178332, realise:176815, meteo:'Nuageux'    },
  { label:'05/12', objectif:152399, realise:132789, meteo:'Doux'       },
  { label:'10/12', objectif:166543, realise:171517, meteo:'Pluvieux'   },
  { label:'13/12', objectif:156212, realise:157656, meteo:'Pluvieux'   },
  { label:'17/12', objectif:187234, realise:190321, meteo:'Frais'      },
  { label:'20/12', objectif:235133, realise:192761, meteo:'Nuageux'    },
  { label:'24/12', objectif:124081, realise:164104, meteo:'Pluvieux'   },
  { label:'27/12', objectif:157207, realise:141261, meteo:'Doux'       },
  { label:'29/12', objectif:85364,  realise:81361,  meteo:'Nuageux'    },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe,
    DecimalPipe, DatePipe, KpiCardComponent, MarkdownPipe
  ],
  templateUrl: './dashboard.html',
  styleUrl:    './dashboard.scss',
})
export class DashboardComponent implements AfterViewChecked {

  public readonly chat = inject(ChatStateService);
  private readonly msgRef = viewChild<ElementRef>('msgContainer');

  chatInput   = '';
  chartPeriod = '30d';

  readonly kpiCards: KpiCard[] = [
    { label:'CA Journalier',   value:'4250DT', sub:'Objectif 8 000DT · 3h28',     color:'blue',   progress:53 },
    { label:'Prévision EOD',   value:'6800DT', sub:'IC 80% [5 400–8 200DT]',       color:'amber',  trend:{ label:'⟳ α=0.52',        type:'neutral' } },
    { label:'Score Coaching',  value:'0.81',   sub:'AuditAgent · 4 conseils',      color:'green',  trend:{ label:'↑ +0.07 vs hier',  type:'up'      } },
    { label:'Trafic Boutique', value:'12',     sub:'Capacité 20 · 60%',           color:'purple', progress:60 },
  ];

  readonly advisors: Advisor[] = [
    { initials:'KB', name:'Karim Benali', specialty:'Smartphones · 5G',  avatar:'#2563EB', sales:1850, target:2000, forecast:2050, status:'sent'    },
    { initials:'SM', name:'Sara Moulai',  specialty:'Fibre · Offres Pro', avatar:'#059669', sales:1200, target:2000, forecast:1750, status:'urgent'  },
    { initials:'AT', name:'Amine Tazi',   specialty:'Accessoires',        avatar:'#DC2626', sales:750,  target:2000, forecast:1100, status:'urgent'  },
    { initials:'LK', name:'Leila Khadri', specialty:'Rétention · CRM',   avatar:'#7C3AED', sales:450,  target:2000, forecast:720,  status:'waiting' },
  ];

  readonly alerts: AlertItem[] = [
    { title:'Sara M. — Objectif critique 60%', desc:'Prévision EOD 1 750DT · Coach généré', time:'14:30',    severity:'red'   },
    { title:'Pic trafic prévu 16h30',           desc:'+8 visiteurs · Fenêtre 45 min',        time:'Dans 1h58', severity:'amber' },
  ];

  readonly quickQuestions = [
    'Argument 5G ?', 'Gérer client SFR ?', 'Pic 16h30 ?', 'Script assurance ?'
  ];

  // ── Time Series ───────────────────────────────────────────────
  get chartData(): TsPoint[] {
    const n = this.chartPeriod === '7d' ? 7 : this.chartPeriod === '30d' ? 15 : TS.length;
    return TS.slice(Math.max(0, TS.length - n));
  }

  get maxVal(): number {
    return Math.max(...this.chartData.map(d => Math.max(d.objectif, d.realise))) * 1.12;
  }

  svgX(i: number, total: number, w = 560): number {
    return total <= 1 ? w / 2 : (i / (total - 1)) * w;
  }

  svgY(val: number, h = 95): number {
    return h - (val / this.maxVal) * h;
  }

  buildPath(values: number[], w = 560, h = 95): string {
    if (!values.length) return '';
    return 'M' + values.map((v, i) =>
      `${this.svgX(i, values.length, w)},${this.svgY(v, h)}`
    ).join(' L');
  }

  buildArea(values: number[], w = 560, h = 95): string {
    if (!values.length) return '';
    const top    = values.map((v, i) =>
      `${this.svgX(i, values.length, w)},${this.svgY(v, h)}`
    ).join(' L');
    const n      = values.length;
    const bottom = `${this.svgX(n-1, n, w)},${h} ${this.svgX(0, n, w)},${h}`;
    return `M${top} L${bottom} Z`;
  }

  meteoIcon(m: string): string {
    return ({ Ensoleillé:'☀️', Nuageux:'⛅', Venteux:'🌬️',
              Doux:'🌤️', Pluvieux:'🌧️', Frais:'🌥️' } as any)[m] ?? '🌡️';
  }

  fmtK(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000)     return Math.round(v / 1_000) + 'k';
    return String(Math.round(v));
  }

  fmtKFloor(v: number): string {
    return this.fmtK(Math.floor(v));
  }

  labelEvery(i: number): boolean {
    const step = this.chartPeriod === '90d' ? 4 : this.chartPeriod === '30d' ? 2 : 1;
    return i % step === 0;
  }

  get daysAbove(): number { return this.chartData.filter(d => d.realise >= d.objectif).length; }
  get daysBelow(): number { return this.chartData.filter(d => d.realise  < d.objectif).length; }
  get avgDaily():  number {
    const s = this.chartData;
    return s.length ? Math.round(s.reduce((a, d) => a + d.realise, 0) / s.length) : 0;
  }

  // ── Tableau ───────────────────────────────────────────────────
  perf(s: number, t: number): number { return Math.round(s / t * 100); }

  perfColor(p: number): string {
    return p >= 80 ? 'var(--green)' : p >= 50 ? 'var(--amber)' : 'var(--red-600)';
  }

  statusLabel(s: string): string {
    return ({ sent:'⏱ Envoyé', urgent:'🔴 Urgent', waiting:'⏳ Attente' } as any)[s] ?? s;
  }

  // ── Chat ──────────────────────────────────────────────────────
  constructor() {
    effect(() => { this.chat.messages(); this.scrollBottom(); });
  }

  ngAfterViewChecked(): void { this.scrollBottom(); }

  private scrollBottom(): void {
    const el = this.msgRef()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  sendMessage(): void {
    if (!this.chatInput.trim() || this.chat.isLoading()) return;
    const text = this.chatInput.trim();
    this.chatInput = '';
    this.chat.addUserMessage(text);
    this.chat.isLoading.set(true);
    setTimeout(() => {
      this.chat.addAiMessage(
        `Analyse pour **"${text}"** :\n\n` +
        `Avec **12 visiteurs actifs** et la pluie (+40% accessoires) :\n\n` +
        `**1.** Protection écran premium sur chaque smartphone (+65DT)\n` +
        `**2.** Bundle assurance sur ventes ≥ 400DT (×2.1 conversion)\n` +
        `**3.** Fenêtre optimale : 14h–16h pendant le pic`,
        +(Math.random() * 0.1 + 0.82).toFixed(2)
      );
      this.chat.isLoading.set(false);
    }, 1600);
  }

  onEnter(e: Event): void {
    if (!(e as KeyboardEvent).shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  useQuick(q: string): void { this.chatInput = q; this.sendMessage(); }
}