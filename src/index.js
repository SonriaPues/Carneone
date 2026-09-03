require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/mesas',     require('./routes/mesas'));
app.use('/api/menu',      require('./routes/menu'));
app.use('/api/historico', require('./routes/historico'));
app.use('/api/meseros',   require('./routes/meseros'));

app.use(express.static(path.join(__dirname, '../build'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Carneone API v2 en puerto ${PORT} ✓`));
