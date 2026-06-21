# LocalFinder Backend

Backend pseudo-fake para practicar networking desde la app Android/KMP LocalFinder.

## Stack

- Node.js 18+
- Express
- CORS habilitado
- Compatible con Vercel Serverless Functions
- Persistencia opcional con Upstash Redis

## Instalar

```bash
pnpm install
```

## Correr local

```bash
pnpm dev
```

El servicio queda disponible en:

```text
http://localhost:3000
```

## Deploy en Vercel

Desde esta carpeta:

```bash
pnpm add -g vercel
vercel login
vercel
vercel --prod
```

Tambien puedes importar esta carpeta como proyecto desde el dashboard de Vercel. La entrada serverless es `api/index.js` y `vercel.json` reescribe todas las rutas hacia esa funcion.

Si prefieres npm, tambien puedes usar `npm install` y `npm run dev`.

## Persistencia de contactos

El backend guarda `contact-requests` en dos modos:

- `memory`: modo local sin configurar nada. Los contactos se pierden cuando se reinicia el proceso.
- `upstash-redis`: modo persistente en Vercel cuando existen `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

Para configurar persistencia en Vercel:

1. Entra al dashboard de Vercel.
2. Abre tu proyecto `localfinder-backend`.
3. Ve a `Storage` o `Integrations`.
4. Agrega `Upstash Redis`.
5. Crea una base Redis o conecta una existente.
6. Conecta esa base al proyecto para que Vercel agregue las variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
7. Haz redeploy del proyecto.

Despues del deploy, verifica:

```bash
curl "https://TU_URL_DE_VERCEL/debug/storage"
```

Debe responder algo como:

```json
{
  "mode": "upstash-redis",
  "contactRequestsCount": 1,
  "isPersistent": true
}
```

## Endpoints

### GET `/properties`

Lista propiedades con filtros, ordenamiento y paginacion.

Query params opcionales:

- `city=Curitiba`
- `minPrice=1000`
- `maxPrice=2500`
- `type=APARTMENT`
- `bedrooms=1`
- `allowsPets=true`
- `furnished=true`
- `sort=price_asc`, `price_desc`, `newest`, `distance_asc`
- `page=1`
- `limit=20`
- `forceError=500`
- `latencyMs=300` o `latency=random`

Ejemplo:

```bash
curl "http://localhost:3000/properties?city=Curitiba&type=APARTMENT&sort=price_asc&page=1&limit=5"
```

### GET `/properties/:id`

Devuelve el detalle completo de una propiedad.

```bash
curl "http://localhost:3000/properties/prop_001"
```

### GET `/properties/recommended`

Devuelve propiedades recomendadas para Home.

```bash
curl "http://localhost:3000/properties/recommended?city=Curitiba"
```

### POST `/contact-requests`

Crea una solicitud de contacto. En Vercel con Upstash Redis configurado, el contacto queda persistido.

```bash
curl -X POST "http://localhost:3000/contact-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop_001",
    "userName": "Josias",
    "email": "josias@example.com",
    "phone": "+55 41 99999-9999",
    "message": "Ola, tenho interesse neste apartamento."
  }'
```

### GET `/contact-requests`

Lista solicitudes enviadas.

```bash
curl "http://localhost:3000/contact-requests"
```

### GET `/config`

Devuelve feature flags ficticias.

```bash
curl "http://localhost:3000/config"
```

### GET `/health`

Verifica estado basico del servicio.

```bash
curl "http://localhost:3000/health"
```

### GET `/debug/storage`

Muestra si `contact-requests` esta usando memoria local o Upstash Redis.

```bash
curl "http://localhost:3000/debug/storage"
```

## Errores

Todos los errores usan este formato:

```json
{
  "code": "INVALID_EMAIL",
  "message": "Email invalido."
}
```

Casos implementados:

- `400 INVALID_EMAIL`
- `400 VALIDATION_ERROR`
- `404 PROPERTY_NOT_FOUND`
- `409 PROPERTY_NOT_AVAILABLE`
- `500 SERVER_ERROR`

Para simular error interno:

```bash
curl "http://localhost:3000/properties?forceError=500"
```
