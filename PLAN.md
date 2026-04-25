# PLAN.md — Revisión de integración Mercado Pago Checkout Pro

Este documento lista los archivos y puntos que hay que revisar para diagnosticar por qué la integración de Mercado Pago Checkout Pro no conecta correctamente.

## Objetivo

Verificar el flujo completo de pago:

1. El usuario entra a una actividad.
2. Presiona el botón de inscripción/pago.
3. La app crea una preferencia de Mercado Pago.
4. Mercado Pago redirige al usuario al Checkout Pro correcto.
5. Mercado Pago vuelve a la app mediante `back_urls`.
6. La app registra el pago aprobado.
7. Mercado Pago envía notificaciones al webhook.
8. El webhook confirma y registra el pago en la base de datos.

---

## Archivos principales a revisar

### 1. Configuración de Mercado Pago

Archivo:

```txt
src/lib/mercadopago.ts
```

Qué revisar:

- Si `MP_ENVIRONMENT` está correctamente definido como `testing` o `production`.
- Si en testing se usan:

```env
MP_PUBLIC_KEY
MP_ACCESS_TOKEN
```

- Si en producción se usan:

```env
MERCADOPAGO_PUBLIC_KEY
MERCADOPAGO_ACCESS_TOKEN
```

- Si `MP_AUTO_RETURN`, `MP_BINARY_MODE`, `MP_MAX_INSTALLMENTS`, `MP_PREFERENCE_EXPIRES_MINUTES`, `MP_EXCLUDED_PAYMENT_METHODS` y `MP_EXCLUDED_PAYMENT_TYPES` están bien parseados.

---

### 2. Variables de entorno

Archivo:

```txt
.env.example
```

Variables críticas:

```env
NEXTAUTH_URL=https://hualas.vercel.app
MP_ENVIRONMENT=testing
MP_PUBLIC_KEY=TEST-...
MP_ACCESS_TOKEN=TEST-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
```

## Posible error detectado

Actualmente se informó esta variable:

```env
NEXTAUTH_URL=hualas.vercel.app
```

Esto probablemente está mal porque `NEXTAUTH_URL` debería incluir protocolo completo:

```env
NEXTAUTH_URL=https://hualas.vercel.app
```

Motivo:

El proyecto usa `NEXTAUTH_URL` para armar URLs de retorno y webhook en Mercado Pago. Si falta `https://`, las URLs generadas pueden quedar inválidas o Mercado Pago puede rechazarlas.

Revisar en Vercel:

```txt
Project Settings → Environment Variables → NEXTAUTH_URL
```

Debe quedar así:

```env
NEXTAUTH_URL=https://hualas.vercel.app
```

Luego redeployar el proyecto.

---

### 3. Creación de preferencia Checkout Pro

Archivo:

```txt
src/app/api/activities/[id]/checkout/route.ts
```

Qué revisar:

- Que el usuario tenga sesión activa.
- Que la actividad exista.
- Que `activity.price` sea mayor a 0.
- Que el `accessToken` exista.
- Que `currency_id` sea `ARS`.
- Que `back_urls` use URLs públicas HTTPS.
- Que `notification_url` use una URL pública HTTPS.
- Que `external_reference` se genere correctamente.
- Que la respuesta de Mercado Pago tenga `init_point` o `sandbox_init_point`.

## Posible error detectado

El código actual prioriza:

```ts
const redirectUrl = result.init_point ?? result.sandbox_init_point;
```

Para ambiente `testing`, conviene priorizar `sandbox_init_point`:

```ts
const redirectUrl =
  environment === 'testing'
    ? result.sandbox_init_point ?? result.init_point
    : result.init_point ?? result.sandbox_init_point;
```

Motivo:

En pruebas, Mercado Pago suele devolver `sandbox_init_point` para Checkout Pro sandbox. Si se usa `init_point` primero, puede redirigir al entorno incorrecto o generar confusión con cuentas reales/de prueba.

---

### 4. Botón de inscripción/pago

Archivo:

```txt
src/app/activities/[id]/register-button.tsx
```

Qué revisar:

- Que si no hay sesión mande a `/login`.
- Que si hay sesión redirija a:

```txt
/api/activities/[activityId]/checkout
```

- Que si se elige un hijo agregue:

```txt
?childId=...
```

- Que `childId` llegue correctamente al backend.

---

### 5. Handler de retorno desde Mercado Pago

Archivo:

```txt
src/app/activities/[id]/payment-handler.tsx
```

Qué revisar:

- Que Mercado Pago vuelva con query params como:

```txt
status=approved
payment_id=...
```

- Que cuando `status === 'approved'` y existe `payment_id`, se llame a:

```txt
/api/activities/[id]/payment
```

- Que el usuario siga logueado cuando vuelve desde Mercado Pago.

Posible punto débil:

Si la sesión se pierde al volver desde Mercado Pago, el endpoint `/payment` puede responder `Unauthorized`. El webhook debería cubrir este caso, pero conviene revisar logs.

---

### 6. Registro manual del pago aprobado

Archivo:

```txt
src/app/api/activities/[id]/payment/route.ts
```

Qué revisar:

