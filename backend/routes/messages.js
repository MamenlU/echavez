import express from 'express';
import pool from '../db.js';
import { authenticateToken, denyCashierRole, createCurrentAccountGuard } from '../middleware/auth.js';
import {
    createMessageService,
    MessagingError,
    messagingLimits,
} from '../lib/messageService.js';

function sendMessagingError(res, error) {
    if (error instanceof MessagingError) {
        return res.status(error.status).json({
            error: error.message,
            code: error.code,
        });
    }

    console.error('Messages API error:', error);
    return res.status(500).json({
        error: 'Unable to process the messaging request.',
    });
}

export function createMessagesRouter({ database = pool, service = null } = {}) {
    const router = express.Router();
    const messages = service || createMessageService(database);

    router.use(authenticateToken, createCurrentAccountGuard(database), denyCashierRole);

    router.get('/conversations', async (req, res) => {
        try {
            const conversations = await messages.listConversations(req.user, {
                conversationType: req.query.type || null,
            });

            res.json({ conversations });
        } catch (error) {
            sendMessagingError(res, error);
        }
    });

    router.get('/unread-count', async (req, res) => {
        try {
            const unreadCount = await messages.unreadCount(req.user);
            res.json({ unreadCount });
        } catch (error) {
            sendMessagingError(res, error);
        }
    });

    router.post('/conversations', async (req, res) => {
        try {
            const result = await messages.createConversation(req.user, req.body || {});
            res.status(201).json(result);
        } catch (error) {
            sendMessagingError(res, error);
        }
    });

    router.get('/conversations/:id', async (req, res) => {
        try {
            const result = await messages.getConversation(req.user, req.params.id);
            res.json(result);
        } catch (error) {
            sendMessagingError(res, error);
        }
    });

    router.post('/conversations/:id/messages', async (req, res) => {
        try {
            const result = await messages.sendMessage(
                req.user,
                req.params.id,
                req.body?.message
            );

            res.status(201).json(result);
        } catch (error) {
            sendMessagingError(res, error);
        }
    });

    router.put('/conversations/:id/read', async (req, res) => {
        try {
            const result = await messages.markRead(req.user, req.params.id);
            res.json(result);
        } catch (error) {
            sendMessagingError(res, error);
        }
    });

    router.get('/meta/limits', (_req, res) => {
        res.json(messagingLimits);
    });

    return router;
}

export default createMessagesRouter();
