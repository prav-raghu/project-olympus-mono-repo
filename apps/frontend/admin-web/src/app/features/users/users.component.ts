import { Component } from '@angular/core';

@Component({
  selector: 'app-users',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 p-8">
      <h1 class="text-3xl font-bold text-gray-800">Users</h1>
      <p class="mt-2 text-gray-600">User management.</p>
    </div>
  `,
})
export class UsersComponent {}
