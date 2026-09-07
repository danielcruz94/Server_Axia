const assert = require('node:assert/strict');
const test = require('node:test');

const { calculateFinancialResult, validateInput } = require('../services/financialCheckupService');

const validInput = {
  name: 'Laura Pérez',
  whatsapp: '3001234567',
  email: 'laura@example.com',
  city: 'Bogotá',
  liquidity_answer: 'Entre 3 y 6 meses',
  debt_answer: 'Mis deudas son manejables',
  protection_answer: 'Lo he revisado parcialmente',
  investment_answer: 'Ahorro, pero no tengo una estrategia definida',
  retirement_answer: 'Tengo una idea aproximada',
  principal_concern: ['RET'],
  income_range: 'I4',
  intent: 'BOOKING',
  consent_data: true,
  consent_commercial: false
};

test('calcula scores, total y resultado global en backend', () => {
  const result = calculateFinancialResult(validInput);
  assert.deepEqual(
    [result.liquidity_score, result.debt_score, result.protection_score, result.investment_score, result.retirement_score],
    [2, 2, 2, 1, 1]
  );
  assert.equal(result.total_score, 8);
  assert.equal(result.global_result, 'Hay oportunidades importantes de optimización');
});

test('resuelve el área prioritaria usando principal_concern', () => {
  const result = calculateFinancialResult({
    ...validInput,
    principal_concern: ['RET', 'INV'],
    income_range: 'I3',
    intent: 'PROGRAMS'
  });
  assert.equal(result.priority_area, 'RETIRO');
  assert.deepEqual(result.priority_areas, ['RETIRO']);
});

test('clasifica y marca high value sin depender de booking', () => {
  const result = calculateFinancialResult({ ...validInput, income_range: 'I5', intent: 'LATER' });
  assert.equal(result.lead_classification, 'A');
  assert.equal(result.high_value_lead, true);
});

test('rechaza consentimiento de datos, respuestas inválidas y scores enviados', () => {
  assert.match(validateInput({ ...validInput, consent_data: false }), /consentimiento/);
  assert.match(validateInput({ ...validInput, liquidity_answer: '0', liquidity_score: 3 }), /liquidity_answer/);
  assert.equal(validateInput({ ...validInput, total_score: 0 }), null);
});
