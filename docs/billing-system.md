# Billing System (Family cart)

## Modelo de datos

Se usan: `FamilyGroup`, `FamilyGroupMember`, `BillableConcept`, `Order`, `OrderItem`, `Payment`, `SocialFeePayment`.

## Flujo familiar

1. Se vinculan socios a un `FamilyGroup`.
2. La cuota social individual se registra en `SocialFeePayment`.
3. Se crea `Order` mensual y se agregan `OrderItem` (cuota social, actividades, descuentos, etc.).
4. Se crea `Payment` para la orden.
5. Al aprobar pago: `Payment`, `Order` y `OrderItem` quedan en estado pagado.

## Cuota social mensual

La consulta de deudas usa `Order` y `OrderItem` para la vista consolidada, y `SocialFeePayment` para el seguimiento individual por socio/mes.

## Aprobación de pago

`paymentService.approvePayment` usa transacción para marcar `Payment`, `Order` y `OrderItem`.

## Consulta de deudas

Se consumen ítems de orden de cuota social pendientes y órdenes pendientes por familia.

## Mercado Pago (futuro)

Mantener `providerPaymentId` y `rawData`; agregar webhook que llame `approvePayment` al recibir estado aprobado.
