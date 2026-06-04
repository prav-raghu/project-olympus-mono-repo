import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 py-12 px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">About</h1>
        <p class="text-gray-600">Customer portal built with Angular and Azure MSAL.</p>
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
