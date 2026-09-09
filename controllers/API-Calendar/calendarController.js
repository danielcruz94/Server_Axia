const { google } = require('googleapis');

require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Usamos el refresh token guardado en Vercel
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const SCOPES = [
  'https://www.googleapis.com/auth/calendar'
];

/**
 * Conectar Google Calendar
 */
const conexionCalendar = async (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    res.redirect(authUrl);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error al conectar a Google Calendar',
      error: error.message
    });
  }
};


/**
 * Callback de Google OAuth
 */
const callbackApiCalendar = async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await oauth2Client.getToken(code);

    console.log('Tokens obtenidos');

    res.status(200).json({
      message: 'Google Calendar conectado correctamente',
      hasRefreshToken: !!tokens.refresh_token
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error al conectar Google Calendar',
      error: error.message
    });
  }
};


/**
 * Obtener los slots disponibles de 30 minutos
 */
const consultarDisponibilidad = async (req, res) => {
  try {

    const { date } = req.query;

    // Validar que venga la fecha
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Debes enviar la fecha. Ejemplo: ?date=2026-09-11'
      });
    }

    // Validar formato YYYY-MM-DD
    const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(date);

    if (!fechaValida) {
      return res.status(400).json({
        success: false,
        message: 'La fecha debe tener el formato YYYY-MM-DD'
      });
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_CALENDAR_ID no está configurado'
      });
    }

    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client
    });

    /**
     * Horario laboral
     */
    const horaInicio = '08:00';
    const horaFin = '17:00';

    /**
     * Inicio y fin de la consulta
     *
     * Colombia = UTC-5
     */
    const timeMin = `${date}T${horaInicio}:00-05:00`;
    const timeMax = `${date}T${horaFin}:00-05:00`;

    /**
     * Consultar eventos ocupados en Google Calendar
     */
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'America/Bogota',
        items: [
          {
            id: calendarId
          }
        ]
      }
    });

    const busy =
      response.data.calendars[calendarId]?.busy || [];

    /**
     * Convertimos los períodos ocupados
     * en slots disponibles de 30 minutos
     */
    const slots = generarSlotsDisponibles(
      busy,
      date,
      horaInicio,
      horaFin
    );

    res.status(200).json({
      success: true,
      date,
      durationMinutes: 30,
      slots
    });

  } catch (error) {
    console.error('Error disponibilidad:', error);

    res.status(500).json({
      success: false,
      message: 'Error consultando disponibilidad',
      error: error.message
    });
  }
};


/**
 * Generar slots disponibles de 30 minutos
 */
const generarSlotsDisponibles = (
  busy,
  fecha,
  horaInicio,
  horaFin
) => {

  const slots = [];

  const minutosPorSlot = 30;

  /**
   * Convertimos HH:mm a minutos
   */
  const convertirAMinutos = (hora) => {
    const [horas, minutos] = hora.split(':').map(Number);

    return horas * 60 + minutos;
  };

  const inicioJornada = convertirAMinutos(horaInicio);
  const finJornada = convertirAMinutos(horaFin);

  /**
   * Convertir eventos ocupados a minutos
   */
  const ocupados = busy.map(evento => {

    const inicio = new Date(evento.start);
    const fin = new Date(evento.end);

    /**
     * Convertimos a hora Colombia
     */
    const inicioColombia = new Date(
      inicio.toLocaleString('en-US', {
        timeZone: 'America/Bogota'
      })
    );

    const finColombia = new Date(
      fin.toLocaleString('en-US', {
        timeZone: 'America/Bogota'
      })
    );

    return {
      start:
        inicioColombia.getHours() * 60 +
        inicioColombia.getMinutes(),

      end:
        finColombia.getHours() * 60 +
        finColombia.getMinutes()
    };
  });

  /**
   * Revisar cada slot de 30 minutos
   */
  for (
    let minutos = inicioJornada;
    minutos + minutosPorSlot <= finJornada;
    minutos += minutosPorSlot
  ) {

    const slotInicio = minutos;
    const slotFin = minutos + minutosPorSlot;

    /**
     * ¿El slot se cruza con algún evento?
     */
    const estaOcupado = ocupados.some(evento => {

      return (
        slotInicio < evento.end &&
        slotFin > evento.start
      );

    });

    /**
     * Si no está ocupado, lo agregamos
     */
    if (!estaOcupado) {

      const formatearHora = (minutos) => {

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      };

      slots.push({
        start: formatearHora(slotInicio),
        end: formatearHora(slotFin)
      });
    }
  }

  return slots;
};
const agendarCita = async (req, res) => {
  try {
    const {
      name,
      email,
      date,
      startTime
    } = req.body;

    // Validaciones
    if (!name || !email || !date || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'name, email, date y startTime son obligatorios'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no es válido'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha debe tener formato YYYY-MM-DD'
      });
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'La hora debe tener formato HH:mm'
      });
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_CALENDAR_ID no está configurado'
      });
    }

    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client
    });

    // La cita dura 30 minutos
    const [hours, minutes] = startTime.split(':').map(Number);

    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + 30;

    const endHours = Math.floor(endMinutes / 60);
    const endMinutesRest = endMinutes % 60;

    const endTime = `${String(endHours).padStart(2, '0')}:${String(
      endMinutesRest
    ).padStart(2, '0')}`;

    // Fecha/hora Colombia
    const startDateTime = `${date}T${startTime}:00-05:00`;
    const endDateTime = `${date}T${endTime}:00-05:00`;

    const start = new Date(startDateTime);

    // No permitir fechas pasadas
    if (start <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes agendar una cita en una fecha u hora pasada'
      });
    }

    // ==========================================
    // Verificar disponibilidad
    // ==========================================

    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime,
        timeMax: endDateTime,
        timeZone: 'America/Bogota',
        items: [
          {
            id: calendarId
          }
        ]
      }
    });

    const busy =
      freeBusyResponse.data.calendars[calendarId]?.busy || [];

    if (busy.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El horario seleccionado ya no está disponible'
      });
    }

    // ==========================================
    // Crear evento
    // ==========================================

    const event = {
      summary: `Reunión con ${name} del ACN_CONGRESO_MED_SEP26`,

      description: [
        'Cita agendada desde la aplicación.',
        `Cliente: ${name}`,
        `Correo: ${email}`
      ].join('\n'),

      start: {
        dateTime: startDateTime,
        timeZone: 'America/Bogota'
      },

      end: {
        dateTime: endDateTime,
        timeZone: 'America/Bogota'
      },

      attendees: [
        {
          email: email
        }
      ]
    };

    // ==========================================
    // Crear evento en Google Calendar
    // ==========================================

    const response = await calendar.events.insert({
      calendarId,
      resource: event,

      // Envía la invitación al cliente
      sendUpdates: 'all'
    });

    return res.status(201).json({
      success: true,
      message: 'Cita agendada correctamente',

      appointment: {
        id: response.data.id,
        name,
        email,
        date,
        startTime,
        endTime,
        durationMinutes: 30,
        calendarLink: response.data.htmlLink
      }
    });

  } catch (error) {

    console.error(
      'Error agendando cita:',
      error.response?.data || error
    );

    return res.status(500).json({
      success: false,
      message: 'Error al agendar la cita',
      error:
        error.response?.data?.error?.message ||
        error.message
    });
  }
};


module.exports = {
  conexionCalendar,
  callbackApiCalendar,
  consultarDisponibilidad,
  agendarCita
};