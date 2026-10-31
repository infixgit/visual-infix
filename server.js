const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Replicate = require('replicate');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // Permette l'invio di immagini ad alta risoluzione

const PORT = process.env.PORT || 3000;
const otpStore = new Map();

// Inizializzazione Replicate con la chiave inserita su Render
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==========================================
// 1. ENDPOINT: INVIO OTP (via Brevo)
// ==========================================
app.post('/api/send-otp', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Indirizzo email non valido." });
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key mancante su Render." });
  }

  const otpCode = generateOtp();
  
  otpStore.set(email.toLowerCase(), {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000 // Scadenza 10 minuti
  });

  const data = JSON.stringify({
    sender: { name: 'Visual INFIX®', email: 'infixserramenti@gmail.com' },
    replyTo: { email: 'infixserramenti@gmail.com', name: 'Visual INFIX®' },
    to: [{ email: email.trim() }],
    subject: 'Codice di verifica OTP - Visual INFIX®',
    htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Visual INFIX® - Verifica Email</h2>
      <p>Codice di sblocco richiesto per la prova gratuita:</p>
      <h1 style="color: #2e7d32; letter-spacing: 4px; font-size: 32px;">${otpCode}</h1>
      <p style="font-size: 12px; color: #666;">Il codice scade tra 10 minuti.</p>
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
        return res.status(500).json({ error: "Errore durante l'invio dell'email via Brevo." });
      }
    });
  });

  brevoReq.on('error', (error) => {
    console.error("Errore di rete:", error);
    return res.status(500).json({ error: "Errore interno del server." });
  });

  brevoReq.write(data);
  brevoReq.end();
});

// ==========================================
// 2. ENDPOINT: VERIFICA OTP
// ==========================================
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Dati mancanti." });
  }

  const record = otpStore.get(email.toLowerCase());

  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "Codice OTP errato o scaduto." });
  }

  if (record.code === otp.trim()) {
    otpStore.delete(email.toLowerCase());
    return res.json({ success: true, message: "Verificato con successo!" });
  } else {
    return res.status(400).json({ error: "Codice OTP errato." });
  }
});

// ==========================================
// 3. ENDPOINT: GENERAZIONE VISIVA REALE (Replicate Image-to-Image)
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { userPrompt, finish, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    // Formattazione data URI dell'immagine originale per Replicate
    const imageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    // Prompt strutturato per Image-to-Image senza bisogno di maschera
    const promptText = `A realistic high quality architectural photo of this building with new installed garage doors, in finish: ${finish}. ${userPrompt || ''}, realistic lighting, architectural detail, 8k photo.`;

    // Utilizzo del modello Image-to-Image (flux-1.1-pro / flux-dev)
    const output = await replicate.run(
      "black-forest-labs/flux-1.1-pro",
      {
        input: {
          image: imageUri,
          prompt: promptText,
          prompt_strength: 0.65, // Mantiene la struttura della casa cambiando lo stile dei serramenti
          output_format: "jpg"
        }
      }
    );

    // Recupero dell'URL dell'immagine generata
    const resultImageUrl = Array.isArray(output) ? output[0] : output;

    res.json({ success: true, imageUrl: resultImageUrl, result: resultImageUrl });

  } catch (error) {
    console.error("Errore generazione grafica Replicate:", error);
    res.status(500).json({ success: false, error: "Errore durante la trasformazione grafica visiva." });
  }
});

// Health check endpoint per Render
app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
