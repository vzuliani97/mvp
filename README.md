# MVP

Aplicación para manejar reservas de productos con inventario limitado.

## Stack

- Node.js / Express
- PostgreSQL
- React
- Docker

## Ejecutar

```bash
cp .env.example .env
docker compose up --build
```

La aplicación queda disponible en:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/health
```

Para ejecutar las pruebas:

```bash
make test
```

## Decisiones principales

El inventario se descuenta mediante un `UPDATE` condicionado dentro de una transacción para evitar sobreventa cuando existen solicitudes concurrentes.

Las reservas utilizan `Idempotency-Key` para distinguir una operación nueva de un reintento de la misma solicitud y evitar descontar inventario más de una vez.

Una cancelación devuelve inventario únicamente cuando la reserva cambia de `ACTIVE` a `CANCELLED`.

Las reservas diferentes sobre un mismo producto se mantienen independientes para conservar su trazabilidad y poder cancelarlas por separado.

## API

```text
GET  /api/products
GET  /api/reservations
POST /api/reservations
POST /api/reservations/:id/cancel
```

Para crear una reserva se debe enviar el header:

```text
Idempotency-Key
```

Ejemplo:

```json
{
  "productId": 1,
  "quantity": 2
}
```

## Pruebas

Se incluyeron 6 pruebas de integración enfocadas en los escenarios de mayor riesgo:

- solicitudes concurrentes sin sobreventa;
- repetición de una misma operación;
- reserva de exactamente todo el inventario disponible;
- reutilización de una `Idempotency-Key` con datos diferentes;
- cancelación repetida sin devolver inventario dos veces;
- validación de cantidades directamente en el backend.

## Uso de IA

Utilicé ChatGPT como apoyo durante el desarrollo para revisar la organización del código, resolver algunos errores, contrastar decisiones de implementación y revisar casos de prueba.

También lo utilicé como apoyo en temas puntuales de sintaxis y para organizar la documentación de mi proyecto.

Las sugerencias que incorporé fueron revisadas sobre el código y verificadas ejecutando la aplicación, consultando PostgreSQL y corriendo las pruebas automatizadas de la arquitectura.