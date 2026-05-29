# Public JavaScript

JavaScript modules for public-facing views.

## Status

This directory is reserved for future public view logic. Currently, public page functionality is handled by:

- `main.ts` - Global components (logo cloud, sidebar, floating header)
- `js/auth/` - Authentication page logic

## Planned Files

| File        | Description                   |
| ----------- | ----------------------------- |
| `public.ts` | Homepage interactions         |
| `maps.ts`   | Interactive map functionality |

## Exports (Planned)

```javascript
// public.ts
export function initPublic() {}

// maps.ts
export function initMaps() {}
```

## Usage (Future)

```html
<!-- Homepage -->
<script type="module" src="../../../js/views/public/public.ts"></script>

<!-- Maps -->
<script type="module" src="../../../js/views/public/maps.ts"></script>
```
