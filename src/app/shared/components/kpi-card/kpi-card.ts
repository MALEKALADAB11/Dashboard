import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCard } from '../../../core/models/models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-card" [class]="'c-' + card.color">
      <div class="kc-lbl">{{ card.label }}</div>
      <div class="kc-val">{{ card.value }}</div>
      <div class="kc-sub">{{ card.sub }}</div>
      <div class="kc-foot">
        @if (card.progress !== undefined) {
          <div class="kc-prog"><div class="kc-bar" [style.width.%]="card.progress"></div></div>
          <span class="kc-pct">{{ card.progress }}%</span>
        }
        @if (card.trend) {
          <span class="kc-trend" [class]="card.trend.type">{{ card.trend.label }}</span>
        }
      </div>
    </div>
  `,
  styleUrl: './kpi-card.scss'
})
export class KpiCardComponent {
  @Input({ required: true }) card!: KpiCard;
}