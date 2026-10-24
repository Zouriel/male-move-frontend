import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ApiEnvelope<T> { success: boolean; data: T; message?: string; }
export interface PermitSummary extends Record<string, unknown> {
  id: string; permitNumber: string; locationDescription: string; workDescription: string;
  approvalState: number; impactType: number; startsAt: string | null; endsAt: string | null;
  revision: number;
}
export interface PopulationRow extends Record<string, unknown> {
  areaCode: string; areaName: string; areaType: string; year: number; indicator: string; category: string | null;
  value: number; unit: string; isProjection: boolean; sourceTitle: string; sourceLocator: string;
}
export interface PopulationPage { items: PopulationRow[]; total: number; page: number; pageSize: number; }
export interface DataSource extends Record<string, unknown> {
  id: string; publisher: string; title: string; sourceUri: string | null; sourceYear: number | null; license: string | null;
  approvalState: string; coverageDescription: string; limitations: string; lastCheckedAt: string | null;
}
export interface RouteAlternative extends Record<string, unknown> {
  rank: number; geometry: { latitude: number; longitude: number }[]; distanceMeters: number;
  estimatedDurationSeconds: number; estimatedArrival: string; affectedPermitIds: string[];
}
export interface RouteResult extends Record<string, unknown> {
  alternatives: RouteAlternative[]; trafficLabel: string; trafficProfileVersion: string; networkVersion: string;
  calculatedAt: string; assumptions: string[];
}
export interface MapFeaturePage<T> { features: T[]; truncated: boolean; }
export interface RoadFeature { id: string; name: string | null; roadClass: string; coordinates: { latitude: number; longitude: number }[]; }
export interface RoadworkFeature { permitId: string; permitNumber: string; locationDescription: string; impactType: number; startsAt: string; endsAt: string; coordinates: { latitude: number; longitude: number }[]; approvalState: string; }
export interface PermitExtraction {
  permitNumber: string | null; locationDescription: string | null; workDescription: string | null; contractor: string | null; impactType: string | null;
  startDate: string | null; startTime: string | null; endDate: string | null; endTime: string | null; dailyStart: string | null; dailyEnd: string | null; streetNames: string[];
}
export interface UpdatePermitRequest {
  permitNumber: string; locationDescription: string; workDescription: string; contractor: string | null;
  impactType: number; startsAt: string; endsAt: string; dailyStart: string | null; dailyEnd: string | null; revision: number;
  streetNames?: string[];
}
export type VehicleType = 'motorcycle' | 'car' | 'bicycle' | 'walking';
export interface RouteRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  departureTime: string; trafficProfileId?: string; vehicleType?: VehicleType;
}

@Injectable({ providedIn: 'root' })
export class MaleMoveApi {
  private readonly http = inject(HttpClient);
  permits(page = 1): Observable<ApiEnvelope<{ items: PermitSummary[]; total: number }>> {
    return this.http.get<ApiEnvelope<{ items: PermitSummary[]; total: number }>>(`/api/v1/permits?page=${page}`);
  }
  uploadPermit(file: File): Observable<ApiEnvelope<PermitSummary>> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<ApiEnvelope<PermitSummary>>('/api/v1/permits/upload', body);
  }
  updatePermit(id: string, request: UpdatePermitRequest): Observable<ApiEnvelope<PermitSummary>> {
    return this.http.put<ApiEnvelope<PermitSummary>>(`/api/v1/permits/${encodeURIComponent(id)}`, request);
  }
  extractPermit(id: string): Observable<ApiEnvelope<PermitExtraction>> {
    return this.http.post<ApiEnvelope<PermitExtraction>>(`/api/v1/permits/${encodeURIComponent(id)}/extract`, {});
  }
  submitPermit(id: string): Observable<ApiEnvelope<PermitSummary>> {
    return this.http.post<ApiEnvelope<PermitSummary>>(`/api/v1/permits/${encodeURIComponent(id)}/submit`, {});
  }
  population(): Observable<ApiEnvelope<PopulationPage>> {
    return this.http.get<ApiEnvelope<PopulationPage>>('/api/v1/population/series?pageSize=200');
  }
  dataSources(): Observable<ApiEnvelope<DataSource[]>> {
    return this.http.get<ApiEnvelope<DataSource[]>>('/api/v1/dataSources');
  }
  roads(bounds: { west: number; south: number; east: number; north: number }): Observable<ApiEnvelope<MapFeaturePage<RoadFeature>>> {
    const query = new URLSearchParams(Object.entries(bounds).map(([key, value]) => [key, String(value)]));
    return this.http.get<ApiEnvelope<MapFeaturePage<RoadFeature>>>(`/api/v1/map/roads?${query}`);
  }
  roadworks(bounds: { west: number; south: number; east: number; north: number }): Observable<ApiEnvelope<MapFeaturePage<RoadworkFeature>>> {
    const query = new URLSearchParams(Object.entries(bounds).map(([key, value]) => [key, String(value)]));
    return this.http.get<ApiEnvelope<MapFeaturePage<RoadworkFeature>>>(`/api/v1/map/roadworks?${query}`);
  }
  calculateRoute(request: RouteRequest): Observable<ApiEnvelope<RouteResult>> {
    return this.http.post<ApiEnvelope<RouteResult>>('/api/v1/routes', request);
  }
}
