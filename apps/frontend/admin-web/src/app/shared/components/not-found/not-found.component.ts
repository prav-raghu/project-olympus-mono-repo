import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-muted-foreground">404</h1>
        <p class="mt-4 text-xl text-muted-foreground">Page not found</p>
        <a routerLink="/dashboard" class="mt-6 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
          Go to Dashboard
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
