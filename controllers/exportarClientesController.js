const MiniPlan = require('../models/ApiMiniPLan');

const exportarClientes = async (req, res) => {
  try {
    const clientes = await MiniPlan.find();
    res.json(clientes);
  } catch (error) {
    console.error('Error al exportar clientes MiniPlan:', error);
    res.status(500).json({ error: 'Error al exportar los datos' });
  }
};

module.exports = { exportarClientes };
