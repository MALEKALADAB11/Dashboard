import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopnavComponent } from './features/layout/topnav/topnav';
import { FooterComponent } from './features/layout/footer/footer';
import { ThemeService } from './core/services/theme';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopnavComponent, FooterComponent],
  template: `
    <div class="app-shell">
      <app-topnav />
      <main class="app-main">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .app-main  { flex: 1; overflow: hidden; display: flex; }
  `]
})
export class AppComponent implements OnInit {
  private theme = inject(ThemeService);
  ngOnInit() { this.theme.set('blue'); }
}