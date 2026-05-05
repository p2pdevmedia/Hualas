# Billing System (Family cart)

## Modelo de datos

Se agregaron: `FamilyGroup`, `FamilyGroupMember`, `BillableConcept`, `MemberMonthlyCharge`, `Order`, `OrderItem`, `Payment`.

## Flujo familiar

1. Se vinculan socios a un `FamilyGroup`.
2. Se generan `MemberMonthlyCharge` por socio/mes.
3. Se crea `Order` mensual y se agregan `OrderItem` (cuota social, actividades, etc.).
4. Se crea `Payment` para la orden.
5. Al aprobar pago: payment/order/items/cargos quedan en estado pagado.

## Cuota social mensual

`memberId + month + year + concept` tiene índice único para evitar duplicados.

## Aprobación de pago

`paymentService.approvePayment` usa transacción para marcar `Payment`, `Order`, `OrderItem` y `MemberMonthlyCharge`.

## Consulta de deudas

Se consumen cargos pendientes (`MemberMonthlyCharge.status=PENDING`) y órdenes pendientes por familia.

## Mercado Pago (futuro)

Mantener `providerPaymentId` y `rawData`; agregar webhook que llame `approvePayment` al recibir estado aprobado.
