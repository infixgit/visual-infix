const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-otp', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Indirizzo email non valido." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'infix@outlook.it';

  if (!apiKey) {
    return res.status(500).json({ error: "API Key mancante su Render." });
  }

  const otpCode = generateOtp();
  otpStore.set(email.toLowerCase(), {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const data = JSON.stringify({
    sender: { name: 'Visual INFIX®', email: senderEmail },
    to: [{ email: email }],
    subject: 'Il tuo codice OTP - Visual INFIX®',
    htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Accesso Autorizzato Visual INFIX®</h2>
      <p>Il tuo codice OTP di verifica è:</p>
      <h1 style="color: #2e7d32; letter-spacing: 3px;">${otpCode}</h1>
      <p>Il codice scadrà tra 10 minuti.</p>
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
      if (brevoRes.statusCode >= 200 && brevoRes.statusCode < 300) {
        return res.json({ success: true, message: "OTP inviato con successo." });
      } else {
        console.error("Errore Brevo Dettaglio:", body);
        return res.status(500).json({ error: "Errore nell'invio della mail tramite Brevo." });
      }
    });
  });

  brevoReq.on('error', (error) => {
    console.error("Errore Server:", error);
    return res.status(500).json({ error: "Errore interno del server." });
  });

  brevoReq.write(data);
  brevoReq.end();
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Dati mancanti." });
  }

  const record = otpStore.get(email.toLowerCase());

  if (!record) {
    return res.status(400).json({ error: "Nessun codice OTP richiesto." });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: "Codice OTP scaduto." });
  }

  if (record.code === otp.trim()) {
    otpStore.delete(email.toLowerCase());
    return res.json({ success: true, message: "Verificato con successo!" });
  } else {
    return res.status(400).json({ error: "Codice OTP errato." });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
