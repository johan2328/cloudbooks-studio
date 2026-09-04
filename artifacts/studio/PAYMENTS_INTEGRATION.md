# Pagos — guía para pasar del prototipo a producción

El checkout (`src/pages/checkout.tsx`) ya está estructurado para Stripe y PayPal.
Hoy es **front-end** (no cobra). Para activarlo de verdad:

## 1. Backend (api-server)
- **Stripe**
  - `POST /payments/stripe/create-intent` → crea un `PaymentIntent` con el monto del carrito (calculado **en el servidor**, nunca confiar en el precio del cliente). Devuelve `clientSecret`.
  - Webhook `POST /payments/stripe/webhook` → al evento `payment_intent.succeeded`: crear la **orden**, dar acceso a los libros y enviar el email.
- **PayPal**
  - `POST /payments/paypal/create-order` y `POST /payments/paypal/capture/:id`.
  - Verificar la captura en el servidor antes de dar acceso.
- Entrega: la orden enlaza usuario ↔ productos comprados (reemplaza el `localStorage` de `lib/library`).

## 2. Front-end
- **Tarjeta**: montar **Stripe Elements** (`@stripe/stripe-js` + `@stripe/react-stripe-js`) en el bloque marcado `// TODO_REAL` (método `card`). Elements renderiza el campo de tarjeta y los íconos de marca de forma compatible con PCI.
- **PayPal**: cargar el **PayPal JS SDK** y renderizar `<PayPalButtons />` en el bloque `// TODO_REAL` (método `paypal`). El SDK dibuja el botón oficial.
- Reemplazar el `pay()` simulado por la confirmación real (Stripe `confirmPayment` / PayPal `onApprove`).

## 3. Claves / entorno
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (backend) · `VITE_STRIPE_PUBLISHABLE_KEY` (front).
- `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` (backend) · `VITE_PAYPAL_CLIENT_ID` (front).
- Nunca exponer las *secret keys* en el front.

## 4. Confianza (ya en el UI)
- Sellos: SSL cifrado, no almacenamos tarjeta, garantía/reembolso, acceso inmediato.
- Marcas de tarjeta: archivos oficiales en `public/badges/` (ver su README).
- "Procesado por Stripe / PayPal" — los logos los aporta cada SDK.

## 5. PCI / legal
- Con Stripe Elements + PayPal SDK, los datos de tarjeta **no tocan tu servidor** (SAQ-A, el alcance PCI más bajo).
- Revisar términos, política de reembolsos y privacidad antes de cobrar de verdad.
