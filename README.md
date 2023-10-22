# Kaleidoshare

Let's create and share kaleidoscopes on the web.

## Develop

### prerequisites

- Node >= v20
- Deno >= v1.32 (for KV)

### Install deps

```
npm ci
npx playwright install --with-deps
npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8 @rjsf/antd
```

### Make schema

```
npm run build:schema
```

### Develop

```
npm run dev
```

### Build

```
npm run build
```

### Test

```
npm test
```