- Que recibe `paymentId`.
- Que consulta el pago con `new Payment(client).get({ id: paymentId })`.
- Que valida `payment.status === 'approved'`.
- Que crea o actualiza `ActivityParticipant`.
- Que no falle por `childId` null.
- Que el usuario de sesión sea el mismo que inició el pago.

---

### 7. Webhook de Mercado Pago

Archivo:

```txt
src/app/api/mercadopago/notifications/route.ts
```

Qué revisar:

- Que Mercado Pago pueda llamar públicamente a:

```txt
https://hualas.vercel.app/api/mercadopago/notifications
```

- Que la app reciba `topic/type = payment`.
- Que reciba `data.id` o `id`.
- Que guarde la notificación en `MercadoPagoNotification`.
- Que consulte el pago por ID.
- Que `payment.external_reference` tenga este formato:

```txt
activityId:userId:childId
```

- Que el `upsert` de `ActivityParticipant` funcione correctamente.

Posible punto débil:

El webhook actualmente no valida firma/autenticidad de Mercado Pago. Para producción conviene agregar validación de firma si Mercado Pago la ofrece en los headers configurados para webhooks.

---

### 8. Base de datos Prisma

Archivo:

```txt
prisma/schema.prisma
```

Modelos relevantes:

```prisma
model Activity
model ActivityParticipant
model MercadoPagoNotification
```

Qué revisar:

- Que exista la tabla `MercadoPagoNotification` en producción.
- Que existan las migraciones aplicadas en la base de Vercel/producción.
- Que `ActivityParticipant` tenga el índice único:

```prisma
@@unique([activityId, userId, childId])
```

- Que `childId` nullable no genere problemas con `upsert`.

---

## Checklist rápido de diagnóstico

### Vercel / Environment Variables

- [ ] `NEXTAUTH_URL=https://hualas.vercel.app`
- [ ] `NEXTAUTH_SECRET` configurado.
- [ ] `DATABASE_URL` configurado.
- [ ] `MP_ENVIRONMENT=testing` para pruebas.
- [ ] `MP_PUBLIC_KEY` empieza con `TEST-`.
- [ ] `MP_ACCESS_TOKEN` empieza con `TEST-`.
- [ ] Si se usa producción: `MP_ENVIRONMENT=production`.
- [ ] En producción, `MERCADOPAGO_PUBLIC_KEY` y `MERCADOPAGO_ACCESS_TOKEN` son credenciales reales del vendedor.
- [ ] Redeploy después de cambiar variables.

### Mercado Pago

- [ ] La cuenta vendedora y compradora son distintas.
- [ ] En testing se usan usuarios de prueba compatibles.
- [ ] El monto supera mínimos permitidos.
- [ ] La moneda es `ARS`.
- [ ] La cuenta corresponde a Argentina.
- [ ] El webhook apunta a URL pública HTTPS.

### Código

- [ ] `checkout/route.ts` crea la preference sin error.
- [ ] En testing se usa `sandbox_init_point` primero.
- [ ] `back_urls` están bien formadas.
- [ ] `notification_url` está bien formada.
- [ ] `external_reference` contiene `activityId:userId:childId`.
- [ ] `payment-handler.tsx` recibe `payment_id`.
- [ ] `/payment/route.ts` registra el pago aprobado.
- [ ] `/notifications/route.ts` registra pagos aunque el usuario no vuelva a la web.

---

## Cambio recomendado inicial

### 1. Corregir `NEXTAUTH_URL`

Cambiar en Vercel:

```env
NEXTAUTH_URL=https://hualas.vercel.app
```

No usar:

```env
NEXTAUTH_URL=hualas.vercel.app
```

### 2. Cambiar prioridad de redirect URL en testing

En:

```txt
src/app/api/activities/[id]/checkout/route.ts
```

Cambiar:

```ts
const redirectUrl = result.init_point ?? result.sandbox_init_point;
```

Por:

```ts
const redirectUrl =
  environment === 'testing'
    ? result.sandbox_init_point ?? result.init_point
    : result.init_point ?? result.sandbox_init_point;
```

### 3. Agregar logs temporales

Agregar logs temporales en `checkout/route.ts`:

```ts
console.log('[checkout] environment:', environment);
console.log('[checkout] appUrl:', appUrl);
console.log('[checkout] notification_url:', `${appUrl}/api/mercadopago/notifications`);
console.log('[checkout] init_point:', result.init_point);
console.log('[checkout] sandbox_init_point:', result.sandbox_init_point);
```

No loguear access tokens.

---

## Información útil para enviar al soporte de Mercado Pago

```txt
Proyecto: Hualas
Framework: Next.js 14
SDK: mercadopago ^2.0.0
Checkout: Checkout Pro
Endpoint que crea preference:
src/app/api/activities/[id]/checkout/route.ts

Webhook:
src/app/api/mercadopago/notifications/route.ts

URL pública:
https://hualas.vercel.app

Webhook esperado:
https://hualas.vercel.app/api/mercadopago/notifications

Posibles puntos a validar:
- NEXTAUTH_URL debe ser https://hualas.vercel.app
- En testing debería usarse sandbox_init_point
- Confirmar que las credenciales correspondan al país Argentina
- Confirmar que vendedor/comprador sean cuentas separadas
```
