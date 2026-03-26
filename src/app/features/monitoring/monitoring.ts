import { Component, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

export type AgentStatus = 'LIVE' | 'ACTIF' | 'RUN' | 'HORS LIGNE';

export interface AgentKpi {
  ca: number;
  caObjectif: number;
  score: number;
  clients: number;
}

export interface AgentAlert {
  id: string;
  severity: 'red' | 'amber' | 'green' | 'blue';
  title: string;
  message: string;
  time: string;
}

export interface AgentData {
  id: string;
  initials: string;
  name: string;
  specialty: string;
  location: string;
  avatarColor: string;
  status: AgentStatus;
  lastActivity: string;
  kpi: AgentKpi;
  hourlyActivity: number[];
  alerts: AgentAlert[];
  alertCount: number;
}

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './monitoring.html',
  styleUrl: './monitoring.scss',
})
export class MonitoringComponent {

  readonly activeFilter = signal<'Tous' | AgentStatus>('Tous');

  readonly agents: AgentData[] = [
    {
      id: 'KB',
      initials: 'KB',
      name: 'Karim Benali',
      specialty: 'Smartphones · 5G',
      location: 'Lac 2 — Poste 3',
      avatarColor: 'linear-gradient(135deg,#2563EB,#7C3AED)',
      status: 'LIVE',
      lastActivity: 'Il y a 2 min',
      kpi: { ca: 1850, caObjectif: 2000, score: 0.91, clients: 7 },
      hourlyActivity: [30, 45, 55, 80, 95, 70, 60, 85],
      alertCount: 1,
      alerts: [
        { id: 'a1', severity: 'blue',  title: 'Conseil disponible', message: 'Bundle assurance recommandé · Score 0.91', time: '14:32' },
        { id: 'a2', severity: 'green', title: 'Objectif en bonne voie', message: 'CA 1 850€ — prévision EOD 2 050€', time: '14:28' },
      ],
    },
    {
      id: 'SM',
      initials: 'SM',
      name: 'Sara Moulai',
      specialty: 'Fibre · Offres Pro',
      location: 'Lac 2 — Poste 1',
      avatarColor: 'linear-gradient(135deg,#059669,#0EA5E9)',
      status: 'ACTIF',
      lastActivity: 'Il y a 5 min',
      kpi: { ca: 1200, caObjectif: 2000, score: 0.78, clients: 5 },
      hourlyActivity: [20, 35, 40, 55, 60, 45, 50, 48],
      alertCount: 2,
      alerts: [
        { id: 'b1', severity: 'amber', title: 'Objectif à risque', message: 'Prévision EOD 1 750€ — effort requis', time: '14:30' },
        { id: 'b2', severity: 'blue',  title: 'Coach IA actif',    message: 'Stratégie upsell fibre générée',         time: '14:18' },
      ],
    },
    {
      id: 'AT',
      initials: 'AT',
      name: 'Amine Tazi',
      specialty: 'Accessoires',
      location: 'Lac 2 — Poste 4',
      avatarColor: 'linear-gradient(135deg,#DC2626,#F97316)',
      status: 'RUN',
      lastActivity: 'Il y a 12 min',
      kpi: { ca: 750, caObjectif: 2000, score: 0.65, clients: 3 },
      hourlyActivity: [15, 20, 25, 30, 38, 28, 22, 18],
      alertCount: 3,
      alerts: [
        { id: 'c1', severity: 'red',   title: 'Alerte performance',  message: 'Objectif à 37% — intervention requise', time: '14:22' },
        { id: 'c2', severity: 'amber', title: 'Score coaching bas',  message: 'Conseils non appliqués · Relance auto',  time: '14:10' },
        { id: 'c3', severity: 'blue',  title: 'Coach IA déclenché',  message: 'Plan de rattrapage généré',             time: '13:58' },
      ],
    },
    {
      id: 'LK',
      initials: 'LK',
      name: 'Leila Khadri',
      specialty: 'Rétention · CRM',
      location: 'Lac 2 — Poste 2',
      avatarColor: 'linear-gradient(135deg,#7C3AED,#EC4899)',
      status: 'ACTIF',
      lastActivity: 'Il y a 8 min',
      kpi: { ca: 450, caObjectif: 2000, score: 0.55, clients: 2 },
      hourlyActivity: [10, 12, 18, 22, 20, 15, 10, 8],
      alertCount: 2,
      alerts: [
        { id: 'd1', severity: 'red',   title: 'Objectif critique',  message: 'CA 450€ — rétention prioritaire',   time: '14:15' },
        { id: 'd2', severity: 'amber', title: 'Faible conversion', message: 'Taux client 22% — coaching requis', time: '14:00' },
      ],
    },
    {
      id: 'NR',
      initials: 'NR',
      name: 'Nora Rahimi',
      specialty: 'Premium · Entreprises',
      location: 'Galleria — Poste 1',
      avatarColor: 'linear-gradient(135deg,#0891B2,#2563EB)',
      status: 'LIVE',
      lastActivity: 'Il y a 1 min',
      kpi: { ca: 3200, caObjectif: 3500, score: 0.95, clients: 9 },
      hourlyActivity: [55, 70, 85, 90, 100, 88, 92, 95],
      alertCount: 0,
      alerts: [
        { id: 'e1', severity: 'green', title: 'Excellent score',   message: 'Score 0.95 — top équipe',             time: '14:31' },
        { id: 'e2', severity: 'green', title: 'Objectif en vue',   message: 'CA 3 200€ — prévision EOD 3 600€',   time: '14:25' },
      ],
    },
    {
      id: 'MB',
      initials: 'MB',
      name: 'Mohamed Bouzid',
      specialty: 'B2B · Forfaits Pro',
      location: 'Galleria — Poste 3',
      avatarColor: 'linear-gradient(135deg,#475569,#334155)',
      status: 'HORS LIGNE',
      lastActivity: 'Il y a 47 min',
      kpi: { ca: 0, caObjectif: 2000, score: 0.0, clients: 0 },
      hourlyActivity: [0, 0, 0, 0, 0, 0, 0, 0],
      alertCount: 0,
      alerts: [
        { id: 'f1', severity: 'amber', title: 'Agent déconnecté', message: 'Hors ligne depuis 47 min', time: '13:45' },
      ],
    },
  ];

