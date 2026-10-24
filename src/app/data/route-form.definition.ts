import type { UiFormDefinition } from '@zouriel/ui/form-builder';

export const ROUTE_FORM: UiFormDefinition = {
  schemaVersion: 1,
  id: 'male-move-route-request',
  title: 'Route scenario inputs',
  description: 'Choose two points in the supported Greater Malé area (latitude 4.0–4.5, longitude 73.2–73.8) and a departure time. The result is a modeled estimate, not live traffic.',
  revision: 1,
  settings: { labelPlacement: 'top', validateOn: 'blur', errorSummary: true, showProgress: false, submitLabel: 'Calculate route' },
  pages: [{
    id: 'trip-details',
    title: 'Trip details',
    elements: [
      { kind: 'field', id: 'origin-latitude', type: 'number', key: 'origin_latitude', label: 'Origin latitude', required: true, props: { step: 0.0001 }, validators: [{ id: 'origin-lat-min', type: 'min', params: { min: 4.0 } }, { id: 'origin-lat-max', type: 'max', params: { max: 4.5 } }], layout: { width: 'half' } },
      { kind: 'field', id: 'origin-longitude', type: 'number', key: 'origin_longitude', label: 'Origin longitude', required: true, props: { step: 0.0001 }, validators: [{ id: 'origin-lng-min', type: 'min', params: { min: 73.2 } }, { id: 'origin-lng-max', type: 'max', params: { max: 73.8 } }], layout: { width: 'half' } },
      { kind: 'field', id: 'destination-latitude', type: 'number', key: 'destination_latitude', label: 'Destination latitude', required: true, props: { step: 0.0001 }, validators: [{ id: 'destination-lat-min', type: 'min', params: { min: 4.0 } }, { id: 'destination-lat-max', type: 'max', params: { max: 4.5 } }], layout: { width: 'half' } },
      { kind: 'field', id: 'destination-longitude', type: 'number', key: 'destination_longitude', label: 'Destination longitude', required: true, props: { step: 0.0001 }, validators: [{ id: 'destination-lng-min', type: 'min', params: { min: 73.2 } }, { id: 'destination-lng-max', type: 'max', params: { max: 73.8 } }], layout: { width: 'half' } },
      { kind: 'field', id: 'departure-date', type: 'date', key: 'departure_date', label: 'Departure date', required: true, layout: { width: 'half' } },
      { kind: 'field', id: 'departure-time', type: 'time', key: 'departure_time', label: 'Departure time (Maldives time)', required: true, layout: { width: 'half' } },
    ],
  }],
};
