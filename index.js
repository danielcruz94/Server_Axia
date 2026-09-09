const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');


const connectDB = require('./dbConnection'); 
const clienteRoutes = require('./routes/clienteAxiaRoutes'); 

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api', clienteRoutes);

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

if (process.env.NODE_ENV !== 'production') {
  // Solo escucha en local
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
  });
}

app.get('/favicon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.png'));
});
// Exporta siempre la app para Vercel
module.exports = app;
