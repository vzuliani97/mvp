async function parseResponse(
  response
) {
  const payload =
    await response
      .json()
      .catch(() => ({}));


  if (!response.ok) {
    const error =
      new Error(
        payload?.error?.message
        || 'Unexpected error'
      );

    error.code =
      payload?.error?.code;

    error.details =
      payload?.error?.details;

    throw error;
  }


  return payload;
}


export async function getProducts() {
  return parseResponse(
    await fetch('/api/products')
  );
}


export async function getReservations() {
  return parseResponse(
    await fetch('/api/reservations')
  );
}


export async function createReservation({
  productId,
  quantity,
  idempotencyKey
}) {
  return parseResponse(
    await fetch(
      '/api/reservations',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          'Idempotency-Key':
            idempotencyKey
        },

        body:
          JSON.stringify({
            productId,
            quantity
          })
      }
    )
  );
}


export async function cancelReservation(
  reservationId
) {
  return parseResponse(
    await fetch(
      `/api/reservations/${reservationId}/cancel`,
      {
        method: 'POST'
      }
    )
  );
}