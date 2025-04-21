// File: create-user-api.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(cors());
app.use(express.json());

// Registra utente
app.post('/create-user', async (req, res) => {
  try {
    const { email, password, admin, progetti } = req.body;

    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError) {
      return res.status(400).json({ error: createUserError.message });
    }

    const userId = userData.user.id;

    const { error: insertUserError } = await supabase
      .from('utenti')
      .insert({ id: userId, email, admin });

    if (insertUserError) {
      return res.status(400).json({ error: insertUserError.message });
    }

    const userProjects = progetti.map((id) => ({
      user_id: userId,
      progetto_id: id,
    }));

    const { error: insertLinksError } = await supabase
      .from('user_progetti')
      .insert(userProjects);

    if (insertLinksError) {
      return res.status(400).json({ error: insertLinksError.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Errore backend:', error);
    return res.status(500).json({ error: 'Errore interno server' });
  }
});

// Elenco progetti
app.get('/progetti', async (req, res) => {
  const { data, error } = await supabase.from('progetti').select('id, nome');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
});
// ✅ Elenco progetti collegati a un utente
app.get('/progetti-utente', async (req, res) => {
    const userId = req.query.user_id;
  
    if (!userId) {
      return res.status(400).json({ error: 'user_id mancante' });
    }
  
    const { data, error } = await supabase
      .from('user_progetti')
      .select(`
        progetto:progetti (
          id,
          nome,
          descrizione,
          modello,
          immagine,
          pdf
        )
      `)
      .eq('user_id', userId);
  
    if (error) {
      console.error('Errore progetti utente:', error.message);
      return res.status(500).json({ error: 'Errore lettura progetti utente' });
    }
  
    // Estrai i progetti mappati
    const progetti = data.map((entry) => entry.progetto);
  
    return res.status(200).json(progetti);
  });
  
  
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API pronta su http://localhost:${PORT}`);
});
