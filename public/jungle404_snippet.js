<!-- jungle404_snippet.js (modo demo para GitHub Pages) -->
<script>
(function() {
  // Detecta si estamos en GitHub Pages y no hay API real configurada:
  const isPages = location.hostname.endsWith('github.io');
  const API_BASE = window.JUNGLE404_API_BASE || '';
  const useDemo = isPages && !API_BASE;

  // Utilidades demo (IDs y “certificados” falsos pero verosímiles)
  function rnd(len=10){return Array(len).fill(0).map(()=>Math.random().toString(36)[2]).join('');}
  function demoCreateIntent(){
    return new Promise(res=>setTimeout(()=>res({intent_id:'demo_'+rnd(8)}),200));
  }
  function demoConfirm(intent_id){
    return new Promise(res=>setTimeout(()=>res({planting_id:'plant_'+rnd(8)}),300));
  }
  function demoProof(planting_id){
    return new Promise(res=>setTimeout(()=>res({
      planting_id,
      intent_id:'intent_'+rnd(6),
      project:'Amazonía Peruana',
      planted_at:new Date().toISOString(),
      coordinates:[-4.123, -73.45],
      message:'Gracias por plantar un árbol en la Amazonía peruana (demo).'
    }),300));
  }

  // Llamadas reales si tienes API externo (Render/Heroku/etc.)
  async function realCreateIntent(){ 
    const r = await fetch(`${API_BASE}/planting-intents`, {method:'POST'}); 
    return r.json();
  }
  async function realConfirm(intent_id){
    const r = await fetch(`${API_BASE}/confirm`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({intent_id})
    }); 
    return r.json();
  }
  async function realProof(planting_id){
    const r = await fetch(`${API_BASE}/proofs?planting_id=${encodeURIComponent(planting_id)}`);
    return r.json();
  }

  // UI mínima
  const box = document.createElement('div');
  box.style.cssText = 'max-width:560px;margin:2rem auto;padding:1rem;border:1px solid #ddd;border-radius:12px;font-family:system-ui,Arial';
  box.innerHTML = `
    <h2 style="margin:0 0 .5rem">Jungle 404</h2>
    <p style="margin:.25rem 0">Convierte este 404 en reforestación.</p>
    <button id="j404-btn" style="padding:.6rem 1rem;border-radius:10px;border:1px solid #111;cursor:pointer">Plantar un árbol</button>
    <div id="j404-msg" style="margin-top:1rem;font-size:.95rem;line-height:1.4"></div>
  `;
  document.body.appendChild(box);

  const btn = box.querySelector('#j404-btn');
  const msg = box.querySelector('#j404-msg');

  let intentId = null;
  (async () => {
    try {
      const data = useDemo ? await demoCreateIntent() : await realCreateIntent();
      intentId = data.intent_id;
    } catch(e) {
      msg.textContent = 'No se pudo inicializar la intención. (¿API disponible?)';
      btn.disabled = true;
    }
  })();

  btn.addEventListener('click', async ()=>{
    btn.disabled = true; msg.textContent = 'Confirmando plantación…';
    try {
      const { planting_id } = useDemo ? await demoConfirm(intentId) : await realConfirm(intentId);
      const proof = useDemo ? await demoProof(planting_id) : await realProof(planting_id);
      msg.innerHTML = `
        <strong>¡Listo!</strong><br>
        ID: ${proof.planting_id}<br>
        Proyecto: ${proof.project}<br>
        Fecha: ${new Date(proof.planted_at).toLocaleString()}<br>
        ${proof.message}
      `;
    } catch(e){
      msg.textContent = 'Ocurrió un problema al confirmar. Revisa la consola y tu configuración.';
      btn.disabled = false;
    }
  });
})();
</script>
