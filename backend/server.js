import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import paymongoRoutes from './routes/paymongo.js';
import categoriesRoutes from './routes/categories.js';
import suppliersRoutes from './routes/suppliers.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import customersRoutes from './routes/customers.js';
import messagesRoutes from './routes/messages.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import auditLogsRoutes from './routes/auditLogs.js';
import saleAdjustmentsRoutes from './routes/saleAdjustments.js';
import purchaseOrdersRoutes from './routes/purchaseOrders.js';
import reorderSuggestionsRoutes from './routes/reorderSuggestions.js';
import cashierShiftsRoutes from './routes/cashierShifts.js';
import expensesRoutes from './routes/expenses.js';

dotenv.config();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the local dev server AND any Vercel deployment URL
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, same-origin serverless)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static uploads — local dev only (Vercel has a read-only filesystem)
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/uploads', express.static('uploads'));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/paymongo', paymongoRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/sale-adjustments', saleAdjustmentsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/reorder-suggestions', reorderSuggestionsRoutes);
app.use('/api/cashier-shifts', cashierShiftsRoutes);
app.use('/api/expenses', expensesRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running', env: process.env.NODE_ENV });
});

// ── Start server (local dev only) ─────────────────────────────────────────────
// On Vercel, the module is imported as a serverless function — no listen() needed
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel serverless runtime
export default app;
