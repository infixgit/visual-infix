// Configurazione Profili e Crediti (Stile Bussola)
const USERS_DB = {
  "infix@outlook.it": { role: "PRO", credits: 999999 },
  "santino.simoncello@libero.it": { role: "STANDARD", credits: 50 }
};

// Controlla se c'è un'email salvata o se dobbiamo richiederla
let currentUserEmail = localStorage.getItem('visual_infix_user') || '';

function checkUserAccess() {
  if (!currentUserEmail || !USERS_DB[currentUserEmail]) {
    // Se non è loggato, chiediamo l'email con un prompt rapido
    let email = prompt("Inserisci la tua email autorizzata per Visual INFIX® (es. santino.simoncello@libero.it o infix@outlook.it):");
    if (email && USERS_DB[email.trim().toLowerCase()]) {
      currentUserEmail = email.trim().toLowerCase();
      localStorage.setItem('visual_infix_user', currentUserEmail);
    } else {
      alert("Email non riconosciuta o non autorizzata.");
      return checkUserAccess();
    }
  }
  updateCreditsUI();
}

// Aggiorna l'Interfaccia Utente in base al profilo loggato
function updateCreditsUI() {
  const user = USERS_DB[currentUserEmail];
  const display = document.getElementById('creditsDisplay');
  
  if (user.role === "PRO") {
    display.innerText = `Profilo PRO (${currentUserEmail}) - Crediti: Illimitati 🚀`;
  } else {
    display.innerText = `Utente: ${currentUserEmail} - Crediti rimasti: ${user.credits}`;
  }

  // Nascondi il paywall di Stripe se l'utente ha crediti o è PRO
  document.getElementById('generateBtn').style.display = 'block';
  document.getElementById('stripePaywall').style.display = 'none';
}

// Gestione invio modulo ed elaborazione immagine
document.getElementById('visualForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const user = USERS_DB[currentUserEmail];
  if (user.role !== "PRO" && user.credits <= 0) {
    alert("Hai esaurito i crediti disponibili.");
    document.getElementById('generateBtn').style.display = 'none';
    document.getElementById('stripePaywall').style.display = 'block';
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

  const reader = new FileReader();
  reader.onload = function(e) {
    setTimeout(() => {
      const afterImage = document.getElementById('afterImage');
      afterImage.src = e.target.result;

      // Scala il credito se non è PRO
      if (user.role !== "PRO") {
        user.credits--;
      }
      
      updateCreditsUI();

      document.getElementById('resultArea').style.display = 'block';
      generateBtn.innerText = "Genera Simulazione Visual INFIX®";
      generateBtn.disabled = false;

      document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
    }, 1500);
  };

  reader.readAsDataURL(file);
});

// Reindirizzamento al pagamento Stripe (per il futuro)
const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/TUO_LINK_DI_PAGAMENTO_INFIX";
function redirectToStripe() {
  window.location.href = STRIPE_CHECKOUT_URL;
}

// Avvio controllo accessi
checkUserAccess();
