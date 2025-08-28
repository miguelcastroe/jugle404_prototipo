/*
 * Copia del snippet de Jungle 404 para el servidor de demostración.
 * Véase jungle404_snippet.js en el directorio raíz para comentarios detallados.
 */

(function() {
  const API_BASE = window.JUNGLE404_API_BASE || '';
  let intentId = null;
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'jungle404-widget';
    const styles = document.createElement('style');
    styles.textContent = `
      #jungle404-widget {
        max-width: 320px;
        margin: 2rem 0;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-family: sans-serif;
        text-align: center;
        background-color: #f5f9f6;
      }
      #jungle404-widget button {
        margin-top: 1rem;
        padding: 0.6rem 1.2rem;
        font-size: 1rem;
        color: #fff;
        background-color: #2d8a4c;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      #jungle404-widget button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      #jungle404-widget .j404-message {
        margin-top: 0.75rem;
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(styles);
    container.innerHTML = `
      <h3>¡Ups! Esta página no existe.</h3>
      <p>Convierte este momento en algo positivo plantando un árbol en la Amazonía.</p>
      <button id="jungle404-button">Plantar un árbol</button>
      <div class="j404-message" id="jungle404-message"></div>
    `;
    document.body.appendChild(container);
    const button = document.getElementById('jungle404-button');
    button.addEventListener('click', confirmPlanting);
  }
  function createIntent() {
    return fetch(`${API_BASE}/planting-intents`, { method: 'POST' })
      .then(resp => resp.json())
      .then(data => {
        intentId = data.intent_id;
      })
      .catch(err => {
        console.error('Error creating intent', err);
      });
  }
  function confirmPlanting() {
    const button = document.getElementById('jungle404-button');
    const messageEl = document.getElementById('jungle404-message');
    if (!intentId) {
      messageEl.textContent = 'No se pudo inicializar la plantación.';
      return;
    }
    button.disabled = true;
    messageEl.textContent = 'Plantando tu árbol…';
    fetch(`${API_BASE}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_id: intentId })
    })
      .then(resp => resp.json())
      .then(data => {
        if (data.error) {
          messageEl.textContent = 'Ha ocurrido un error: ' + data.error;
          button.disabled = false;
          return;
        }
        const plantingId = data.planting_id;
        return fetch(`${API_BASE}/proofs?planting_id=${encodeURIComponent(plantingId)}`)
          .then(certResp => certResp.json())
          .then(certData => {
            messageEl.innerHTML = `
              ¡Gracias! Se plantó un árbol con ID <strong>${certData.planting_id}</strong>.<br>
              Proyecto: ${certData.project}<br>
              Fecha: ${new Date(certData.planted_at).toLocaleString()}
            `;
          });
      })
      .catch(err => {
        console.error('Error confirming planting', err);
        messageEl.textContent = 'Ha ocurrido un error al plantar tu árbol.';
      });
  }
  document.addEventListener('DOMContentLoaded', () => {
    createWidget();
    createIntent();
  });
})();