  readonly filters: Array<'Tous' | AgentStatus> = ['Tous', 'LIVE', 'ACTIF', 'RUN', 'HORS LIGNE'];

  readonly filteredAgents = computed(() => {
    const f = this.activeFilter();
    return f === 'Tous' ? this.agents : this.agents.filter(a => a.status === f);
  });

  get liveCount():    number { return this.agents.filter(a => a.status === 'LIVE').length; }
  get actifCount():   number { return this.agents.filter(a => a.status === 'ACTIF' || a.status === 'RUN').length; }
  get offlineCount(): number { return this.agents.filter(a => a.status === 'HORS LIGNE').length; }

  get allAlerts(): (AgentAlert & { agentName: string })[] {
    return this.agents
      .flatMap(a => a.alerts.map(al => ({ ...al, agentName: a.name })))
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 8);
  }

  perfPct(ca: number, obj: number): number {
    return Math.min(100, Math.round((ca / obj) * 100));
  }

  perfColor(pct: number): string {
    return pct >= 80 ? '#10B981' : pct >= 50 ? '#F97316' : '#EF4444';
  }

  scoreColor(s: number): string {
    return s >= 0.85 ? '#10B981' : s >= 0.7 ? '#F97316' : '#EF4444';
  }

  barMaxPx(activity: number[]): number {
    return Math.max(...activity, 1);
  }

  severityIcon(s: string): string {
    return ({ red:'🔴', amber:'🟡', green:'🟢', blue:'🤖' } as Record<string, string>)[s] ?? '•';
  }

  setFilter(f: 'Tous' | AgentStatus): void {
    this.activeFilter.set(f);
  }
}
