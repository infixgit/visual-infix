const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Configurazione SMTP identica a quella funzionante della Bussola
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: process.env.SMTP_USER || process.env.SENDER_EMAIL || 'infixserramenti@gmail.it',
        pass: process.env.BREVO_API_KEY
    }
});

// Memoria temporanea in-memory per gli OTP
const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Indirizzo email non valido." });
  }

  const otpCode = generateOtp();
  otpStore.set(email.toLowerCase(), {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  try {
    await transporter.sendMail({
      from: `"Visual INFIX®" <${process.env.SMTP_USER || process.env.SENDER_EMAIL || 'infixserramenti@gmail.it'}>`,
      to: email,
      subject: 'Il tuo codice OTP - Visual INFIX®',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Accesso Autorizzato Visual INFIX®</h2>
        <p>Il tuo codice OTP di verifica è:</p>
        <h1 style="color: #2e7d32; letter-spacing: 3px;">${otpCode}</h1>
        <p>Il codice scadrà tra 10 minuti.</p>
      </div>`
    });

    return res.json({ success: true, message: "OTP inviato con successo." });
  } catch (error) {
    console.error("Errore SMTP/Brevo:", error);
    return res.status(500).json({ error: "Errore nell'invio della mail tramite Brevo." });
  }
});

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
