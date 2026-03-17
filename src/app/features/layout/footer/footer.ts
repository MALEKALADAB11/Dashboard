import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <div class="footer-bar">
      <span class="foot-item">Pipeline <strong>7.2s</strong></span>
      <span class="foot-sep"></span>
      <span class="foot-item">Audit <strong class="ok">0.81</strong></span>
      <span class="foot-sep"></span>
      <span class="foot-item">LLM <strong class="ok">Claude Sonnet</strong></span>
      <span class="foot-sep"></span>
      <span class="foot-item">Adoption <strong class="blue">75%</strong></span>
      <span class="foot-right">MAJ 14:32:07 · LangGraph v2.1 · Mistral-7B-Telco-FT-v1</span>
    </div>
  `,
  styles: [`
    .footer-bar  { height: 34px; background: #fff; border-top: 1px solid var(--n-300); display: flex; align-items: center; padding: 0 20px; gap: 10px; flex-shrink: 0; }
    .foot-item   { font-size: 10.5px; color: var(--n-600); }
    .foot-item strong { font-weight: 700; color: var(--n-800); }
    .foot-item strong.ok   { color: var(--green); }
    .foot-item strong.blue { color: var(--blue-700); }
    .foot-sep    { width: 1px; height: 12px; background: var(--n-300); }
    .foot-right  { margin-left: auto; font-size: 10px; color: var(--n-500); font-family: var(--font-mono); }
  `]
})
export class FooterComponent {}