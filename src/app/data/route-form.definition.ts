import type { UiFormDefinition } from '@zouriel/ui/form-builder';

export const ROUTE_FORM: UiFormDefinition = {
  schemaVersion: 1,
  id: 'male-move-route-request',
  title: 'Route scenario inputs',
  description: 'Choose two points and a departure time. The result is a modeled estimate, not live traffic.',
  revision: 1,
  settings: { labelPlacement: 'top', validateOn: 'blur', errorSummary: true, showProgress: false, submitLabel: 'Calculate route' },
  pages: [{
    id: 'trip-details',
    title: 'Trip details',
    elements: [
      { kind: 'field', id: 'origin-latitude', type: 'number', key: 'origin_latitude', label: 'Origin latitude', required: true, props: { min: -90, max: 90, step: 0.0001 }, layout: { width: 'half' } },
      { kind: 'field', id: 'origin-longitude', type: 'number', key: 'origin_longitude', label: 'Origin longitude', required: true, props: { min: -180, max: 180, step: 0.0001 }, layout: { width: 'half' } },
      { kind: 'field', id: 'destination-latitude', type: 'number', key: 'destination_latitude', label: 'Destination latitude', required: true, props: { min: -90, max: 90, step: 0.0001 }, layout: { width: 'half' } },
      { kind: 'field', id: 'destination-longitude', type: 'number', key: 'destination_longitude', label: 'Destination longitude', required: true, props: { min: -180, max: 180, step: 0.0001 }, layout: { width: 'half' } },
      { kind: 'field', id: 'departure-date', type: 'date', key: 'departure_date', label: 'Departure date', required: true, layout: { width: 'half' } },
      { kind: 'field', id: 'departure-time', type: 'time', key: 'departure_time', label: 'Departure time (Maldives time)', required: true, layout: { width: 'half' } },
    ],
  }],
};
