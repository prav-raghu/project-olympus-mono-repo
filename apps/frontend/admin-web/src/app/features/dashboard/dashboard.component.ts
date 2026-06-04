import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 p-8">
      <h1 class="text-3xl font-bold text-gray-800">Dashboard</h1>
      <p class="mt-2 text-gray-600">Welcome to the admin dashboard.</p>
    </div>
  `,
})
export class DashboardComponent {}
