import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme';


@Component({
  selector: 'app-topnav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="topnav">
      <div class="nav-brand">
        <div class="brand-icon">🤖</div>
        <span class="brand-name">AI Sales Coach</span>
      </div>
      <div class="nav-sep"></div>
      <div class="nav-links">
        @for (l of links; track l.path) {
          <a class="nav-link" [routerLink]="l.path" routerLinkActive="active">{{ l.label }}</a>
        }
      </div>
      <div class="nav-right">
        <span class="nav-time">Mer 26 Fév · 14:32</span>
        <div class="nav-sep"></div>
        <div class="live-badge"><span class="live-dot"></span> 5 agents actifs</div>
        <button class="palette-btn" (click)="theme.toggle()" title="Changer palette">
          {{ theme.palette() === 'blue' ? '🔵' : '🔴' }}
        </button>
        <div class="nav-avatar">MG</div>
      </div>
    </nav>
  `,
  styleUrl: './topnav.scss'
})
export class TopnavComponent {
  readonly theme = inject(ThemeService);
  readonly links = [
    { path: '/dashboard',  label: 'Tableau de bord'     },
    { path: '/conseiller', label: 'Interface Conseiller' },
    { path: '/chat',       label: 'CoachAgent Chat'      },
  ];
}