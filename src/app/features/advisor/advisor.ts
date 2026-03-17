import {
  Component, inject, OnInit, OnDestroy,
  viewChild, ElementRef, AfterViewChecked, effect
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatStateService } from '../../core/services/chat-state';
import { MockDataService } from '../../core/services/mock-data';
import { ThemeService } from '../../core/services/theme';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card';
import { MarkdownPipe } from '../../shared/pipes/markdown-pipe';


@Component({
  selector: 'app-advisor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe,
    DecimalPipe, DatePipe, KpiCardComponent, MarkdownPipe
  ],
  templateUrl: './advisor.html',
  styleUrl:    './advisor.scss',
})
export class AdvisorComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly mock  = inject(MockDataService);
  private readonly theme = inject(ThemeService);
  readonly chat          = inject(ChatStateService);

  private readonly msgContainer = viewChild<ElementRef>('msgContainer');
  private notifTimer?: ReturnType<typeof setInterval>;

  readonly advisors = this.mock.getAdvisors();

  readonly kpiCards = [
    { label: "Mon CA Aujourd'hui", value:'1 850DT', sub:'Objectif 2 000DT',     color:'red'    as const, progress:93 },
    // { label: 'Score Coaching IA',  value:'0.91',   sub:'3 conseils appliqués', color:'green'  as const, trend:{ label:'↑ Top équipe', type:'up' as const } },
    { label: 'Clients servis',     value:'7',      sub:'Moy. boutique : 5.2',  color:'purple' as const, trend:{ label:'↑ +35%',       type:'up' as const } },
  ];

  readonly products = [
    { icon:'📱', name:'iPhone 16 Pro',    cat:'Smartphone', price:'1 299DT', margin:'Élevée', hot:true  },
    { icon:'📶', name:'Fibre 2Gb Pro',    cat:'Internet',   price:'49DT/m',  margin:'Moyenne',hot:true  },
    { icon:'🛡', name:'Assurance Premium',cat:'Service',    price:'9DT/m',   margin:'Élevée', hot:false },
    { icon:'⌚', name:'Apple Watch S10',  cat:'Accessoire', price:'449DT',   margin:'Élevée', hot:true  },
    { icon:'🎧', name:'AirPods Pro 3',    cat:'Accessoire', price:'279DT',   margin:'Élevée', hot:false },
    { icon:'💼', name:'Pack Pro Business',cat:'Bundle',     price:'89DT/m',  margin:'Haute',  hot:true  },
  ];

  readonly quickQuestions = [
    'Script bundle assurance ?',
    'Argument 5G face à SFR ?',
    'Comment gérer objection prix ?',
    'Stratégie pic trafic 16h30 ?',
    'Upsell accessoires pluie ?',
    'Franchir palier 2 000DT ?',
  ];

  chatInput = '';
  activeTab = 'chat';

  private pushIndex = 0;
  private readonly pushEvents: Omit<import('../../core/models/models').Notification, 'id' | 'read'>[] = [
    { type:'traffic',  title:'Trafic en hausse',      message:'+3 visiteurs · Opportunité accessoires',   severity:'amber', time:'' },
    { type:'coach',    title:'Nouveau conseil IA',     message:'Bundle assurance recommandé · Score 0.89', severity:'blue',  time:'' },
    { type:'forecast', title:'Prévision mise à jour',  message:'EOD estimé 6 950DT · Tendance haussière',  severity:'green', time:'' },
    { type:'alert',    title:'Alerte objectif équipe', message:'Amine T. à 37% · Intervention requise',   severity:'red',   time:'' },
  ];

  constructor() {
    effect(() => { this.chat.messages(); this.scrollBottom(); });
  }

  ngOnInit(): void {
    this.theme.set('red');
    this.notifTimer = setInterval(() => {
      const ev = this.pushEvents[this.pushIndex % this.pushEvents.length];
      this.chat.pushNotification({
        ...ev,
        time: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
      });
      this.pushIndex++;
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.notifTimer) clearInterval(this.notifTimer);
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

  rankColor(i: number): string {
    return ['#F59E0B', '#94A3B8', '#CD7C54'][i] ?? 'var(--n-400)';
  }

  severityIcon(s: string): string {
    return ({ red:'🔴', amber:'🟡', green:'🟢', blue:'🤖' } as any)[s] ?? '•';
  }

  sendMessage(): void {
    if (!this.chatInput.trim() || this.chat.isLoading()) return;
    const text = this.chatInput.trim();
    this.chatInput = '';
    this.chat.addUserMessage(text);
    this.chat.isLoading.set(true);

    this.chat.pushNotification({
      type:'coach', severity:'blue',
      title:'CoachAgent analyse…',
      message:`"${text.substring(0, 42)}…"`,
      time: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
    });

    setTimeout(() => {
      this.chat.addAiMessage(
        `Conseil pour **"${text}"** :\n\nAvec **12 visiteurs actifs** et la pluie (+40% accessoires), voici ta stratégie :\n\n**1.** Propose systématiquement la protection écran sur chaque smartphone (+65€)\n**2.** Bundle assurance sur ventes ≥ 400€ (×2.1 conversion)\n**3.** Fenêtre optimale : 14h–16h pendant le pic`,
        +(Math.random() * 0.1 + 0.82).toFixed(2)
      );
      this.chat.isLoading.set(false);

      this.chat.pushNotification({
        type:'coach', severity:'green',
        title:'Conseil disponible ✓',
        message:'CoachAgent · Audit validé',
        time: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
      });
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