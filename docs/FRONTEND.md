# Frontend Guide

The web client is a Vue 3 + TypeScript + Vite SPA using Element Plus, Pinia,
vue-router and vue-i18n. This pass installs the **application shell**, theming,
internationalisation and a typed API client; feature pages ship separately.

## Layout

```
src/
  api/            axios instance, typed client, tenant + token stores
  components/     shared presentational components
  i18n/           locale JSON files and locale helpers
  layouts/        AppShell (sidebar, header, language/theme switchers)
  router/         route table
  stores/         Pinia stores (auth, settings)
  styles/         design tokens for every theme
  views/          route views
```

## Themes

Four explicit themes plus a system-following option:

| Preference | Resolved theme | Notes |
|------------|----------------|-------|
| `light` | light | Default light palette |
| `dark` | dark | Deep slate, Element Plus dark baseline |
| `midnight` | midnight | Near-black with violet accent |
| `high-contrast` | high-contrast | Black/white/yellow, strong focus rings |
| `system` | light or dark | Follows `prefers-color-scheme` live |

The `settings` store writes `data-theme` on `<html>` and toggles the `dark`
class so Element Plus dark CSS variables apply to every dark-based theme. All
component styling uses the tokens in `src/styles/themes.scss`:

```css
var(--pms-color-surface)
var(--pms-color-text-muted)
var(--pms-color-primary)
var(--pms-shadow-md)
var(--pms-focus-ring)
```

Reduced-motion preferences are respected globally.

### Adding a theme

1. Add the key to `THEMES` in `src/stores/settings.ts`.
2. Add `:root[data-theme='<key>']` tokens in `src/styles/themes.scss`.
3. Add a label to every locale (`theme.<key>`) and the theme menu label map in
   `src/layouts/AppShell.vue`.

## Internationalisation

Supported locales: `en`, `fr`, `es`, `de`, `hi`, `zh`, `ar`.

- Locale files: `src/i18n/locales/<code>.json`
- Initial locale: stored preference → browser languages → English
- The active locale updates `<html lang>` and `<html dir>`; Arabic is RTL
- Element Plus UI strings switch through `<el-config-provider :locale>`
- Language names are always displayed in their own language

Adding a locale:

1. Copy `en.json` and translate the values (keep every key).
2. Register the import and code in `src/i18n/index.ts` (`SUPPORTED_LOCALES`,
   `LOCALE_LABELS`, `messages`).
3. Add the Element Plus locale import in `src/App.vue`.
4. Run `npm test`; the locale parity test fails if keys are missing or extra.

The API accepts `Accept-Language` and returns translated error codes such as
`common.forbidden`; render them with `t(error.translationKey)`.

## Typed API client

`src/api/client.ts` wraps axios and unwraps the `{ success, data, meta, message }`
envelope:

```ts
import api from '@/api/client';

const users = await api.list<User>('/users', { page: 1, limit: 25 });
users.items; // User[]
users.total; // from X-Total-Count

const user = await api.get<User>('/users/7');
await api.post('/users', payload);
await api.delete('/users/7'); // 204 → undefined
```

Failures are normalised to `ApiError` with `status`, `code`, `details`,
`requestId` and a `translationKey` getter. The shared axios instance:

- attaches `Authorization: Bearer <token>`
- attaches `x-tenant-id` from `src/api/tenant.ts`
- sends `Accept-Language`
- clears tokens and emits `pms:unauthorized` on 401

## Shell & accessibility

`src/layouts/AppShell.vue` provides the sidebar, responsive off-canvas
navigation, page title, language and theme switchers, search placeholder,
notifications entry point and footer. It uses logical CSS properties so the
layout mirrors automatically in RTL, keeps a visible focus ring, and disables
navigation to modules that are not yet shipped.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```
