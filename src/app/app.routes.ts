import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard')
        .then(m => m.DashboardComponent),
    title: 'Dashboard Manager — AI Sales Coach'
  },
  {
    path: 'conseiller',
    loadComponent: () =>
      import('./features/advisor/advisor')
        .then(m => m.AdvisorComponent),
    title: 'Interface Conseiller — AI Sales Coach'
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat-panel/chat-panel')
        .then(m => m.ChatPanelComponent),
    title: 'CoachAgent Chat — AI Sales Coach'
  },
  {
    path: 'monitoring',
    loadComponent: () =>
      import('./features/monitoring/monitoring')
        .then(m => m.MonitoringComponent),
    title: 'Monitoring Agents — AI Sales Coach'
  },
  { path: '**', redirectTo: 'dashboard' }
];