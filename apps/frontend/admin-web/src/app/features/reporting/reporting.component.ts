import { Component } from '@angular/core';

@Component({
  selector: 'app-reporting',
  standalone: true,
  template: `
    <div class="min-h-screen bg-background p-8">
      <h1 class="text-3xl font-bold text-foreground">Reporting</h1>
      <p class="mt-2 text-muted-foreground">Reports and analytics.</p>
    </div>
  `,
})
export class ReportingComponent {}
