import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <div class="min-h-screen bg-background py-12 px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold text-foreground mb-4">About</h1>
        <p class="text-muted-foreground">Customer portal built with Angular and Azure MSAL.</p>
      </div>
    </div>
  `,
})
export class AboutComponent implements OnInit {
  private readonly title = inject(Title);

  public ngOnInit(): void {
    this.title.setTitle('About | Customer Web');
  }
}
