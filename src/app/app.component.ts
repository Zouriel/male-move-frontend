import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UiSidebarLayout } from '@zouriel/ui/layout';
import { UiMap, type UiMapMarker } from '@zouriel/ui/map';
import { permitMarkers } from './data/permit-markers';
import { UiCard, UiStatCard } from '@zouriel/ui/card';
import { UiButton } from '@zouriel/ui/button';
import { UiBadge } from '@zouriel/ui/badge';
import { UiSideNav, type UiSideNavGroup } from '@zouriel/ui/navigation';
import { UiFormRenderer, type UiFormSubmission } from '@zouriel/ui/form-builder';
import { UiFileUpload } from '@zouriel/ui/form';
import { HttpErrorResponse } from '@angular/common/http';
import { UiTable, type UiColumn } from '@zouriel/ui/table';
import { UiEmptyState } from '@zouriel/ui/feedback';
import { AuthSession } from './core/auth-session.service';
import { LoginComponent } from './core/login.component';
import { LocalSignIn } from './core/dev-sign-in';
import { RoutePlannerComponent } from './routes/route-planner.component';
import { MaleMoveApi } from './data/male-move-api.service';
import type { DataSource, PopulationRow, PermitSummary, UpdatePermitRequest } from './data/male-move-api.service';
import { PERMIT_FORM } from './data/permit-form.definition';

type Page = 'Overview' | 'Population' | 'Mobility map' | 'Permits' | 'Route scenarios' | 'Data & methodology';

