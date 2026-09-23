const { google } = require('googleapis');

require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const CALENDAR_ENV_VARS = {
  AMANDA: 'GOOGLE_CALENDAR_ID_AMANDA',
  ANDREA: 'GOOGLE_CALENDAR_ID_ANDREA',
  NICOLAS: 'GOOGLE_CALENDAR_ID_NICOLAS',
  LAURA: 'GOOGLE_CALENDAR_ID_LAURA',
  CARLOS: 'GOOGLE_CALENDAR_ID_CARLOS'
};

const ORACLE_SCHEDULE = {
  '2026-09-30': ['AMANDA', 'ANDREA', 'NICOLAS'],
  '2026-10-01': ['LAURA', 'CARLOS']
};

const HORA_INICIO = '09:00';
const HORA_FIN = '16:00';
const DURACION_MINUTOS = 60;
const ALMUERZO_INICIO = 13 * 60;
const ALMUERZO_FIN = 14 * 60;

const convertirHoraAMinutos = (hora) => {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
};

const obtenerConfiguracionCalendario = (calendarKey, date) => {
  const normalizedKey = String(calendarKey || '').toUpperCase();
  const envVar = CALENDAR_ENV_VARS[normalizedKey];
  const calendarsForDate = ORACLE_SCHEDULE[date] || [];

  return {
    calendarKey: normalizedKey,
    calendarId: envVar ? process.env[envVar] : null,
    envVar,
    disponible: calendarsForDate.includes(normalizedKey)
  };
};

const obtenerHorarioLaboral = (date, calendarKey) => {
  const calendarConfig = obtenerConfiguracionCalendario(calendarKey, date);

  if (!calendarConfig.disponible) {
    return null;
  }

  return {
    horaInicio: HORA_INICIO,
    horaFin: HORA_FIN,
    durationMinutes: DURACION_MINUTOS
  };
};

const generarSlotsDisponibles = (busy, fecha, horaInicio, horaFin) => {
  const slots = [];
  const ocupados = busy.map((evento) => ({
    start: new Date(evento.start).getTime(),
    end: new Date(evento.end).getTime()
  }));
  const inicio = convertirHoraAMinutos(horaInicio);
  const fin = convertirHoraAMinutos(horaFin);

  for (let minutos = inicio; minutos + DURACION_MINUTOS <= fin; minutos += DURACION_MINUTOS) {
    const startTime = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    const endMinutes = minutos + DURACION_MINUTOS;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    const start = new Date(`${fecha}T${startTime}:00-05:00`).getTime();
    const end = new Date(`${fecha}T${endTime}:00-05:00`).getTime();
    const esHorarioDeAlmuerzo = minutos < ALMUERZO_FIN && endMinutes > ALMUERZO_INICIO;

    if (!esHorarioDeAlmuerzo && !ocupados.some((evento) => start < evento.end && end > evento.start)) {
      slots.push({ start: startTime, end: endTime });
    }
  }

  return slots;
};

const obtenerCalendarioGoogle = () => google.calendar({
  version: 'v3',
  auth: oauth2Client
});

const validarSolicitud = (calendarKey, date) => {
  const calendarConfig = obtenerConfiguracionCalendario(calendarKey, date);

  if (!calendarConfig.envVar) {
    return { error: 'calendar debe ser AMANDA, ANDREA, NICOLAS, LAURA o CARLOS' };
  }

  if (!calendarConfig.disponible) {
    return { error: 'No hay disponibilidad para ese calendario en esa fecha' };
  }

  if (!calendarConfig.calendarId) {
    return { error: `${calendarConfig.envVar} no está configurado` };
  }

  return { calendarConfig };
};

const conexionCalendar = async (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent'
    });
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ message: 'Error al conectar a Google Calendar', error: error.message });
  }
};

const callbackApiCalendar = async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    res.status(200).json({
      message: 'Google Calendar conectado correctamente',
      hasRefreshToken: !!tokens.refresh_token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al conectar Google Calendar', error: error.message });
  }
};

