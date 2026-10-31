const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Tabella in memoria per salvare temporaneamente gli OTP
const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Endpoint per inviare l'OTP via Brevo API V3 (HTTP porta 443 - mai bloccata su Render)
app.post('/api/send-otp', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Indirizzo email non valido." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'infix@outlook.it';

  if (!apiKey) {
    console.error("ERRORE: BREVO_API_KEY mancante nelle variabili d'ambiente di Render.");
    return res.status(500).json({ error: "Configurazione server incompleta (API Key mancante)." });
  }

  const otpCode = generateOtp();
  
  // Salva l'OTP con scadenza a 10 minuti
  otpStore.set(email.toLowerCase(), {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const data = JSON.stringify({
    sender: { name: 'Visual INFIX®', email: senderEmail },
    to: [{ email: email.trim() }],
    subject: 'Il tuo codice OTP - Visual INFIX®',
    htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2e7d32;">Visual INFIX® - Codice di Accesso</h2>
      <p>Hai richiesto l'accesso al simulatore professionale.</p>
      <p>Il tuo codice OTP di verifica a 6 cifre è:</p>
      <div style="background: #f4f4f9; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #2e7d32; letter-spacing: 6px;">${otpCode}</span>
      </div>
      <p style="font-size: 12px; color: #666;">Il codice scadrà tassativamente tra 10 minuti.</p>
    </div>`
  });

  const options = {
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(data)
    }
  };

  const brevoReq = https.request(options, (brevoRes) => {
    let body = '';
    brevoRes.on('data', (chunk) => body += chunk);
    brevoRes.on('end', () => {
      console.log(`Risposta Brevo (Status ${brevoRes.statusCode}):`, body);
      if (brevoRes.statusCode >= 200 && brevoRes.statusCode < 300) {
        return res.json({ success: true, message: "OTP inviato con successo." });
      } else {
        return res.status(500).json({ error: "Errore nell'invio della mail tramite Brevo. Controlla i log." });
      }
    });
  });

  brevoReq.on('error', (error) => {
    console.error("Errore di rete verso Brevo:", error);
    return res.status(500).json({ error: "Errore di connessione verso il servizio di posta." });
  });

  brevoReq.write(data);
  brevoReq.end();
});

// 2. Endpoint per verificare l'OTP inserito dall'utente
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
    otpStore.delete(email.toLowerCase()); // Rimuovi il codice usato
    return res.json({ success: true, message: "Verificato con successo!" });
  } else {
    return res.status(400).json({ error: "Codice OTP errato." });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
