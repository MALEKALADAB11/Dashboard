import { Injectable, signal, computed, inject } from '@angular/core';
import * as XLSX from 'xlsx';

// ── Types ──────────────────────────────────────────────────────
export interface BoutiqueDS {
  id: string; ville: string; zone: string; type: string;
  objectif: number; realise: number; taux: number;
  rang: number; responsable: string; conseillers: number; nps: number;
}
export interface TimePoint {
  date: string; label: string;
  objectif: number; realise: number; footfall: number; meteo: string;
}
export interface ConseillerDS {
  id: string; nom: string; storeId: string; ville: string;
  specialite: string; taux: number; panier: number;
  scoreCoach: number; pctObj: number; statut: string; sessions: number;
}
export interface KpiRetail {
  id: string; nom: string; storeId: string;
  revenu: number; marge: number; pctObj: number;
  panier: number; taux: number; nps: number; scoreCoach: number;
}
export interface RecoIA {
  id: string; clientNom: string; storeId: string;
  playbook: string; categorie: string; priorite: string;
  message: string; scoreChurn: number; scoreUpsell: number;
  uplift: number; actionnee: boolean; resultat: number;
}
export interface TxnDS {
  id: string; date: string; storeId: string; ville: string;
  conseillerId: string; revenu: number; marge: number;
  typeVente: string; terminal: string; forfait: string;
  coachActive: boolean; recoSuivie: boolean; nps: number;
}
export interface StoreSeries {
  storeId: string; ville: string;
  series: { date: string; rev: number }[];
}

@Injectable({ providedIn: 'root' })
export class Dataset {

  // ── Signals ───────────────────────────────────────────────────
  readonly loaded      = signal(false);
  readonly loading     = signal(false);
  readonly error       = signal<string | null>(null);

  readonly boutiques   = signal<BoutiqueDS[]>([]);
  readonly timeSeries  = signal<TimePoint[]>([]);
  readonly conseillers = signal<ConseillerDS[]>([]);
  readonly kpisRetail  = signal<KpiRetail[]>([]);
  readonly recos       = signal<RecoIA[]>([]);
  readonly transactions= signal<TxnDS[]>([]);
  readonly storeSeries = signal<StoreSeries[]>([]);

  // ── Computed KPIs réseau ──────────────────────────────────────
  readonly totalCA   = computed(() => this.boutiques().reduce((s,b) => s+b.realise, 0));
  readonly totalObj  = computed(() => this.boutiques().reduce((s,b) => s+b.objectif, 0));
  readonly pctReseau = computed(() => this.totalObj() > 0
    ? Math.round(this.totalCA()/this.totalObj()*100) : 0);
  readonly avgNps    = computed(() => {
    const b = this.boutiques();
    return b.length ? +(b.reduce((s,x)=>s+x.nps,0)/b.length).toFixed(1) : 0;
  });
  readonly avgCoach  = computed(() => {
    const c = this.conseillers();
    return c.length ? +(c.reduce((s,x)=>s+x.scoreCoach,0)/c.length).toFixed(1) : 0;
  });
  readonly topBoutique = computed(() =>
    [...this.boutiques()].sort((a,b)=>b.taux-a.taux)[0] ?? null);
  readonly alertBoutiques = computed(() =>
    this.boutiques().filter(b=>b.taux < 80).sort((a,b)=>a.taux-b.taux));
  readonly unreadRecos = computed(() =>
    this.recos().filter(r=>!r.actionnee).length);

