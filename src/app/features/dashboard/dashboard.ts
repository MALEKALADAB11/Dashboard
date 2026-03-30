import {
  Component, inject, viewChild, ElementRef,
  AfterViewChecked, effect
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card';
import { MarkdownPipe } from '../../shared/pipes/markdown-pipe';
import { MockDataService } from '../../core/services/mock-data';
import { ChatStateService } from '../../core/services/chat-state';

interface HourlyPoint { hour: string; actual: number | null; forecast: number; idx: number; }
interface HeatRow    { name: string; full: string; data: number[]; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, DatePipe, KpiCardComponent, MarkdownPipe],
  templateUrl: './dashboard.html',
  styleUrl:    './dashboard.scss',
})
export class DashboardComponent implements AfterViewChecked {
  private readonly mock = inject(MockDataService);
  readonly chat         = inject(ChatStateService);

  private readonly msgContainer = viewChild<ElementRef>('msgContainer');

  readonly kpiCards = this.mock.getKpiCards();
  readonly advisors = this.mock.getAdvisors();
  readonly alerts   = this.mock.getAlerts();

  chatInput = '';

  readonly quickQuestions = [
    'Argument 5G ?', 'Gérer client SFR ?', 'Pic 16h30 ?', 'Script assurance ?'
  ];

  // ── Hourly Sales Chart ────────────────────────────────────────
  chartZoomed        = false;
  selectedRange: '3h' | '6h' | 'all' = '6h';
  selectedHourIdx: number | null = null;

  readonly allHourly: HourlyPoint[] = [
    { hour:'9h',  actual:320,  forecast:300,  idx:0  },
    { hour:'10h', actual:450,  forecast:420,  idx:1  },
    { hour:'11h', actual:680,  forecast:600,  idx:2  },
    { hour:'12h', actual:820,  forecast:750,  idx:3  },
    { hour:'13h', actual:1050, forecast:950,  idx:4  },
    { hour:'14h', actual:1250, forecast:1150, idx:5  },
    { hour:'15h', actual:null, forecast:1350, idx:6  },
    { hour:'16h', actual:null, forecast:1600, idx:7  },
    { hour:'17h', actual:null, forecast:1900, idx:8  },
    { hour:'18h', actual:null, forecast:2100, idx:9  },
    { hour:'19h', actual:null, forecast:2200, idx:10 },
  ];

  // ── Risk Heatmap ──────────────────────────────────────────────
  selectedRiskFilter: 'all' | 'high' | 'medium' | 'low' = 'all';
  hoveredCell: { row: number; col: number } | null = null;

  readonly heatCats = ['Conversion', 'Panier', 'Satisfaction', 'Dispo', 'Objectif'];
  readonly heatRows: HeatRow[] = [
    { name:'KB', full:'Karim B.', data:[2,1,1,2,2] },
    { name:'SM', full:'Sara M.',  data:[3,3,2,1,4] },
    { name:'AT', full:'Amine T.', data:[4,3,3,2,4] },
    { name:'LK', full:'Leila K.', data:[5,4,3,2,5] },
  ];

  // ── Computed getters ──────────────────────────────────────────
  get filteredHourly(): HourlyPoint[] {
    // 3h  = indices 3–8  (12h–17h), 6h = indices 0–7 (9h–16h), all = full array
    if (this.selectedRange === '3h') return this.allHourly.slice(3, 9);
    if (this.selectedRange === '6h') return this.allHourly.slice(0, 8);
    return this.allHourly;
  }

  get filteredHeat(): HeatRow[] {
    if (this.selectedRiskFilter === 'all') return this.heatRows;
    // high = risk 4 (critical=5 is excluded), medium = risk 3, low = risk 1-2
    const minVal = this.selectedRiskFilter === 'high' ? 4
                 : this.selectedRiskFilter === 'medium' ? 3 : 1;
    const maxVal = this.selectedRiskFilter === 'high' ? 5
                 : this.selectedRiskFilter === 'medium' ? 4 : 3;
    return this.heatRows.filter(r => r.data.some(v => v >= minVal && v < maxVal));
  }

  get chartMaxVal(): number {
    return Math.max(...this.filteredHourly.map(d => Math.max(d.actual ?? 0, d.forecast)));
  }

  barH(v: number | null): number {
    if (!v) return 3;
    return Math.round((v / this.chartMaxVal) * 100);
  }

  riskLevel(v: number): string {
    return v >= 5 ? 'critical' : v >= 4 ? 'high' : v >= 3 ? 'medium' : v >= 2 ? 'low' : 'none';
  }

  riskLabel(v: number): string {
    return (['—', 'Faible', 'Modéré', 'Élevé', 'Critique', 'Extrême'] as const)[v] ?? '—';
  }

  toggleZoom(): void          { this.chartZoomed = !this.chartZoomed; }
  setRange(r: '3h' | '6h' | 'all'): void { this.selectedRange = r; }
  setRiskFilter(f: 'all' | 'high' | 'medium' | 'low'): void { this.selectedRiskFilter = f; }
  selectBar(idx: number): void { this.selectedHourIdx = this.selectedHourIdx === idx ? null : idx; }
  hoverHeat(row: number | null, col: number | null): void {
    this.hoveredCell = row !== null && col !== null ? { row, col } : null;
  }

  constructor() {
    effect(() => { this.chat.messages(); this.scrollBottom(); });
  }

  ngAfterViewChecked(): void { this.scrollBottom(); }

  private scrollBottom(): void {
    const el = this.msgContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  perf(sales: number, target: number): number {
    return Math.round(sales / target * 100);
  }

  perfColor(pct: number): string {
    return pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red-600)';
  }

  statusLabel(s: string): string {
    return ({ sent: '⏱ Envoyé', urgent: '🔴 Urgent', waiting: '⏳ Attente' } as any)[s];
  }

  sendMessage(): void {
    if (!this.chatInput.trim() || this.chat.isLoading()) return;
    const text = this.chatInput.trim();
    this.chatInput = '';
    this.chat.addUserMessage(text);
    this.chat.isLoading.set(true);

    setTimeout(() => {
      this.chat.addAiMessage(
        `Analyse pour **"${text}"** :\n\nBasé sur les **12 visiteurs actifs** et le contexte pluie, je recommande de prioriser les accessoires. Taux de conversion estimé : **+40%**.`,
        0.84
      );
      this.chat.isLoading.set(false);
    }, 1600);
  }

  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  useQuick(q: string): void {
    this.chatInput = q;
    this.sendMessage();
  }
}