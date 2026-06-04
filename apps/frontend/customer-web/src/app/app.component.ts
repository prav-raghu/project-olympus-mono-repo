import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { filter } from 'rxjs/operators';
import { InteractionStatus } from '@azure/msal-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private readonly msalService = inject(MsalService);
  private readonly broadcastService = inject(MsalBroadcastService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  public ngOnInit(): void {
    this.title.setTitle('Customer Web');
    this.meta.addTags([
      { name: 'description', content: 'Customer portal' },
      { property: 'og:title', content: 'Customer Web' },
    ]);

    this.msalService.initialize().subscribe();

    this.broadcastService.inProgress$
      .pipe(filter((status) => status === InteractionStatus.None))
      .subscribe(() => {
        this.msalService.instance.enableAccountStorageEvents();
      });
  }
}