  // ── Chargement auto depuis assets/ ───────────────────────────
  async loadFromAssets(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res    = await fetch('assets/dataset_MedTel_v4.xlsx');
      if (!res.ok) throw new Error(`HTTP ${res.status} — fichier introuvable dans assets/`);
      const buffer = await res.arrayBuffer();
      const wb     = XLSX.read(buffer, { type:'array', cellDates:true });
      this.parse(wb);
      this.loaded.set(true);
    } catch(e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Parser principal ──────────────────────────────────────────
  private parse(wb: XLSX.WorkBook): void {
    this.parseBoutiques(wb);
    this.parseContexte(wb);
    this.parseConseillers(wb);
    this.parseKpisRetail(wb);
    this.parseRecos(wb);
    this.parseTransactions(wb);
    this.buildStoreSeries();
  }

  // ── 🏪 Boutiques ──────────────────────────────────────────────
  private parseBoutiques(wb: XLSX.WorkBook): void {
    const rows = this.getRows(wb, '🏪 Boutiques');
    this.boutiques.set(rows.map(r => {
      const obj  = +r['OBJECTIF REV MENSUEL DH'] || 0;
      const real = +r['REALISE REV MOIS DH']     || 0;
      return {
        id:          String(r['STORE ID']             ?? ''),
        ville:       String(r['VILLE']                ?? ''),
        zone:        String(r['ZONE QUARTIER']        ?? ''),
        type:        String(r['TYPE BOUTIQUE']        ?? ''),
        objectif:    obj,
        realise:     real,
        taux:        obj > 0 ? +(real/obj*100).toFixed(1) : 0,
        rang:        +r['RANG NATIONAL']              || 99,
        responsable: String(r['RESPONSABLE BOUTIQUE'] ?? ''),
        conseillers: +r['NB CONSEILLERS ACTIFS']      || 0,
        nps:         +r['NPS MOYEN TRIMESTRE']        || 0,
      };
    }));
  }

  // ── 🌤 Contexte (time series CA réseau) ───────────────────────
  private parseContexte(wb: XLSX.WorkBook): void {
    const rows = this.getRows(wb, '🌤 Contexte');
    const pts: TimePoint[] = rows.map(r => {
      const d   = r['DATE'];
      const str = d instanceof Date
        ? d.toISOString().slice(0,10)
        : String(d).slice(0,10);
      return {
        date:     str,
        label:    str.slice(8,10)+'/'+str.slice(5,7),
        objectif: +r['OBJECTIF REV JOUR DH'] || 0,
        realise:  +r['REALISE REV JOUR DH']  || 0,
        footfall: +r['FOOTFALL REEL']         || 0,
        meteo:    String(r['METEO'] ?? 'Doux'),
      };
    }).filter(p => p.objectif > 0);
    pts.sort((a,b)=>a.date.localeCompare(b.date));
    this.timeSeries.set(pts);
  }

  // ── 🎯 Conseillers ─────────────────────────────────────────────
  private parseConseillers(wb: XLSX.WorkBook): void {
    const rows = this.getRows(wb, '🎯 Conseillers');
    this.conseillers.set(rows.map(r => ({
      id:         String(r['CONSEILLER ID']         ?? ''),
      nom:        String(r['NOM COMPLET']           ?? ''),
      storeId:    String(r['STORE ID']              ?? ''),
      ville:      String(r['VILLE']                 ?? ''),
      specialite: String(r['SPECIALITE PRINCIPALE'] ?? ''),
      taux:       +(+r['TAUX CONVERSION']*100||0).toFixed(1),
      panier:     +r['PANIER MOYEN DH']             || 0,
      scoreCoach: +r['SCORE COACHING IA']           || 0,
      pctObj:     +(+r['PCT OBJECTIF ATTEINT']*100||0).toFixed(1),
      statut:     String(r['STATUT OBJECTIF']       ?? ''),
      sessions:   +r['SESSIONS COACHING YTD']       || 0,
    })));
  }

  // ── 📊 KPIs Retail ────────────────────────────────────────────
  private parseKpisRetail(wb: XLSX.WorkBook): void {
    const rows = this.getRows(wb, '📊 KPIs Retail');
    this.kpisRetail.set(rows.map(r => ({
      id:         String(r['CONSEILLER ID']  ?? ''),
      nom:        String(r['NOM COMPLET']    ?? ''),
      storeId:    String(r['STORE ID']       ?? ''),
      revenu:     +r['REVENU TOTAL DH']      || 0,
      marge:      +r['MARGE TOTALE DH']      || 0,
      pctObj:     +(+r['PCT OBJECTIF']*100||0).toFixed(1),
      panier:     +r['PANIER MOYEN DH']      || 0,
      taux:       +(+r['TAUX CONVERSION']*100||0).toFixed(1),
      nps:        +r['NPS MOYEN CLIENTS']    || 0,
      scoreCoach: +r['SCORE COACHING IA']    || 0,
    })));
  }

  // ── 🤖 Recommandations IA ─────────────────────────────────────
  private parseRecos(wb: XLSX.WorkBook): void {
    const rows = this.getRows(wb, '🤖 Recommandations IA');
    this.recos.set(rows.map(r => ({
      id:          String(r['REC ID']           ?? ''),
      clientNom:   String(r['NOM CLIENT']       ?? ''),
      storeId:     String(r['STORE ID']         ?? ''),
      playbook:    String(r['PLAYBOOK NOM']     ?? ''),
      categorie:   String(r['CATEGORIE']        ?? ''),
      priorite:    String(r['PRIORITE']         ?? ''),
      message:     String(r['MESSAGE COACHING'] ?? ''),
      scoreChurn:  +r['SCORE CHURN']            || 0,
      scoreUpsell: +r['SCORE UPSELL']           || 0,
      uplift:      +r['UPLIFT ATTENDU PCT']     || 0,
      actionnee:   r['ACTIONNEE'] === 'Oui',
      resultat:    +r['RESULTAT VENTE DH']      || 0,
    })));
  }

  // ── 💳 Transactions POS ───────────────────────────────────────
  private parseTransactions(wb: XLSX.WorkBook): void {
    const rows = this.getRows(wb, '💳 Transactions POS');
    this.transactions.set(rows.map(r => {
      const d   = r['DATE'];
      const str = d instanceof Date
        ? d.toISOString().slice(0,10)
        : String(d).slice(0,10);
      return {
        id:           String(r['TXN ID']               ?? ''),
        date:         str,
        storeId:      String(r['STORE ID']             ?? ''),
        ville:        String(r['VILLE']                ?? ''),
        conseillerId: String(r['CONSEILLER ID']        ?? ''),
        revenu:       +r['REVENU TOTAL DH']            || 0,
        marge:        +r['MARGE ESTIMEE DH']           || 0,
        typeVente:    String(r['TYPE VENTE']           ?? ''),
        terminal:     String(r['TERMINAL MODELE']      ?? ''),
        forfait:      String(r['FORFAIT NOM']          ?? ''),
        coachActive:  r['COACHING IA ACTIVE']  === 'Oui',
        recoSuivie:   r['RECOMMANDATION SUIVIE']=== 'Oui',
        nps:          +r['NPS POST ACHAT']             || 0,
      };
    }));
  }

  // ── Construire séries par boutique depuis transactions ────────
  private buildStoreSeries(): void {
    const map = new Map<string, { ville:string; days: Map<string,number> }>();
    this.transactions().forEach(t => {
      if (!t.storeId || !t.date || t.revenu <= 0) return;
      const label = t.date.slice(8,10)+'/'+t.date.slice(5,7);
      if (!map.has(t.storeId)) map.set(t.storeId, { ville:t.ville, days:new Map() });
      const s = map.get(t.storeId)!;
      s.days.set(label, (s.days.get(label)??0) + t.revenu);
    });

    const result: StoreSeries[] = [];
    map.forEach((val, storeId) => {
      const series = Array.from(val.days.entries())
        .sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([date,rev])=>({ date, rev }));
      if (series.length >= 3)
        result.push({ storeId, ville:val.ville, series });
    });

    // Top 6 par CA total
    result.sort((a,b) =>
      b.series.reduce((s,p)=>s+p.rev,0) -
      a.series.reduce((s,p)=>s+p.rev,0)
    );
    this.storeSeries.set(result.slice(0,6));
  }

  // ── Helper lecture sheet ──────────────────────────────────────
  private getRows(wb: XLSX.WorkBook, name: string): any[] {
    const ws = wb.Sheets[name];
    if (!ws) { console.warn(`Sheet "${name}" introuvable`); return []; }
    return XLSX.utils.sheet_to_json<any>(ws, { defval:'' });
  }
}