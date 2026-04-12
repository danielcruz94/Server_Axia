const ClienteAxia = require('../models/ClienteAxia');

const GetDataClientesPlanFinanciero = async (req, res) => {   
  try {   
    const clientes = await ClienteAxia.find()
      .select(' fecha cedula nombre apellidos correoElectronico empresa seguridadsocialAFP ingresos asesor fechaNacimiento edad celular')
      .sort({ fecha: -1 }); // -1 para orden descendente (más reciente primero)
    
    return res.status(200).json({
      success: true,
      count: clientes.length,
      data: clientes
    });
  }
  catch(error) {
    console.error('Error al obtener los datos:', error);     
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener los datos',
      message: error.message 
    });              
  }
}

module.exports = { GetDataClientesPlanFinanciero };