const consultarDisponibilidad = async (req, res) => {
  try {
    const { date, calendar: calendarKey } = req.query;
    const calendarsForDate = ORACLE_SCHEDULE[date] || [];

    if (calendarsForDate.length === 0) {
      return res.status(200).json({
        success: true,
        date,
        durationMinutes: DURACION_MINUTOS,
        calendars: {}
      });
    }

    const calendarKeys = calendarKey
      ? [calendarKey.toUpperCase()]
      : calendarsForDate;
    const calendarConfigs = calendarKeys.map((key) => obtenerConfiguracionCalendario(key, date));
    const invalidConfig = calendarConfigs.find((config) => !config.envVar || !config.disponible || !config.calendarId);

    if (invalidConfig) {
      return res.status(400).json({
        success: false,
        message: `${invalidConfig.calendarKey || calendarKey} no está disponible o configurado para esa fecha`
      });
    }

    const calendar = obtenerCalendarioGoogle();
    const timeMin = `${date}T${HORA_INICIO}:00-05:00`;
    const timeMax = `${date}T${HORA_FIN}:00-05:00`;
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'America/Bogota',
        items: calendarConfigs.map((config) => ({ id: config.calendarId }))
      }
    });
    const calendars = Object.fromEntries(calendarConfigs.map((config) => {
      const busy = response.data.calendars[config.calendarId]?.busy || [];

      return [config.calendarKey, {
        calendarId: config.calendarId,
        slots: generarSlotsDisponibles(busy, date, HORA_INICIO, HORA_FIN)
      }];
    }));

    return res.status(200).json({
      success: true,
      date,
      durationMinutes: DURACION_MINUTOS,
      calendars
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error consultando disponibilidad', error: error.message });
  }
};

const agendarCita = async (req, res) => {
  try {
    const { name, email, date, startTime, calendar: calendarKey } = req.body;
    if (!name || !email || !date || !startTime || !calendarKey) {
      return res.status(400).json({ success: false, message: 'name, email, date, startTime y calendar son obligatorios' });
    }

    const validation = validarSolicitud(calendarKey, date);
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const { calendarConfig } = validation;
    const startMinutes = convertirHoraAMinutos(startTime);
    const endMinutes = startMinutes + DURACION_MINUTOS;
    const esHorarioDeAlmuerzo = startMinutes < ALMUERZO_FIN && endMinutes > ALMUERZO_INICIO;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || startMinutes < 540 || endMinutes > 960 || esHorarioDeAlmuerzo) {
      return res.status(400).json({ success: false, message: 'Las citas Oracle son de 1 hora entre las 09:00 y las 16:00, excepto de 13:00 a 14:00' });
    }

    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    const startDateTime = `${date}T${startTime}:00-05:00`;
    const endDateTime = `${date}T${endTime}:00-05:00`;
    const calendar = obtenerCalendarioGoogle();
    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime,
        timeMax: endDateTime,
        timeZone: 'America/Bogota',
        items: [{ id: calendarConfig.calendarId }]
      }
    });
    const busy = freeBusyResponse.data.calendars[calendarConfig.calendarId]?.busy || [];
    if (busy.length > 0) {
      return res.status(409).json({ success: false, message: 'El horario seleccionado ya no está disponible' });
    }

    const response = await calendar.events.insert({
      calendarId: calendarConfig.calendarId,
      resource: {
        summary: `Reunión con ${name}`,
        description: `Cita Oracle. Cliente: ${name}. Correo: ${email}`,
        start: { dateTime: startDateTime, timeZone: 'America/Bogota' },
        end: { dateTime: endDateTime, timeZone: 'America/Bogota' },
        attendees: [{ email }]
      },
      sendUpdates: 'all'
    });

    return res.status(201).json({
      success: true,
      message: 'Cita Oracle agendada correctamente',
      appointment: { id: response.data.id, name, email, date, startTime, endTime, calendar: calendarConfig.calendarKey, durationMinutes: DURACION_MINUTOS, calendarLink: response.data.htmlLink }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al agendar la cita Oracle', error: error.message });
  }
};

module.exports = {
  conexionCalendar,
  callbackApiCalendar,
  consultarDisponibilidad,
  agendarCita,
  obtenerHorarioLaboral,
  generarSlotsDisponibles,
  convertirHoraAMinutos
};