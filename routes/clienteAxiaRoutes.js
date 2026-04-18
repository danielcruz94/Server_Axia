const express = require('express');
const router = express.Router();
// autorizacion de los usuarios
const authenticateToken = require('../middleware/auth.middleware');
const authorizeRoles = require('../middleware/roles.middleware');

const crearCliente = require('../controllers/crearCliente');
const obtenerCliente = require('../controllers/obtenerCliente');
const login = require('../controllers/login');
const actualizarCliente = require('../controllers/actualizarcliente');
const obtenerFieldset = require('../controllers/fieldset');
const getAllClientes = require('../controllers/GetAllClientes');
const { procesarMiniPlan } = require('../controllers/miniplan');
const { exportarClientes } = require('../controllers/exportarClientesController');
const { enviarCorreoConPDF } = require('../controllers/enviarCorreo');
const  {GetDataClientesPlanFinanciero}  = require('../controllers/getDatosPlanFinanciero');

const multer = require('multer');

// Configurar multer para manejar el archivo PDF
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ruta para crear un nuevo cliente
router.post('/clientes', crearCliente);


//EXPORTAR DATOS A EXCEL
//Ruta Mini Plan Financiero Descargar datos
router.get('/ClienteAxias',authenticateToken, authorizeRoles('ADMIN', 'SUPERADMIN', 'USER'), exportarClientes);

router.get('/datos/clientes/plan-financiero',authenticateToken, authorizeRoles('ADMIN', 'SUPERADMIN', 'USER'), GetDataClientesPlanFinanciero);



// Ruta para obtener los datos de un cliente por su ID
router.get('/clientes/:cedula', obtenerCliente);

// Ruta para login
router.post('/login', login);

// Ruta para actualizar cliente
router.put('/actualizar', actualizarCliente);

// Ruta para obtener fieldset
router.get('/cliente/:cedula/fieldset', obtenerFieldset);

//Ruta Mini Plan Financiero
router.post('/miniplan', procesarMiniPlan);

// Ruta para enviar el correo con el PDF adjunto
router.post('/Email', upload.single('pdf'), async (req, res) => {
    try {

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'No se recibió el archivo PDF' });
        }

        // Parsear el JSON que viene como string
        const parsedData = JSON.parse(req.body.object);
        const { nombre, email, celular, recomendadoPor } = parsedData;

        const pdfBuffer = req.file.buffer;

        await enviarCorreoConPDF({ nombre, email, celular, recomendadoPor }, pdfBuffer);
        res.status(200).json({ message: 'Correo enviado correctamente' });
    } catch (error) {
        console.error("❌ Error al enviar el correo:", error);
        res.status(500).json({ message: 'Error al enviar el correo' });
    }
});


// ✅ Ruta keepalive para mantener el servidor activo
router.get('/keepalive', (req, res) => {
    res.status(200).send('✅ Server is awake!');
});

module.exports = router;
