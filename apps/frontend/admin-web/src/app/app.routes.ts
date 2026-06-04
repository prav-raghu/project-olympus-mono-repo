import { type Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'users',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./features/users/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'reporting',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./features/reporting/reporting.component').then((m) => m.ReportingComponent),
  },
  {
    path: 'batch',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./features/batch/batch.component').then((m) => m.BatchComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
