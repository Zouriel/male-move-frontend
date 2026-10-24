import type { UiFormDefinition } from '@zouriel/ui/form-builder';

export const PERMIT_FORM: UiFormDefinition = {
  schemaVersion: 1,
  id: 'male-move-permit-intake',
  title: 'Register roadwork permit',
  description: 'Upload the source document, enter the permit details, then submit for an authorized review.',
  revision: 1,
  settings: { labelPlacement: 'top', validateOn: 'blur', errorSummary: true, showProgress: false, submitLabel: 'Upload and submit for review' },
  pages: [{
    id: 'permit-details',
    title: 'Permit details',
    elements: [
      { kind: 'field', id: 'permit-document', type: 'file', key: 'permit_document', label: 'Source permit document (PDF, JPEG or PNG; maximum 25 MiB)', required: true, props: { accept: '.pdf,.jpg,.jpeg,.png' } },
      { kind: 'field', id: 'permit-number', type: 'text', key: 'permit_number', label: 'Permit number', required: true },
      { kind: 'field', id: 'location-description', type: 'textarea', key: 'location_description', label: 'Work location', required: true },
      { kind: 'field', id: 'work-description', type: 'textarea', key: 'work_description', label: 'Work description', required: true },
      { kind: 'field', id: 'contractor', type: 'text', key: 'contractor', label: 'Contractor (if stated)' },
      {
        kind: 'field', id: 'impact-type', type: 'select', key: 'impact_type', label: 'Restriction type', required: true,
        options: [
          { id: 'impact-closure', value: '0', label: 'Full closure' },
          { id: 'impact-partial', value: '1', label: 'Partial restriction' },
          { id: 'impact-lane', value: '2', label: 'Lane restriction' },
        ],
      },
      { kind: 'field', id: 'starts-date', type: 'date', key: 'starts_date', label: 'Start date', required: true, layout: { width: 'half' } },
      { kind: 'field', id: 'starts-time', type: 'time', key: 'starts_time', label: 'Start time (Maldives time)', required: true, layout: { width: 'half' } },
      { kind: 'field', id: 'ends-date', type: 'date', key: 'ends_date', label: 'End date', required: true, layout: { width: 'half' } },
      { kind: 'field', id: 'ends-time', type: 'time', key: 'ends_time', label: 'End time (Maldives time)', required: true, layout: { width: 'half' } },
      { kind: 'field', id: 'daily-start', type: 'time', key: 'daily_start', label: 'Recurring daily restriction starts (optional)', layout: { width: 'half' } },
      { kind: 'field', id: 'daily-end', type: 'time', key: 'daily_end', label: 'Recurring daily restriction ends (optional)', layout: { width: 'half' } },
    ],
  }],
};
