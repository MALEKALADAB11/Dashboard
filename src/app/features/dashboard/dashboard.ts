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