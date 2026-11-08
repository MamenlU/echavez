import express from 'express';
import { randomUUID } from 'node:crypto';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { createMessageService, MessagingError } from '../lib/messageService.js';
import { buildAdminConversationContext, buildCustomerAiContext } from '../lib/aiContext.js';
import { classifyCustomerAiRequest } from '../lib/aiSafety.js';
import { AiUnavailableError, generateAiText, getAiConfiguration } from '../lib/aiProvider.js';

const CUSTOMER_INPUT_LIMIT = 800;
const requestWindows = new Map();

function rateLimit(actorId) {
  const now = Date.now();
  const key = Number(actorId);
  const existing = requestWindows.get(key) || [];
  const recent = existing.filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 8) return false;
  recent.push(now);
  requestWindows.set(key, recent);
  return true;
}

function cleanInput(value) {
  const text = String(value || '').trim();
  if (!text) throw Object.assign(new Error('Message is required.'), { status: 400 });
  if (text.length > CUSTOMER_INPUT_LIMIT) {
    throw Object.assign(new Error(`Message cannot exceed ${CUSTOMER_INPUT_LIMIT} characters.`), { status: 400 });
  }
  return text;
}

function sendError(res, error) {
  if (error instanceof AiUnavailableError) {
    return res.status(503).json({
      error: 'Rayjin Assistant is temporarily unavailable. You can still contact Rayjin Hardware Admin.',
      code: 'AI_UNAVAILABLE',
      handoffAvailable: true,
    });
  }
  if (error instanceof MessagingError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  if (error?.status) return res.status(error.status).json({ error: error.message });
  console.error('AI route error:', error?.code || error?.name || 'Error');
  return res.status(500).json({ error: 'Unable to process the AI request.' });
}

const CUSTOMER_INSTRUCTIONS = `You are Rayjin Assistant, the clearly identified AI-powered information assistant for Rayjin Hardware.
Use only the VERIFIED CONTEXT supplied by the Rayjin backend. Never invent prices, stock, order status, payment state, schedules, delivery coverage, or policies.
You are read-only with respect to business operations. Never claim that you approved, rejected, cancelled, paid, refunded, completed, received stock, changed inventory, changed a price, changed a delivery rate, or performed any other transaction.
Only discuss the authenticated customer's own order data included in context. Never infer or expose another customer's information.
If the verified context does not answer the question, say that you are not certain and direct the customer to Rayjin Hardware Admin.
Respect fulfillment restrictions: Delivery-only products cannot be offered for Pickup or Shop & Go.
Keep answers concise, helpful, natural, and easy for a hardware-store customer to understand. Use Philippine peso formatting when mentioning prices.`;

const ADMIN_SUMMARY_INSTRUCTIONS = `You are the Rayjin Hardware Admin AI assistant. Summarize only the supplied verified conversation and order context. Do not fabricate facts or actions. Return a concise operational summary with: Main concern, Relevant order/payment/fulfillment facts (only when present), Unresolved question, and Suggested Admin attention. Do not make business decisions for the Admin.`;

const ADMIN_REPLY_INSTRUCTIONS = `You are the Rayjin Hardware Admin AI assistant. Draft one concise, professional, editable reply based only on the supplied verified conversation and order context. Never claim an action was completed unless the context proves it. Never promise refunds, approvals, cancellations, payment verification, stock changes, or other administrative actions. If a human decision is required, say the Admin will review it. Return only the proposed reply text, not commentary.`;

export function createAiRouter({ database = pool } = {}) {
  const router = express.Router();
  const messages = createMessageService(database);

  router.use(authenticateToken);

  router.get('/status', (req, res) => {
    const config = getAiConfiguration();
    res.json({
      enabled: config.enabled && config.hasApiKey && config.provider === 'openai',
      provider: config.provider,
      model: config.model,
      autoReplyEnabled: false,
      role: req.user.role,
    });
  });

  router.post('/customer-assistant', async (req, res) => {
    try {
      if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Customer access required.' });
      }
      if (!rateLimit(req.user.id)) {
        return res.status(429).json({ error: 'Please wait a moment before asking Rayjin Assistant again.' });
      }

      const message = cleanInput(req.body?.message);
      const conversationId = req.body?.conversationId ? Number(req.body.conversationId) : null;
      const classification = classifyCustomerAiRequest(message);

      if (classification.highRisk) {
        const handoffMessage = 'This concern needs assistance from Rayjin Hardware Admin. I can provide general information, but an Admin should review this matter directly.';
        if (Number.isInteger(conversationId) && conversationId > 0) {
          await messages.sendAssistantExchange(req.user, conversationId, {
            question: message,
            answer: handoffMessage,
            exchangeId: randomUUID(),
            handoff: true,
          });
        }
        return res.json({
          assistant: handoffMessage,
          handoffRequired: true,
          reason: classification.reason,
        });
      }

      const context = await buildCustomerAiContext(database, req.user, message);
      const result = await generateAiText({
        instructions: CUSTOMER_INSTRUCTIONS,
        input: `CUSTOMER QUESTION:\n${message}\n\nVERIFIED CONTEXT:\n${JSON.stringify(context, null, 2)}`,
        maxOutputTokens: 420,
      });

      if (Number.isInteger(conversationId) && conversationId > 0) {
        await messages.sendAssistantExchange(req.user, conversationId, {
          question: message,
          answer: result.text,
          exchangeId: randomUUID(),
          handoff: false,
        });
      }

      return res.json({
        assistant: result.text,
        handoffRequired: false,
        model: result.model,
      });
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.post('/admin/conversations/:id/summary', async (req, res) => {
    try {
      if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ error: 'Admin access required.' });
      if (!rateLimit(req.user.id)) return res.status(429).json({ error: 'Please wait a moment before using AI again.' });
      const detail = await messages.getConversation(req.user, req.params.id);
      const context = await buildAdminConversationContext(database, detail);
      const result = await generateAiText({
        instructions: ADMIN_SUMMARY_INSTRUCTIONS,
        input: `VERIFIED CONTEXT:\n${JSON.stringify(context, null, 2)}`,
        maxOutputTokens: 420,
      });
      res.json({ summary: result.text, model: result.model });
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.post('/admin/conversations/:id/suggest-reply', async (req, res) => {
    try {
      if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ error: 'Admin access required.' });
      if (!rateLimit(req.user.id)) return res.status(429).json({ error: 'Please wait a moment before using AI again.' });
      const detail = await messages.getConversation(req.user, req.params.id);
      const context = await buildAdminConversationContext(database, detail);
      const result = await generateAiText({
        instructions: ADMIN_REPLY_INSTRUCTIONS,
        input: `VERIFIED CONTEXT:\n${JSON.stringify(context, null, 2)}`,
        maxOutputTokens: 300,
      });
      res.json({ suggestedReply: result.text, model: result.model });
    } catch (error) {
      return sendError(res, error);
    }
  });

  return router;
}

export default createAiRouter();
