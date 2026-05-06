// eslint-disable-next-line import/no-unassigned-import
import 'react-i18next';
import type { defaultNS, LocaleResourceSchema } from './resources';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: LocaleResourceSchema;
  }
}
