// Configurazione Iniziale Crediti
const FREE_LIMIT = 2;
let usedSimulations = parseInt(localStorage.getItem('visual_infix_credits') || '0');

// URL Link Checkout Stripe (Da aggiornare successivamente)
const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/TUO_LINK_DI_PAGAMENTO_INFIX";

// Aggiorna l'Interfaccia Utente in base ai crediti rimanenti
function updateCreditsUI() {
  const remaining = Math.max(0, FREE_LIMIT - usedSimulations);
  const display = document.getElementById('creditsDisplay');
  display.innerText = `Simulazioni gratuite rimaste: ${remaining}`;

  if (remaining === 0) {
    document.getElementById('generateBtn').style.display = 'none';
    document.getElementById('stripePaywall').style.display = 'block';
  }
}

// Gestione invio modulo ed elaborazione immagine
document.getElementById('visualForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  if (usedSimulations >= FREE_LIMIT) {
    alert("Hai esaurito le simulazioni gratuite. Acquista dei crediti per continuare.");
    return;
  }

  const fileInput = document.getElementById('photoInput');
  const file = fileInput.files[0];

  if (!file) {
    alert("Per favore, seleziona o scatta prima una foto!");
    return;
  }

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.innerText = "Elaborazione visiva in corso...";
  generateBtn.disabled = true;

  // Lettura e anteprima dell'immagine caricata
  const reader = new FileReader();
  reader.onload = function(e) {
    setTimeout(() => {
      // Imposta l'immagine elaborata nell'area di anteprima
      const afterImage = document.getElementById('afterImage');
      afterImage.src = e.target.result;

      // Incrementa contatore utilizzi
      usedSimulations++;
      localStorage.setItem('visual_infix_credits', usedSimulations.toString());
      updateCreditsUI();

      // Mostra il risultato nella pagina
      document.getElementById('resultArea').style.display = 'block';
      generateBtn.innerText = "Genera Simulazione Visual INFIX®";
      generateBtn.disabled = false;

      // Scorrimento automatico verso il risultato
      document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
    }, 1500);
  };

  reader.readAsDataURL(file);
});

// Reindirizzamento al pagamento Stripe
function redirectToStripe() {
  window.location.href = STRIPE_CHECKOUT_URL;
}

// Inizializzazione UI all'avvio
updateCreditsUI();
