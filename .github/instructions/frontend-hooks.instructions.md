---
applyTo: "apps/frontend/**/features/**,apps/frontend/**/core/services/**"
description: "Angular feature service conventions — HttpClient observables, Signals, pagination, and caching patterns"
---

When creating Angular feature services and component data-loading logic:

- One service per feature domain: `[domain].service.ts` (e.g., `products.service.ts`)
- Services use `inject(ApiClientService)` — never inject `HttpClient` directly
- Return typed `Observable<ResponseDto<T>>` or `Observable<ListResponseDto<T>>` — never `any`
- Use Angular Signals (`signal()`, `computed()`) in components to hold state — never `BehaviorSubject` stores
- Unsubscribe using `takeUntilDestroyed()` from `@angular/core/rxjs-interop` — never manual `.unsubscribe()`

Enterprise scale patterns:
- **Debounced search**: Debounce search inputs (300ms minimum) before triggering API calls using `debounceTime` + RxJS `switchMap`
- **Pagination**: Admin lists use offset pagination (`page`, `pageSize`); customer-facing lists use cursor pagination (`cursor`, `take`)
- **Cache awareness**: For frequently-read data, store results in a Signal and only re-fetch on explicit invalidation (create/update/delete)
- **Error recovery**: Always have an `error` signal and expose a `reload()` method on the component
- **Loading states**: Always have a `loading` signal — show animated skeleton placeholders, not spinners

Pattern (admin list with offset pagination):
```typescript
@Injectable({ providedIn: 'root' })
export class EntitiesService {
  private readonly api = inject(ApiClientService);

  public list(page = 1, pageSize = 20): Observable<ListResponseDto<IEntity>> {
    return this.api.get<ListResponseDto<IEntity>>(`/entities?page=${page}&pageSize=${pageSize}`);
  }

  public getById(id: string): Observable<ResponseDto<IEntity>> {
    return this.api.get<ResponseDto<IEntity>>(`/entities/${id}`);
  }

  public create(dto: CreateEntityDto): Observable<ResponseDto<IEntity>> {
    return this.api.post<ResponseDto<IEntity>>('/entities', dto);
  }

  public update(id: string, dto: UpdateEntityDto): Observable<ResponseDto<IEntity>> {
    return this.api.put<ResponseDto<IEntity>>(`/entities/${id}`, dto);
  }

  public delete(id: string): Observable<ResponseDto<never>> {
    return this.api.delete<ResponseDto<never>>(`/entities/${id}`);
  }
}
```

Pattern (component with search + debounce):
```typescript
export class EntityListComponent implements OnInit {
  private readonly service = inject(EntitiesService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly items = signal<IEntity[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly searchControl = new FormControl('');

  public ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      switchMap((term) => this.service.list(1, 20)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load'); this.loading.set(false); },
    });

    this.load();
  }

  public load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load'); this.loading.set(false); },
    });
  }
}
```

NEVER use React Query, Zustand, Redux, RxJS BehaviorSubject stores, or any React-specific patterns.
NEVER use RxJS `BehaviorSubject` as a component-level store — use Signals.
NEVER use template-driven forms — always Angular reactive forms with `Validators`.
