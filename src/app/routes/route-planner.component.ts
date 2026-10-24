import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UiButton } from '@zouriel/ui/button';
import { UiMap, type UiLatLng, type UiMapMarker, type UiMapPulse, type UiMapRoute } from '@zouriel/ui/map';
import { UiDrawer } from '@zouriel/ui/dialog';
import { UiProgressBar } from '@zouriel/ui/progress';
import { MaleMoveApi, type RouteAlternative, type VehicleType } from '../data/male-move-api.service';
import { permitMarkers } from '../data/permit-markers';

const VEHICLES: { value: VehicleType; label: string; hint: string }[] = [
  { value: 'motorcycle', label: 'Motorcycle', hint: 'Default · filters through traffic' },
  { value: 'car', label: 'Car', hint: 'Follows road speeds' },
  { value: 'bicycle', label: 'Bicycle', hint: 'Up to 14 km/h' },
  { value: 'walking', label: 'Walking', hint: '4.8 km/h · one-way streets allowed' },
];

/** Route check on the map: first tap is the start, second tap the destination, and the route follows. */
@Component({
  selector: 'mm-route-planner',
  standalone: true,
  imports: [UiButton, UiMap, UiDrawer, UiProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="planner">
      <div class="planner-stage">
        <ui-map #map fill [center]="center" [zoom]="13" [markers]="markers()" markerLabels="selected" [routes]="lines()" [pulse]="pulse()" (mapTap)="tapped($event)" ariaLabel="Route map: tap your start, then your destination" />

        <div class="planner-panel" animate.enter="ui-slide-down-enter">
          <ol class="steps" aria-label="Progress">
            <li class="step" [class.done]="!!from()" [class.current]="step() === 1"><span class="step-dot">1</span>Start</li>
            <li class="step-line" [class.filled]="!!from()" aria-hidden="true"></li>
            <li class="step" [class.done]="!!to()" [class.current]="step() === 2"><span class="step-dot">2</span>Destination</li>
            <li class="step-line" [class.filled]="!!route()" aria-hidden="true"></li>
            <li class="step" [class.done]="!!route()" [class.current]="step() === 3"><span class="step-dot">3</span>Route</li>
          </ol>
          @for (text of [prompt()]; track text) {
            <p class="planner-step" aria-live="polite" animate.enter="ui-fade-enter">{{ text }}</p>
          }
          @if (busy()) { <ui-progress-bar class="planner-progress" [value]="null" label="Finding the route" animate.enter="ui-fade-enter" /> }
          <div class="planner-actions">
            <ui-button variant="outline" size="sm" (click)="vehicleOpen.set(true)">{{ vehicleLabel() }} ▾</ui-button>
            @if (from()) { <ui-button variant="ghost" size="sm" (click)="reset()" animate.enter="ui-fade-enter">Start over</ui-button> }
          </div>
        </div>

        @if (route(); as r) {
          <div class="planner-result" animate.enter="ui-slide-up-enter" animate.leave="ui-slide-down-leave" aria-live="polite">
            <div class="result-time"><b>{{ minutes(r.estimatedDurationSeconds) }}</b><span>by {{ vehicleLabel().toLowerCase() }}</span></div>
            <div class="result-meta">
              <span>{{ km(r.distanceMeters) }}</span>
              <span class="dot-sep" aria-hidden="true"></span>
              <span>Arrive {{ clock(r.estimatedArrival) }}</span>
            </div>
            <span class="result-tag" [class.warn]="!avoidsRoadworks()">{{ avoidsRoadworks() ? 'Avoids active roadworks' : 'Passes through roadworks' }}</span>
          </div>
        }
        @if (error()) { <div class="planner-error" role="alert" animate.enter="ui-slide-up-enter">{{ error() }}</div> }
      </div>
      <p class="map-note">Estimates from the road network and approved roadworks, not live traffic. Amber dots are roadworks.</p>
    </section>
    <ui-drawer side="bottom" title="Vehicle type" [(open)]="vehicleOpen">
      <div class="vehicle-list" role="radiogroup" aria-label="Vehicle type">
        @for (v of vehicles; track v.value) {
          <button type="button" role="radio" class="vehicle" [class.active]="vehicle() === v.value" [attr.aria-checked]="vehicle() === v.value" (click)="pickVehicle(v.value)">
            <b>{{ v.label }}</b><span>{{ v.hint }}</span>
          </button>
        }
      </div>
    </ui-drawer>
  `,
})
export class RoutePlannerComponent {
  private readonly api = inject(MaleMoveApi);
  private readonly map = viewChild<UiMap>('map');
  readonly center = { lat: 4.1950, lng: 73.5250 };

  readonly from = signal<UiLatLng | null>(null);
  readonly to = signal<UiLatLng | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly route = signal<RouteAlternative | null>(null);
  readonly avoidsRoadworks = signal(true);
  readonly step = computed(() => (!this.from() ? 1 : !this.to() || !this.route() ? 2 : 3));
  /** Searching rings: on the start while waiting for the destination, and while the route is worked out. */
  readonly pulse = computed<UiMapPulse | null>(() => {
    const from = this.from();
    if (!from || (this.to() && !this.busy())) return null;
    return { ...from, tone: 'success' };
  });
  readonly vehicles = VEHICLES;
  readonly vehicle = signal<VehicleType>('motorcycle');
  readonly vehicleOpen = signal(false);
  readonly vehicleLabel = computed(() => VEHICLES.find((v) => v.value === this.vehicle())?.label ?? 'Motorcycle');

  readonly prompt = computed(() => {
    if (!this.from()) return 'Tap the map where you are starting.';
    if (!this.to()) return 'Now tap where you want to go.';
    if (this.busy()) return 'Finding the route…';
    return this.route() ? 'Tap the map again to plan a new trip.' : 'Tap the map to try another trip.';
  });
  /** Active roadworks, shown so people can see what the route goes around. */
  private readonly roadworks = signal<UiMapMarker[]>([]);
  constructor() {
    firstValueFrom(this.api.roadworks({ west: 73.2, south: 4.0, east: 73.8, north: 4.5 }))
      .then((r) => this.roadworks.set(permitMarkers(r.data?.features ?? [])))
      .catch(() => this.roadworks.set([]));
  }
  readonly markers = computed<UiMapMarker[]>(() => {
    const from = this.from(), to = this.to();
    return [
      ...this.roadworks(),
      ...(from ? [{ id: 'from', ...from, tone: 'success' as const, label: 'Start' }] : []),
      ...(to ? [{ id: 'to', ...to, tone: 'danger' as const, label: 'Destination' }] : []),
    ];
  });
  readonly lines = computed<UiMapRoute[]>(() => {
    const r = this.route();
    return r ? [{ id: 'route', tone: 'primary', label: `Route, ${this.km(r.distanceMeters)}`, points: r.geometry.map((p) => ({ lat: p.latitude, lng: p.longitude })) }] : [];
  });

  tapped(point: UiLatLng): void {
    if (this.busy()) return;
    this.error.set('');
    if (!this.from() || this.to()) {
      this.from.set(point); this.to.set(null); this.route.set(null);
      return;
    }
    this.to.set(point);
    void this.check();
  }

  pickVehicle(value: VehicleType): void {
    this.vehicle.set(value);
    this.vehicleOpen.set(false);
    if (this.from() && this.to()) void this.check();
  }

  reset(): void {
    this.from.set(null); this.to.set(null); this.route.set(null); this.error.set('');
  }

  private async check(): Promise<void> {
    const from = this.from(), to = this.to();
    if (!from || !to) return;
    this.busy.set(true);
    try {
      const response = await firstValueFrom(this.api.calculateRoute({
        origin: { latitude: from.lat, longitude: from.lng },
        destination: { latitude: to.lat, longitude: to.lng },
        departureTime: new Date().toISOString(),
        vehicleType: this.vehicle(),
      }));
      const best = response.data?.alternatives[0];
      if (!response.success || !best) throw new Error();
      this.route.set(best);
      this.avoidsRoadworks.set(!(response.data?.assumptions ?? []).some((a) => a.startsWith('No route avoids')));
      // Frame the route clear of the floating step panel (top) and result card (bottom).
      this.map()?.fitPoints([...best.geometry.map((p) => ({ lat: p.latitude, lng: p.longitude })), from, to], { padding: { top: 170, bottom: 150, left: 32, right: 32 } });
    } catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 422
        ? 'No road connects those two points. Tap places on Malé, Hulhulé or Hulhumalé.'
        : error instanceof HttpErrorResponse && error.status === 400
          ? 'Tap inside Greater Malé.'
          : 'The route could not be found. Try again.');
    } finally {
      this.busy.set(false);
    }
  }

  minutes(seconds: number): string {
    const m = Math.max(1, Math.round(seconds / 60));
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
  }
  clock(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Maldives' }).format(new Date(iso));
  }
  km(meters: number): string { return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`; }
}
