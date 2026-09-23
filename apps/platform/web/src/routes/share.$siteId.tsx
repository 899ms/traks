import { createFileRoute } from '@tanstack/react-router';
import { validateSiteSearch } from './portal.site.$siteId';

/** Public dashboard: /share/<site id>, no sign-in (see share.$siteId.lazy). */
export const Route = createFileRoute('/share/$siteId')({
  validateSearch: validateSiteSearch,
});
