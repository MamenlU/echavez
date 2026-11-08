const HIGH_RISK_PATTERNS = [
  /\brefund\b/i,
  /\bpayment dispute\b/i,
  /\bchargeback\b/i,
  /\bfraud\b/i,
  /\bunauthori[sz]ed (?:payment|charge)\b/i,
  /\bcharged (?:twice|double)\b/i,
  /\bdamaged\b/i,
  /\bmissing (?:item|items|order|product)\b/i,
  /\bcomplaint\b/i,
  /\bcancel (?:my )?(?:paid|completed) order\b/i,
  /\baccount (?:security|hacked|compromised|locked)\b/i,
  /\bchange (?:the )?(?:price|inventory|stock|delivery rate)\b/i,
  /\bapprove (?:my|the) order\b/i,
  /\breject (?:my|the) order\b/i,
  /\bmark (?:it|this|my order|my payment|the payment|payment) (?:as )?paid\b/i,
];

const PROHIBITED_ACTION_PATTERNS = [
  /\bapprove\b/i,
  /\breject\b/i,
  /\brefund\b/i,
  /\bchange (?:order )?status\b/i,
  /\bmodify (?:stock|inventory|price|delivery rate)\b/i,
  /\bdeduct stock\b/i,
  /\breceive stock\b/i,
];

export function classifyCustomerAiRequest(message) {
  const text = String(message || '').trim();
  const highRisk = HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text));
  const asksProhibitedAction = PROHIBITED_ACTION_PATTERNS.some((pattern) => pattern.test(text));

  return {
    highRisk: highRisk || asksProhibitedAction,
    asksProhibitedAction,
    reason: highRisk || asksProhibitedAction ? 'admin_assistance_required' : null,
  };
}
