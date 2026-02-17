export const BUG_FIELDS = {
  title: 'title',
  detail: 'detail',
  contact: 'contact',
  includeApp: 'includeApp',
  includeDevice: 'includeDevice',
  includeLog: 'includeLog',
} as const;

export const INQUIRY_FIELDS = {
  title: 'title',
  detail: 'detail',
  contact: 'contact',
} as const;

export const BUG_TEXT_FIELD_NAMES = [BUG_FIELDS.title, BUG_FIELDS.detail, BUG_FIELDS.contact] as const;
export const BUG_BOOLEAN_FIELD_NAMES = [
  BUG_FIELDS.includeApp,
  BUG_FIELDS.includeDevice,
  BUG_FIELDS.includeLog,
] as const;
export const INQUIRY_FIELD_NAMES = [INQUIRY_FIELDS.title, INQUIRY_FIELDS.detail, INQUIRY_FIELDS.contact] as const;
