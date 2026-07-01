import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  const mockMsalService = {
    initialize: jasmine.createSpy('initialize').and.returnValue(of(undefined)),
    instance: { enableAccountStorageEvents: jasmine.createSpy('enableAccountStorageEvents') },
  };

  const mockBroadcastService = {
    inProgress$: of(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: MsalService, useValue: mockMsalService },
        { provide: MsalBroadcastService, useValue: mockBroadcastService },
      ],
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('initializes MSAL on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(mockMsalService.initialize).toHaveBeenCalled();
  });
});
