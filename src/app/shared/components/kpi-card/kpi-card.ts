import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCard } from '../../../core/models/models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss'
})
export class KpiCardComponent {
  @Input({ required: true }) card!: KpiCard;
}