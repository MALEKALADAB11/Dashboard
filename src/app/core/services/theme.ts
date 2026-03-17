import { Injectable, signal, effect } from '@angular/core';

export type Palette = 'blue' | 'red';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly palette = signal<Palette>('blue');

  constructor() {
    effect(() => {
      document.body.classList.remove('theme-blue', 'theme-red');
      document.body.classList.add(`theme-${this.palette()}`);
    });
    document.body.classList.add('theme-blue');
  }

  toggle(): void { this.palette.update(p => p === 'blue' ? 'red' : 'blue'); }
  set(p: Palette): void { this.palette.set(p); }
}