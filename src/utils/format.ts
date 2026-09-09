import dayjs from 'dayjs';
import relativeTimePlugin from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTimePlugin);

export const formatShortDate = (value: string | Date | null | undefined, locale = 'en'): string =>
  value ? dayjs(value).locale(locale).format('YYYY-MM-DD') : '—';

export const formatDateTime = (value: string | Date | null | undefined, locale = 'en'): string =>
  value ? dayjs(value).locale(locale).format('YYYY-MM-DD HH:mm') : '—';

export const relativeTime = (value: string | Date | null | undefined): string =>
  value ? dayjs(value).fromNow() : '—';