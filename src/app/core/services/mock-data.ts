import { Injectable } from '@angular/core';
import { Advisor, KpiCard, AlertItem } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MockDataService {

  getKpiCards(): KpiCard[] {
    return [
      { label:'CA Journalier',   value:'4 250€', sub:'Objectif 8 000€ · 3h28',     color:'blue',   progress:53 },
      { label:'Prévision EOD',   value:'6 800€', sub:'IC 80% [5 400–8 200€]',       color:'amber',  trend:{ label:'⟳ α=0.52',       type:'neutral' } },
      { label:'Score Coaching',  value:'0.81',   sub:'AuditAgent · 4 conseils',      color:'green',  trend:{ label:'↑ +0.07 vs hier', type:'up'      } },
      { label:'Trafic Boutique', value:'12',     sub:'Capacité 20 · 60%',           color:'purple', progress:60 },
    ];
  }

  getAdvisors(): Advisor[] {
    return [
      { initials:'KB', name:'Karim Benali', specialty:'Smartphones · 5G',  avatar:'#2563EB', sales:1850, target:2000, forecast:2050, coachScore:0.91, status:'sent'    },
      { initials:'SM', name:'Sara Moulai',  specialty:'Fibre · Offres Pro', avatar:'#059669', sales:1200, target:2000, forecast:1750, coachScore:0.78, status:'urgent'  },
      { initials:'AT', name:'Amine Tazi',   specialty:'Accessoires',        avatar:'#DC2626', sales:750,  target:2000, forecast:1100, coachScore:0.65, status:'urgent'  },
      { initials:'LK', name:'Leila Khadri', specialty:'Rétention · CRM',   avatar:'#7C3AED', sales:450,  target:2000, forecast:720,  coachScore:0.55, status:'waiting' },
    ];
  }

  getAlerts(): AlertItem[] {
    return [
      { title:'Sara M. — Objectif critique 60%', desc:'Prévision EOD 1 750€ · Coach généré', time:'14:30',    severity:'red'   },
      { title:'Pic trafic prévu 16h30',          desc:'+8 visiteurs · Fenêtre 45 min',        time:'Dans 1h58', severity:'amber' },
    ];
  }
}