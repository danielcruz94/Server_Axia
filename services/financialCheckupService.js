const SCORE_FIELDS = [
  ['liquidity_answer', 'liquidity_score', 'LIQUIDEZ'],
  ['debt_answer', 'debt_score', 'DEUDA'],
  ['protection_answer', 'protection_score', 'PROTECCIÓN'],
  ['investment_answer', 'investment_score', 'INVERSIÓN'],
  ['retirement_answer', 'retirement_score', 'RETIRO']
];

const ANSWER_SCORES = {
  liquidity_answer: {
    'Menos de 1 mes': 0,
    'Entre 1 y 3 meses': 1,
    'Entre 3 y 6 meses': 2,
    'Más de 6 meses': 3
  },
  debt_answer: {
    'Mis deudas limitan mucho mis decisiones financieras': 0,
    'A veces mis obligaciones afectan mis decisiones': 1,
    'Mis deudas son manejables': 2,
    'Prácticamente no tengo deuda o está completamente controlada': 3
  },
  protection_answer: {
    'No': 0,
    'Tengo algunas coberturas, pero no sé si son suficientes': 1,
    'Lo he revisado parcialmente': 2,
    'Sí, lo tengo revisado y actualizado': 3
  },
  investment_answer: {
    'Actualmente no invierto': 0,
    'Ahorro, pero no tengo una estrategia definida': 1,
    'Tengo algunas inversiones, pero no una estrategia integral': 2,
    'Sí, tengo una estrategia estructurada y alineada con mis objetivos': 3
  },
  retirement_answer: {
    'Nunca lo he calculado': 0,
    'Tengo una idea aproximada': 1,
    'Lo he calculado alguna vez, pero no le hago seguimiento': 2,
    'Sí, lo tengo calculado y hago seguimiento': 3
  }
};

const PRINCIPAL_CONCERN_AREAS = {
  INV: 'INVERSIÓN',
  RET: 'RETIRO',
  PRO: 'PROTECCIÓN',
  DEU: 'DEUDA'
};

const INCOME_RANGES = ['I1', 'I2', 'I3', 'I4', 'I5', 'IP'];
const INTENTS = ['BOOKING', 'PROGRAMS', 'LATER'];
const PRINCIPAL_CONCERNS = ['INV', 'RET', 'IMP', 'PRO', 'DEU', 'PAT', 'EXC', 'ORG', 'OTR'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateInput(input) {
  const requiredFields = ['name', 'whatsapp', 'email', 'city', ...Object.keys(ANSWER_SCORES), 'income_range', 'intent'];
  const missingFields = requiredFields.filter((field) => typeof input[field] !== 'string' || !input[field].trim());
  if (missingFields.length) return `Campos requeridos: ${missingFields.join(', ')}`;
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'El email no es válido';
  if (input.principal_concern !== undefined && (!Array.isArray(input.principal_concern) || input.principal_concern.length > 2)) {
    return 'principal_concern debe contener máximo dos elementos';
  }
  if (input.principal_concern?.some((concern) => !PRINCIPAL_CONCERNS.includes(concern))) {
    return 'principal_concern contiene un código inválido';
  }
  if (!INCOME_RANGES.includes(input.income_range)) return 'income_range no es válido';
  if (!INTENTS.includes(input.intent)) return 'intent no es válido';
  if (input.consent_data !== true) return 'El consentimiento de datos es obligatorio';
  if (typeof input.consent_commercial !== 'boolean') return 'consent_commercial debe ser boolean';
  for (const [field, options] of Object.entries(ANSWER_SCORES)) {
    if (!Object.prototype.hasOwnProperty.call(options, input[field])) return `${field} no contiene una opción válida`;
  }
  return null;
}

function calculateScores(answers) {
  return Object.fromEntries(
    SCORE_FIELDS.map(([answerField, scoreField]) => [scoreField, ANSWER_SCORES[answerField][answers[answerField]]])
  );
}

function getGlobalResult(totalScore) {
  if (totalScore <= 5) return 'Hay varias áreas que vale la pena revisar';
  if (totalScore <= 10) return 'Hay oportunidades importantes de optimización';
  return 'Tienes una base financiera sólida que puede seguir optimizándose';
}

function getPriorityAreas(scores, concerns = []) {
  const minimum = Math.min(...SCORE_FIELDS.map(([, scoreField]) => scores[scoreField]));
  const tiedAreas = SCORE_FIELDS
    .filter(([, scoreField]) => scores[scoreField] === minimum)
    .map(([, , area]) => area);

  if (tiedAreas.length <= 1) return tiedAreas;

  const concernArea = concerns.map((concern) => PRINCIPAL_CONCERN_AREAS[concern]).find((area) => tiedAreas.includes(area));
  if (concernArea) return [concernArea];
  return tiedAreas.slice(0, 2);
}

function classifyLead(incomeRange, intent) {
  if (incomeRange === 'I4' || incomeRange === 'I5') return 'A';
  if (incomeRange === 'I3' && intent === 'BOOKING') return 'A';
  if (incomeRange === 'I3') return 'B';
  if (incomeRange === 'I1' || incomeRange === 'I2') {
    return intent === 'LATER' ? 'C' : 'D';
  }
  return intent === 'BOOKING' ? 'C' : 'D';
}

function calculateFinancialResult(input) {
  const scores = calculateScores(input);
  const totalScore = Object.values(scores).reduce((total, score) => total + score, 0);
  const priorityAreas = getPriorityAreas(scores, input.principal_concern);

  return {
    ...scores,
    total_score: totalScore,
    global_result: getGlobalResult(totalScore),
    priority_area: priorityAreas[0],
    priority_areas: priorityAreas,
    lead_classification: classifyLead(input.income_range, input.intent),
    high_value_lead: input.income_range === 'I4' || input.income_range === 'I5'
  };
}

module.exports = {
  ANSWER_SCORES,
  INCOME_RANGES,
  INTENTS,
  PRINCIPAL_CONCERNS,
  calculateFinancialResult,
  validateInput
};
