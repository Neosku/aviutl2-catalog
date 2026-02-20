export const APP_ROUTE_PATHS = {
  home: '/',
  updates: '/updates',
  settings: '/settings',
  register: '/register',
  feedback: '/feedback',
  niconiCommons: '/niconi-commons',
  packageDetail: '/package/:id',
} as const;

export const PACKAGE_DETAIL_PATH_PREFIX = APP_ROUTE_PATHS.packageDetail.replace(':id', '');
