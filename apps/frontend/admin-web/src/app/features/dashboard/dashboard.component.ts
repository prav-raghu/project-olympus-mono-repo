import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="min-h-screen bg-background p-8">
      <h1 class="text-3xl font-bold text-foreground">Dashboard</h1>
      <p class="mt-2 text-muted-foreground">Welcome to the admin dashboard.</p>
    </div>
  `,
})
export class DashboardComponent {}
