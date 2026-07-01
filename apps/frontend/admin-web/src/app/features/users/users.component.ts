import { Component } from '@angular/core';

@Component({
  selector: 'app-users',
  standalone: true,
  template: `
    <div class="min-h-screen bg-background p-8">
      <h1 class="text-3xl font-bold text-foreground">Users</h1>
      <p class="mt-2 text-muted-foreground">User management.</p>
    </div>
  `,
})
export class UsersComponent {}
