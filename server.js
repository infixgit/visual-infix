const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'infixserramenti@gmail.it';

// Memoria temporanea in-memory per gli OTP
const otpStore = new Map();

// Genera un codice numerico casuale a 6 cifre
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Endpoint per la richiesta OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Indirizzo email non valido." });
  }

  const otpCode = generateOtp();
  otpStore.set(email.toLowerCase(), {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000 // Scade dopo 10 minuti
  });

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Visual INFIX®', email: SENDER_EMAIL },
        to: [{ email: email }],
        subject: 'Il tuo codice OTP - Visual INFIX®',
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Accesso Autorizzato Visual INFIX®</h2>
          <p>Il tuo codice OTP di verifica è:</p>
          <h1 style="color: #2e7d32; letter-spacing: 3px;">${otpCode}</h1>
          <p>Il codice scadrà tra 10 minuti.</p>
        </div>`
      })
    });

    if (response.ok) {
      return res.json({ success: true, message: "OTP inviato con successo." });
    } else {
      const errData = await response.json();
      console.error("Errore Brevo:", errData);
      return res.status(500).json({ error: "Errore nell'invio della mail tramite Brevo." });
    }
  } catch (error) {
    console.error("Errore Server:", error);
    return res.status(500).json({ error: "Errore interno del server." });
  }
});

// Endpoint per la verifica dell'OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Dati mancanti per la verifica." });
  }

  const record = otpStore.get(email.toLowerCase());

  if (!record) {
    return res.status(400).json({ error: "Nessun codice OTP richiesto per questa email." });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: "Codice OTP scaduto. Richiedine uno nuovo." });
  }

  if (record.code === otp.trim()) {
    otpStore.delete(email.toLowerCase());
    return res.json({ success: true, message: "OTP verificato con successo!" });
  } else {
    return res.status(400).json({ error: "Codice OTP errato." });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server Visual INFIX attivo sulla porta ${PORT}`);
});
