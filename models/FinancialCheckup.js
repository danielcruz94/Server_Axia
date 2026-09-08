const { Schema, model } = require('mongoose');

const FinancialCheckupSchema = new Schema({
  name: { type: String, required: true, trim: true },
  whatsapp: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  city: { type: String, required: true, trim: true },
  source: { type: String, required: true, immutable: true, default: 'ACN_CONGRESO_MED_SEP26' },
  liquidity_answer: { type: String, required: true },
  debt_answer: { type: String, required: true },
  protection_answer: { type: String, required: true },
  investment_answer: { type: String, required: true },
  retirement_answer: { type: String, required: true },
  liquidity_score: { type: Number, required: true, min: 0, max: 3 },
  debt_score: { type: Number, required: true, min: 0, max: 3 },
  protection_score: { type: Number, required: true, min: 0, max: 3 },
  investment_score: { type: Number, required: true, min: 0, max: 3 },
  retirement_score: { type: Number, required: true, min: 0, max: 3 },
  total_score: { type: Number, required: true, min: 0, max: 15 },
  global_result: { type: String, required: true },
  priority_area: { type: String, required: true },
  priority_areas: { type: [String], required: true },
  principal_concern: { type: [String], required: true, default: [] },
  income_range: { type: String, required: true, enum: ['I1', 'I2', 'I3', 'I4', 'I5', 'IP'] },
  intent: { type: String, required: true, enum: ['BOOKING', 'PROGRAMS', 'LATER'] },
  lead_classification: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
  high_value_lead: { type: Boolean, required: true },
  consent_data: { type: Boolean, required: true },
  consent_commercial: { type: Boolean, required: true },
  booked: { type: Boolean, default: false },
  appointment_date: { type: Date, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

FinancialCheckupSchema.index({ email: 1 });

module.exports = model('FinancialCheckup', FinancialCheckupSchema);
