import {
  useEffect,
  useState
} from 'react';

import {
  cancelReservation,
  createReservation,
  getProducts,
  getReservations
} from './api';

import './App.css';


function App() {
  const [products, setProducts] =
    useState([]);

  const [reservations, setReservations] =
    useState([]);

  const [quantities, setQuantities] =
    useState({});

  const [message, setMessage] =
    useState('');


  async function refresh() {
    const [
      productsResponse,
      reservationsResponse
    ] = await Promise.all([
      getProducts(),
      getReservations()
    ]);

    setProducts(
      productsResponse.data
    );

    setReservations(
      reservationsResponse.data
    );
  }


  useEffect(() => {
    refresh().catch(() => {
      setMessage(
        'No fue posible cargar los datos.'
      );
    });
  }, []);


  async function reserve(product) {
    const quantity =
      Number(
        quantities[product.id] || 1
      );


    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setMessage(
        'Cantidad inválida.'
      );

      return;
    }


    try {
      await createReservation({
        productId: product.id,
        quantity,

        // Cada intención nueva usa una key nueva.
        idempotencyKey:
          crypto.randomUUID()
      });


      setMessage(
        'Reserva creada.'
      );

      await refresh();

    } catch (error) {
      if (
        error.code ===
        'INSUFFICIENT_STOCK'
      ) {
        setMessage(
          `Inventario insuficiente. Disponible: ${
            error.details
              ?.availableQuantity
          }.`
        );
      } else {
        setMessage(
          error.message
        );
      }

      await refresh()
        .catch(() => {});
    }
  }


  async function cancel(
    reservationId
  ) {
    try {
      await cancelReservation(
        reservationId
      );

      setMessage(
        'Reserva cancelada.'
      );

      await refresh();

    } catch (error) {
      setMessage(
        error.message
      );
    }
  }


  const activeCount =
    reservations.filter(
      (reservation) =>
        reservation.status === 'ACTIVE'
    ).length;


  return (
    <main className="container">

      <header>
        <p className="eyebrow">
          INVENTORY MVP
        </p>

        <h1>
          Reservas de productos
        </h1>

        <p>
          Reservas activas:{' '}
          <strong>
            {activeCount}
          </strong>
        </p>
      </header>


      {message && (
        <div className="message">
          {message}
        </div>
      )}


      <section className="products">

        {products.map(
          (product) => (
            <article
              className="card"
              key={product.id}
            >

              <h2>
                {product.name}
              </h2>

              <p>
                Disponible
              </p>

              <strong className="quantity">
                {
                  product
                    .availableQuantity
                }
                {' / '}
                {
                  product
                    .initialQuantity
                }
              </strong>


              <div className="reserve-row">

                <input
                  type="number"
                  min="1"

                  value={
                    quantities[
                      product.id
                    ] || 1
                  }

                  onChange={
                    (event) =>
                      setQuantities({
                        ...quantities,

                        [product.id]:
                          event.target.value
                      })
                  }
                />


                <button
                  disabled={
                    product
                      .availableQuantity
                    === 0
                  }

                  onClick={
                    () =>
                      reserve(product)
                  }
                >
                  Reservar
                </button>

              </div>

            </article>
          )
        )}

      </section>


      <section className="reservations">

        <h2>
          Reservas
        </h2>


        {reservations.length === 0 ? (
          <p>
            Todavía no hay reservas.
          </p>
        ) : (
          <table>

            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>

              {reservations.map(
                (reservation) => (
                  <tr
                    key={
                      reservation.id
                    }
                  >

                    <td>
                      {
                        reservation
                          .productName
                      }
                    </td>

                    <td>
                      {
                        reservation
                          .quantity
                      }
                    </td>

                    <td>
                      {
                        reservation
                          .status
                      }
                    </td>

                    <td>
                      {
                        reservation.status
                        === 'ACTIVE'
                        ? (
                          <button
                            onClick={
                              () =>
                                cancel(
                                  reservation.id
                                )
                            }
                          >
                            Cancelar
                          </button>
                        )
                        : '—'
                      }
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>
        )}

      </section>

    </main>
  );
}


export default App;