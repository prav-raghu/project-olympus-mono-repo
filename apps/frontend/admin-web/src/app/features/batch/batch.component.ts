import { Component } from '@angular/core';

@Component({
  selector: 'app-batch',
  standalone: true,
  template: `
    <div class="min-h-screen bg-background p-8">
      <h1 class="text-3xl font-bold text-foreground">Batch Operations</h1>
      <p class="mt-2 text-muted-foreground">Batch processing.</p>
    </div>
  `,
})
export class BatchComponent {}
