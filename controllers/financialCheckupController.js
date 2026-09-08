const FinancialCheckup = require('../models/FinancialCheckup');
const {
  ANSWER_SCORES,
  calculateFinancialResult,
  validateInput
} = require('../services/financialCheckupService');

const createFinancialCheckup = async (req, res) => {
  const input = req.body || {};
  const validationError = validateInput(input);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const result = calculateFinancialResult(input);
  const checkup = new FinancialCheckup({
    name: input.name.trim(),
    whatsapp: input.whatsapp.trim(),
    email: input.email.trim(),
    city: input.city.trim(),
    liquidity_answer: input.liquidity_answer,
    debt_answer: input.debt_answer,
    protection_answer: input.protection_answer,
    investment_answer: input.investment_answer,
    retirement_answer: input.retirement_answer,
    principal_concern: input.principal_concern || [],
    income_range: input.income_range,
    intent: input.intent,
    consent_data: input.consent_data,
    consent_commercial: input.consent_commercial,
    ...result
  });

  try {
    await checkup.save();
  } catch (error) {
    console.error('Error al guardar el test financiero:', error.message);
    return res.status(500).json({ success: false, message: 'No fue posible guardar el test financiero' });
  }

  return res.status(201).json({
    success: true,
    data: {
      total_score: result.total_score,
      global_result: result.global_result,
      priority_area: result.priority_area,
      priority_areas: result.priority_areas,
      scores: {
        liquidity: result.liquidity_score,
        debt: result.debt_score,
        protection: result.protection_score,
        investment: result.investment_score,
        retirement: result.retirement_score
      }
    }
  });
};

module.exports = { createFinancialCheckup };