@Component({
  selector: 'mm-root',
  standalone: true,
  imports: [LoginComponent, RoutePlannerComponent, UiFileUpload, UiSidebarLayout, UiMap, UiCard, UiStatCard, UiButton, UiBadge, UiSideNav, UiFormRenderer, UiTable, UiEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (localSignIn.enabled && !auth.configured) { <mm-login /> } @else {
    <ui-sidebar-layout class="app-shell" [sidebarWidth]="'250px'" [open]="navOpen()" (openChange)="navOpen.set($event)">
      <div sidebar-header class="brand"><span class="brand-mark">M</span><span><b>MALÉ MOVE</b><small>Mobility intelligence</small></span></div>
      <ui-side-nav sidebar [groups]="navGroups" [active]="page()" (navigate)="selectPage($event.value)" label="Planning areas" />
      <div sidebar-footer class="sidebar-foot"><span class="status-dot"></span><span>Planning workspace<small>{{ auth.configured ? 'Connected' : 'Sign-in required' }}</small></span></div>
      <header header class="topbar">
        <div><span class="eyebrow">GREATER MALÉ · MALDIVES</span><h1>{{ page() }}</h1></div>
        <div class="top-actions"><ui-badge>{{ auth.configured ? 'Connected' : 'Identity setup required' }}</ui-badge></div>
      </header>
      <div class="page-content">
        @if (page() === 'Overview') {
          <section class="welcome-row"><div><p class="eyebrow">PLANNING SNAPSHOT</p><h2>See how the city moves.</h2><p class="muted">Population, access and approved roadworks in one planning workspace.</p></div><ui-button variant="primary" (click)="selectPage('Route scenarios')">Plan a route</ui-button></section>
          <div class="metric-grid">
            <ui-stat-card label="Avas ride requests (Aug–Sep 2026)" [value]="stat(sumOf('avas_ride_requests'))" />
            <ui-stat-card label="MTCC bus passengers (2025)" [value]="stat(sumOf('bus_passengers_total', 2025))" />
            <ui-stat-card label="Active approved roadworks" [value]="stat(workCount())" />
            <ui-stat-card label="Road segments on the map" [value]="stat(roadCount()) + (roadsTruncated() ? '+' : '')" />
          </div>
          <ui-card class="map-panel" padding="md">
            <div class="panel-heading"><div><p class="eyebrow">GEOGRAPHIC OVERVIEW</p><h3>Greater Malé map</h3></div><ui-badge>{{ roadCount() ? workCount() + ' active roadworks' : 'Loading layers' }}</ui-badge></div>
            <div class="map-frame"><ui-map fill [center]="mapCenter" [zoom]="13" [markers]="permitDots()" markerLabels="none" /></div>
            <p class="map-note">Amber dots are approved roadworks in effect now; grey dots are awaiting review.</p>
          </ui-card>
          <ui-card class="data-panel overview-permits" padding="md"><div class="panel-heading"><div><p class="eyebrow">ROADWORKS & APPROVALS</p><h3>Permits</h3></div><ui-button variant="outline" (click)="selectPage('Permits')">Open permits</ui-button></div>
            <ui-table [columns]="permitColumns" [data]="permitRows()" emptyText="No permits yet." />
          </ui-card>
          <section class="bottom-grid">
            <ui-card class="info-card" padding="md"><div class="section-title"><div><p class="eyebrow">SOURCE STATUS</p><h3>Data readiness</h3></div><span class="icon-chip">↗</span></div>
              @if (sourceRows().length) { <ul class="mini-list">@for (source of sourceRows(); track source.id) { <li><span>{{ source.title }}</span><ui-badge>{{ source.approvalState }}</ui-badge></li> }</ul> }
              @else { <ui-empty-state heading="No sources registered" description="Registered datasets appear here with their approval state." /> }
            </ui-card>
            <ui-card class="info-card" padding="md"><div class="section-title"><div><p class="eyebrow">WORKFLOW</p><h3>Permit review</h3></div><span class="icon-chip">◷</span></div>
              @if (permitRows().length) { <ul class="mini-list">@for (state of permitStates(); track state.label) { <li><span>{{ state.label }}</span><b>{{ state.count }}</b></li> }</ul> }
              @else { <ui-empty-state heading="No permits yet" description="Registered permits appear here grouped by review state." /> }
            </ui-card>
          </section>
        } @else if (page() === 'Mobility map') {
          <ui-card class="map-panel full-map" padding="md"><div class="panel-heading"><div><p class="eyebrow">SPATIAL ANALYSIS</p><h3>Mobility access map</h3></div></div>
            @if (mapError()) { <div class="api-error" role="alert">{{ mapError() }}</div> }
            <div class="map-frame"><ui-map fill [center]="mapCenter" [zoom]="13" [markers]="permitDots()" markerLabels="none" /></div><p class="map-note">Amber dots are approved roadworks in effect now; route checks go around them. Grey dots are awaiting review.</p></ui-card>
        } @else if (page() === 'Population') {
          <ui-card class="data-panel" padding="md"><div class="panel-heading"><div><p class="eyebrow">OFFICIAL BASELINES & PUBLISHED PROJECTIONS</p><h3>Population series</h3></div></div>
            @if (populationError()) { <div class="api-error" role="alert">{{ populationError() }}</div> }
            @if (populationRows().length) { <ui-table [columns]="populationColumns" [data]="populationRows()" emptyText="No population records." /> }
            @else { <ui-empty-state heading="No approved population data loaded" description="Only source-approved values and supported geographic levels appear here." /> }
          </ui-card>
        } @else if (page() === 'Permits') {
          <ui-card class="data-panel permit-entry" padding="md"><div class="panel-heading"><div><p class="eyebrow">PERMIT OFFICER</p><h3>Register a permit</h3></div><ui-badge>Human review required</ui-badge></div>
            <p class="muted">The original is scanned before it is stored. Submitted details remain pending until an authorized approver confirms the document and affected road segment.</p>
            @if (permitCreateError()) { <div class="api-error" role="alert">{{ permitCreateError() }}</div> }
            @if (permitCreated()) { <div class="success-message" role="status">Submitted. It is on the map now as a grey dot and turns amber once approved.</div> }
            @if (permitReading()) {
              <div class="reading" role="status">Reading your permit…</div>
            } @else if (!pendingPermit()) {
              <ui-file-upload accept=".pdf,.jpg,.jpeg,.png" label="Upload the permit" hint="PDF, JPEG or PNG up to 25 MB. The details are read from it and filled in for you to check." (filesSelected)="readPermit($event)" />
            } @else {
              @if (permitReadNote()) { <p class="muted">{{ permitReadNote() }}</p> }
              <ui-form-renderer [definition]="permitForm" [data]="permitPrefill()" (submitted)="createPermit($event)" [busy]="permitCreateBusy()" />
              <ui-button variant="ghost" size="sm" (click)="startOver()">Use a different file</ui-button>
            }
          </ui-card>
          <ui-card class="data-panel" padding="md"><div class="panel-heading"><div><p class="eyebrow">ROADWORKS & APPROVALS</p><h3>Permit register</h3></div></div>
            @if (permitsError()) { <div class="api-error" role="alert">{{ permitsError() }}</div> }
            @if (permitRows().length) { <ui-table [columns]="permitColumns" [data]="permitRows()" emptyText="No permits found." /> }
            @else { <ui-empty-state heading="No permit records loaded" description="Permit data is private and requires an authenticated permit role. Uploads are malware-scanned before review." /> }
          </ui-card>
        } @else if (page() === 'Data & methodology') {
          <ui-card class="data-panel" padding="md"><div class="panel-heading"><div><p class="eyebrow">PROVENANCE & METHODS</p><h3>Registered data sources</h3></div></div>
            @if (sourcesError()) { <div class="api-error" role="alert">{{ sourcesError() }}</div> }
            @if (sourceRows().length) { <ui-table [columns]="sourceColumns" [data]="sourceRows()" emptyText="No registered data sources." /> }
            @else { <ui-empty-state heading="No sources registered" description="Source metadata includes publisher, year, license, coverage, limitations, approval state and last checked time." /> }
          </ui-card>
        } @else if (page() === 'Route scenarios') {
          <mm-route-planner />
        } @else {
          <section class="feature-state"><p class="eyebrow">{{ sectionLabel(page()) }}</p><ui-empty-state [heading]="page()" [description]="descriptionFor(page())"><ui-badge empty-actions>{{ auth.configured ? 'API data unavailable' : 'Identity setup required' }}</ui-badge></ui-empty-state></section>
        }
      </div>
    </ui-sidebar-layout>
    }
  `,
})
export class AppComponent {
  readonly auth = inject(AuthSession);
  readonly localSignIn = inject(LocalSignIn);
  private loaded = false;
  constructor() {
    // Fill every view as soon as a token is held.
    effect(() => {
      if (!this.auth.configured || this.loaded) return;
      this.loaded = true;
      this.refreshAll();
    });
    // Keep every view current without a Refresh button: reload each minute while the tab is visible.
    const timer = setInterval(() => {
      if (this.auth.configured && document.visibilityState === 'visible') this.refreshAll();
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  private refreshAll(): void {
    void this.loadPopulation(); void this.loadPermits(); void this.loadSources(); void this.loadMap();
  }
  readonly roadCount = signal(0);
  readonly roadsTruncated = signal(false);
  readonly workCount = signal(0);
  readonly permitStates = computed(() => {
    const counts = new Map<string, number>();
    for (const row of this.permitRows()) { const label = this.approvalLabel(row.approvalState); counts.set(label, (counts.get(label) ?? 0) + 1); }
    return [...counts].map(([label, count]) => ({ label, count }));
  });
  sumOf(indicator: string, year?: number): number | null {
    const rows = this.populationRows().filter((r) => r.indicator === indicator && (year === undefined || r.year === year));
    return rows.length ? rows.reduce((total, r) => total + Number(r.value), 0) : null;
  }
  stat(value: number | null): string { return value === null ? '—' : new Intl.NumberFormat('en-US').format(value); }
  private readonly api = inject(MaleMoveApi);
  readonly pages: Page[] = ['Overview', 'Population', 'Mobility map', 'Permits', 'Route scenarios', 'Data & methodology'];
  readonly page = signal<Page>('Overview');
  readonly navOpen = signal(false);
  readonly permitForm = PERMIT_FORM;
  readonly permitCreateBusy = signal(false);
  readonly permitCreateError = signal('');
  readonly permitCreated = signal(false);
  readonly pendingPermit = signal<{ id: string; revision: number; phase: 'uploaded' | 'updated' } | null>(null);
  readonly permitReading = signal(false);
  readonly permitReadNote = signal('');
  readonly permitPrefill = signal<Record<string, unknown>>({});
  private permitStreets: string[] = [];
  readonly populationRows = signal<PopulationRow[]>([]);
  readonly populationBusy = signal(false);
  readonly populationError = signal('');
  readonly permitRows = signal<PermitSummary[]>([]);
  readonly permitsBusy = signal(false);
  readonly permitsError = signal('');
  readonly sourceRows = signal<DataSource[]>([]);
  readonly sourcesBusy = signal(false);
  readonly sourcesError = signal('');
  readonly permitDots = signal<UiMapMarker[]>([]);
  readonly mapBusy = signal(false);
  readonly mapError = signal('');
  readonly navGroups: UiSideNavGroup[] = [{ label: 'Planning', items: this.pages.map((label) => ({ label, value: label })) }];
  readonly mapCenter = { lat: 4.1950, lng: 73.5250 };
  readonly populationColumns: UiColumn<PopulationRow>[] = [
    { key: 'indicator', header: 'Indicator', sortable: true }, { key: 'category', header: 'Category', sortable: true },
    { key: 'year', header: 'Year', sortable: true, align: 'right' }, { key: 'value', header: 'Value', sortable: true, align: 'right' },
    { key: 'unit', header: 'Unit' }, { key: 'isProjection', header: 'Series type', format: (value) => value ? 'Projection' : 'Observed' },
    { key: 'areaName', header: 'Area', sortable: true }, { key: 'areaType', header: 'Level', sortable: true },
    { key: 'sourceTitle', header: 'Source' }, { key: 'sourceLocator', header: 'Source locator' },
  ];
  readonly permitColumns: UiColumn<PermitSummary>[] = [
    { key: 'permitNumber', header: 'Permit', sortable: true }, { key: 'locationDescription', header: 'Location' },
    { key: 'impactType', header: 'Restriction', sortable: true, format: (value) => this.impactLabel(value) },
    { key: 'approvalState', header: 'Status', sortable: true, format: (value) => this.approvalLabel(value) },
    { key: 'startsAt', header: 'Starts', sortable: true }, { key: 'endsAt', header: 'Ends', sortable: true },
  ];
  readonly sourceColumns: UiColumn<DataSource>[] = [
    { key: 'title', header: 'Source', sortable: true }, { key: 'publisher', header: 'Publisher', sortable: true },
    { key: 'sourceYear', header: 'Year', sortable: true }, { key: 'sourceUri', header: 'Source URL' }, { key: 'license', header: 'License' },
    { key: 'approvalState', header: 'Approval', sortable: true }, { key: 'coverageDescription', header: 'Coverage' },
    { key: 'limitations', header: 'Limitations' }, { key: 'lastCheckedAt', header: 'Last checked', sortable: true },
  ];
  selectPage(value: string): void {
    if (!this.pages.includes(value as Page)) return;
    this.page.set(value as Page);
    this.navOpen.set(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }
  async loadPopulation(): Promise<void> {
    this.populationBusy.set(true); this.populationError.set('');
    try { const r = await firstValueFrom(this.api.population()); this.populationRows.set(r.data?.items ?? []); }
    catch { this.populationRows.set([]); this.populationError.set('Population data could not be loaded. Confirm sign-in and API availability.'); }
    finally { this.populationBusy.set(false); }
  }
  async loadPermits(): Promise<void> {
    this.permitsBusy.set(true); this.permitsError.set('');
    try { const r = await firstValueFrom(this.api.permits()); this.permitRows.set(r.data?.items ?? []); }
    catch { this.permitRows.set([]); this.permitsError.set('Permit data could not be loaded. Confirm a permit or planner role and API availability.'); }
    finally { this.permitsBusy.set(false); }
  }
  async createPermit(event: UiFormSubmission): Promise<void> {
    const data = event.data;
    this.permitCreateBusy.set(true); this.permitCreateError.set(''); this.permitCreated.set(false);
    try {
      let pending = this.pendingPermit();
      if (!pending) throw new Error('Upload the permit first.');
      const localInstant = (dateKey: string, timeKey: string): string => {
        const date = String(data[dateKey] ?? ''), time = String(data[timeKey] ?? '');
        if (!this.isValidLocalDateTime(date, time)) throw new Error('Enter valid permit dates and times.');
        return new Date(`${date}T${time}:00+05:00`).toISOString();
      };
      const dailyTime = (key: string): string | null => {
        const time = String(data[key] ?? '');
        if (!time) return null;
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter valid recurring restriction times.');
        return `${time}:00`;
      };
      if (pending.phase === 'uploaded') {
        const startsAt = localInstant('starts_date', 'starts_time');
        const endsAt = localInstant('ends_date', 'ends_time');
        if (new Date(endsAt) <= new Date(startsAt)) throw new Error('The end time must be after the start time.');
        const update: UpdatePermitRequest = {
          permitNumber: String(data['permit_number'] ?? '').trim(),
          locationDescription: String(data['location_description'] ?? '').trim(),
          workDescription: String(data['work_description'] ?? '').trim(),
          contractor: String(data['contractor'] ?? '').trim() || null,
          impactType: Number(data['impact_type']),
          startsAt,
          endsAt,
          dailyStart: dailyTime('daily_start'),
          dailyEnd: dailyTime('daily_end'),
          revision: pending.revision,
          streetNames: this.permitStreets,
        };
        const updated = await firstValueFrom(this.api.updatePermit(pending.id, update));
        if (!updated.success || !updated.data) throw new Error('Permit details were not saved.');
        pending = { id: pending.id, revision: updated.data.revision, phase: 'updated' };
        this.pendingPermit.set(pending);
      }
      const submitted = await firstValueFrom(this.api.submitPermit(pending.id));
      if (!submitted.success) throw new Error('Permit was saved but could not be submitted.');
      this.pendingPermit.set(null); this.permitPrefill.set({}); this.permitReadNote.set(''); this.permitStreets = [];
      this.permitCreated.set(true);
      await Promise.all([this.loadPermits(), this.loadMap()]);
    } catch (error) {
      this.permitCreateError.set(this.apiMessage(error) ?? (error instanceof Error && error.message ? error.message : 'The permit could not be submitted. Check the dates and try again.'));
    } finally {
      this.permitCreateBusy.set(false);
    }
  }
  /** Upload the permit (malware-scanned), then read its details to prefill the form. */
  async readPermit(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;
    this.permitCreateError.set(''); this.permitCreated.set(false); this.permitReading.set(true);
    try {
      const uploaded = await firstValueFrom(this.api.uploadPermit(file));
      if (!uploaded.success || !uploaded.data?.id) throw new Error('The upload was not accepted.');
      this.pendingPermit.set({ id: uploaded.data.id, revision: uploaded.data.revision, phase: 'uploaded' });
      try {
        const read = await firstValueFrom(this.api.extractPermit(uploaded.data.id));
        const x = read.data;
        this.permitStreets = x?.streetNames ?? [];
        const impact = ({ FullClosure: '0', PartialRestriction: '1', LaneRestriction: '2' } as Record<string, string>)[x?.impactType ?? ''];
        const entries: [string, unknown][] = [
          ['permit_number', x?.permitNumber], ['location_description', x?.locationDescription], ['work_description', x?.workDescription],
          ['contractor', x?.contractor], ['impact_type', impact], ['starts_date', x?.startDate], ['starts_time', x?.startTime],
          ['ends_date', x?.endDate], ['ends_time', x?.endTime], ['daily_start', x?.dailyStart], ['daily_end', x?.dailyEnd],
        ];
        this.permitPrefill.set(Object.fromEntries(entries.filter(([, v]) => v !== null && v !== undefined && v !== '')));
        this.permitReadNote.set('Filled in from the permit. Check each field before submitting.');
      } catch (error) {
        this.permitPrefill.set({});
        this.permitReadNote.set(`${this.apiMessage(error) ?? 'The permit could not be read automatically.'} Fill in the details below.`);
      }
    } catch (error) {
      this.permitCreateError.set(this.apiMessage(error) ?? 'The permit could not be uploaded. Try again.');
    } finally {
      this.permitReading.set(false);
    }
  }
  startOver(): void {
    this.pendingPermit.set(null); this.permitPrefill.set({}); this.permitReadNote.set(''); this.permitStreets = []; this.permitCreateError.set('');
  }
  private apiMessage(error: unknown): string | undefined {
    return error instanceof HttpErrorResponse && typeof error.error?.message === 'string' ? error.error.message : undefined;
  }
  async loadSources(): Promise<void> {
    this.sourcesBusy.set(true); this.sourcesError.set('');
    try { const r = await firstValueFrom(this.api.dataSources()); this.sourceRows.set(r.data ?? []); }
    catch { this.sourceRows.set([]); this.sourcesError.set('Source metadata could not be loaded. Confirm sign-in and API availability.'); }
    finally { this.sourcesBusy.set(false); }
  }
  async loadMap(): Promise<void> {
    this.mapBusy.set(true); this.mapError.set('');
    const bounds = { west: 73.2, south: 4.0, east: 73.8, north: 4.5 };
    try {
      const [roads, works] = await Promise.all([firstValueFrom(this.api.roads(bounds)), firstValueFrom(this.api.roadworks(bounds))]);
      // Permits only, as dots: drawing every road segment made the map unreadable.
      const markers = permitMarkers(works.data?.features ?? []);
      this.permitDots.set(markers);
      this.roadCount.set(roads.data?.features.length ?? 0); this.roadsTruncated.set(roads.data?.truncated ?? false);
      this.workCount.set(markers.length);
    } catch {
      this.permitDots.set([]);
      this.mapError.set('Map layers are unavailable. Confirm sign-in, approved source data and API availability.');
    } finally {
      this.mapBusy.set(false);
    }
  }
  sectionLabel(page: Page): string { return ({ Population: 'PEOPLE & PROJECTIONS', Permits: 'ROADWORKS & APPROVALS', 'Route scenarios': 'TIME-DEPENDENT PLANNING', 'Data & methodology': 'PROVENANCE & METHODS' } as Partial<Record<Page, string>>)[page] ?? 'PLANNING'; }
  private impactLabel(value: unknown): string {
    return ({ 0: 'Full closure', 1: 'Partial restriction', 2: 'Lane restriction', 3: 'Unknown' } as Record<number, string>)[Number(value)] ?? 'Unknown';
  }
  private approvalLabel(value: unknown): string {
    return ({ 0: 'Draft', 1: 'Needs review', 2: 'Submitted', 3: 'Approved', 4: 'Rejected' } as Record<number, string>)[Number(value)] ?? 'Unknown';
  }
  private isValidLocalDateTime(date: string, time: string): boolean {
    return this.isValidCalendarDate(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  }
  private isValidCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  descriptionFor(page: Page): string { return ({ Population: 'Compare official population baselines with published projections at the geographic levels supported by their source.', Permits: 'Review source documents, verify extracted details and road segments, and manage approvals with a complete audit trail.', 'Route scenarios': 'Compare estimated routes for a selected departure time and approved roadwork scenario. Estimates are not live traffic.', 'Data & methodology': 'Inspect source provenance, validation status, model assumptions and version history.' } as Partial<Record<Page, string>>)[page] ?? ''; }
}
