import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dataset } from '../../../core/services/dataset';


@Component({
  selector: 'app-dataset-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Chargement en cours -->
    @if (ds.loading()) {
      <div class="ds-loading">
        <span class="spin">⚙️</span>
        <div>
          <div class="ds-load-title">Chargement dataset MedTel…</div>
          <div class="ds-load-sub">Boutiques · Contexte · Conseillers · Transactions…</div>
        </div>
      </div>
    }

    <!-- Chargé avec succès -->
    @if (ds.loaded()) {
      <div class="ds-loaded">
        <span class="ds-ok">✅</span>
        <div class="ds-info">
          <div class="ds-title">dataset_MedTel_v4.xlsx</div>
          <div class="ds-stats">
            <span class="ds-pill blue">🏪 {{ ds.boutiques().length }} boutiques</span>
            <span class="ds-pill green">🎯 {{ ds.conseillers().length }} conseillers</span>
            <span class="ds-pill purple">💳 {{ ds.transactions().length }} txn</span>
            <span class="ds-pill amber">🤖 {{ ds.recos().length }} recos IA</span>
          </div>
        </div>
      </div>
    }

    <!-- Erreur -->
    @if (ds.error()) {
      <div class="ds-error">
        <span>⚠️</span>
        <div>
          <div class="ds-err-title">Fichier introuvable</div>
          <div class="ds-err-sub">Copier le .xlsx dans src/assets/</div>
        </div>
        <button class="ds-retry" (click)="ds.loadFromAssets()">⟳ Réessayer</button>
      </div>
    }
  `,
  styles: [`
    .ds-loading { display:flex; align-items:center; gap:9px; padding:10px 12px; background:var(--blue-50); border:1px solid var(--blue-100); border-radius:var(--r); }
    .spin       { font-size:18px; animation:spin 1s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .ds-load-title { font-size:11.5px; font-weight:700; color:var(--blue-700); }
    .ds-load-sub   { font-size:10px; color:var(--n-600); margin-top:1px; }

    .ds-loaded  { padding:10px 12px; background:var(--green-bg); border:1px solid var(--green-l); border-radius:var(--r); display:flex; align-items:flex-start; gap:9px; }
    .ds-ok      { font-size:16px; flex-shrink:0; margin-top:1px; }
    .ds-info    { flex:1; min-width:0; }
    .ds-title   { font-size:11px; font-weight:700; color:var(--green); margin-bottom:5px; font-family:var(--font-mono); }
    .ds-stats   { display:flex; flex-wrap:wrap; gap:4px; }
    .ds-pill    { padding:2px 7px; border-radius:8px; font-size:9.5px; font-weight:600; }
    .ds-pill.blue   { background:var(--blue-50);   color:var(--blue-700); border:1px solid var(--blue-100);  }
    .ds-pill.green  { background:var(--green-bg);  color:var(--green);    border:1px solid var(--green-l);   }
    .ds-pill.purple { background:var(--purple-l);  color:var(--purple);   }
    .ds-pill.amber  { background:var(--amber-bg);  color:var(--amber);    border:1px solid var(--amber-l);   }

    .ds-error   { display:flex; align-items:center; gap:9px; padding:10px 12px; background:var(--red-50); border:1px solid var(--red-100); border-radius:var(--r); font-size:11px; }
    .ds-err-title { font-size:11.5px; font-weight:700; color:var(--red-600); }
    .ds-err-sub   { font-size:10px; color:var(--n-600); margin-top:1px; }
    .ds-retry   { margin-left:auto; padding:4px 10px; border-radius:6px; border:1px solid var(--red-100); background:#fff; font-size:11px; color:var(--red-600); cursor:pointer; font-family:var(--font-body); flex-shrink:0; }
  `]
})
export class DatasetLoaderComponent implements OnInit {
  readonly ds = inject(Dataset);

  ngOnInit(): void {
    // Chargement automatique au démarrage
    if (!this.ds.loaded() && !this.ds.loading()) {
      this.ds.loadFromAssets();
    }
  }
}