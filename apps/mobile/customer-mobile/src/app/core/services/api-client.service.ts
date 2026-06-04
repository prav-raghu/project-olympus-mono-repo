import { Injectable, inject } from '@angular/core';
import { HttpClient, type HttpParams } from '@angular/common/http';
import { type Observable } from 'rxjs';

const API_BASE_URL = 'http://localhost:4002/api/v1';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);

  public get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${API_BASE_URL}${path}`, { params });
  }

  public post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${API_BASE_URL}${path}`, body);
  }

  public put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${API_BASE_URL}${path}`, body);
  }

  public delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${API_BASE_URL}${path}`);
  }
}
