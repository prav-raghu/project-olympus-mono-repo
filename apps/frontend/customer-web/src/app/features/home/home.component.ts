import { Component, OnInit, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-linear-to-br from-background to-muted py-12 px-4">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-5xl font-bold text-foreground mb-4">Welcome</h1>
        <p class="text-xl text-muted-foreground mb-8">Angular + MSAL + Tailwind CSS</p>
        <a routerLink="/about" class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors">
          Learn More &rarr;
        </a>
      </div>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  public ngOnInit(): void {
    this.title.setTitle('Home | Customer Web');
    this.meta.updateTag({ name: 'description', content: 'Welcome to the customer portal.' });
  }
}
