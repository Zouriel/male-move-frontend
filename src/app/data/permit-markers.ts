import type { UiMapMarker } from '@zouriel/ui/map';
import type { RoadworkFeature } from './male-move-api.service';

/** One dot per permit, at the middle of the roads it affects (the API lists roadworks per road segment). */
export function permitMarkers(features: readonly RoadworkFeature[]): UiMapMarker[] {
  const byPermit = new Map<string, RoadworkFeature[]>();
  for (const feature of features) byPermit.set(feature.permitId, [...(byPermit.get(feature.permitId) ?? []), feature]);
  return [...byPermit.values()].map((group) => {
    const points = group.flatMap((feature) => feature.coordinates);
    const lat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
    return { id: `permit-${group[0].permitId}`, lat, lng, tone: 'warning', ariaLabel: `Roadwork ${group[0].permitNumber}: ${group[0].locationDescription}` };
  });
}
