import { Component, OnInit, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MsalService } from '@azure/msal-angular';
import type { AccountInfo } from '@azure/msal-browser';

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 py-12 px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">Profile</h1>
        @if (account()) {
          <p class="text-gray-600">Signed in as: {{ account()?.username }}</p>
        } @else {
          <p class="text-gray-600">Not signed in.</p>
        }
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly msalService = inject(MsalService);

  public readonly account = signal<AccountInfo | null>(null);

  public ngOnInit(): void {
    this.title.setTitle('Profile | Customer Web');
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.account.set(accounts[0]);
    }
  }
}
