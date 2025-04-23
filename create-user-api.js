const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zvbhfdiufiewaoebpnzx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2YmhmZGl1Zmlld2FvZWJwbnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5Mjc1NjUsImV4cCI6MjA2MDUwMzU2NX0.zfC4M2UhabP5fnorjKJ_JZNgVINuqOu5hZq2QT1WAa0'
);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Registra utente
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

// ✅ Lista progetti (per admin)
app.get('/progetti', async (req, res) => {
  const { data, error } = await supabase.from('progetti').select('id, nome');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
});

// ✅ Progetti assegnati all’utente
app.get('/progetti-utente', async (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'user_id mancante' });
  }

  try {
    const { data: links, error: linkError } = await supabase
      .from('user_progetti')
      .select('progetto_id')
      .eq('user_id', userId);

    if (linkError) throw linkError;

    const progettoIds = links.map((l) => l.progetto_id);

    if (progettoIds.length === 0) {
      return res.status(200).json([]);
    }

    const { data: progetti, error: progettiError } = await supabase
      .from('progetti')
      .select('id, nome, descrizione, modello, immagine, pdf')
      .in('id', progettoIds);

    if (progettiError) throw progettiError;

    return res.status(200).json(progetti);
  } catch (err) {
    console.error('Errore progetti utente:', err.message || err);
    return res.status(500).json({ error: 'Errore lettura progetti utente' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API pronta su http://0.0.0.0:${PORT}`);
});
