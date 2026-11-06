// Read-only smoke check for the production Messages SQL against the actual DB.
// This script does not create conversations, send messages, mark messages read,
// or modify existing Rayjin Hardware data.
import pool from '../db.js';
import { createMessageService, MessagingError } from '../lib/messageService.js';

const messages = createMessageService(pool);

try {
    const [[admin]] = await pool.query(
        `SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`
    );
    const [[sampleConversation]] = await pool.query(
        `SELECT conversation_id, customer_id
         FROM conversations
         ORDER BY conversation_id ASC
         LIMIT 1`
    );

    if (!admin) {
        throw new Error('No Admin user is available for the read-only messaging smoke check.');
    }

    if (!sampleConversation) {
        throw new Error('No conversation is available for the read-only messaging smoke check.');
    }

    const adminActor = { id: Number(admin.id), role: 'admin' };
    const customerActor = {
        id: Number(sampleConversation.customer_id),
        role: 'customer',
    };

    const adminList = await messages.listConversations(adminActor);
    const adminUnread = await messages.unreadCount(adminActor);
    const adminDetail = await messages.getConversation(
        adminActor,
        sampleConversation.conversation_id
    );

    const customerList = await messages.listConversations(customerActor);
    const customerUnread = await messages.unreadCount(customerActor);
    const customerDetail = await messages.getConversation(
        customerActor,
        sampleConversation.conversation_id
    );

    const [[foreignConversation]] = await pool.query(
        `SELECT conversation_id
         FROM conversations
         WHERE customer_id <> ?
         ORDER BY conversation_id ASC
         LIMIT 1`,
        [customerActor.id]
    );

    let crossCustomerProtection = 'not-applicable';

    if (foreignConversation) {
        try {
            await messages.getConversation(
                customerActor,
                foreignConversation.conversation_id
            );
            crossCustomerProtection = 'FAILED';
        } catch (error) {
            crossCustomerProtection =
                error instanceof MessagingError && error.status === 404
                    ? 'passed'
                    : 'FAILED';
        }
    }

    if (crossCustomerProtection === 'FAILED') {
        throw new Error('Cross-customer conversation protection failed.');
    }

    console.log('Read-only Messages backend smoke check passed.');
    console.log(`Admin conversations visible: ${adminList.length}`);
    console.log(`Admin unread customer messages: ${adminUnread}`);
    console.log(`Sample Admin conversation messages: ${adminDetail.messages.length}`);
    console.log(`Sample Customer conversations visible: ${customerList.length}`);
    console.log(`Sample Customer unread Admin/System messages: ${customerUnread}`);
    console.log(`Sample Customer conversation messages: ${customerDetail.messages.length}`);
    console.log(`Cross-customer access protection: ${crossCustomerProtection}`);
} catch (error) {
    console.error('Messages backend smoke check failed:', error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
