const express = require('express');
const supabase = require('../lib/supabase');
const router = express.Router();

// --- Webhook: Payments ---

// Receive payment data
router.post('/webhook/payment', async (req, res) => {
    try {
        const payload = req.body;

        // Extract key fields for structured storage
        // Using optional chaining to be safe, defaulting to null if missing
        // User requested to use checkout.id as the primary identifier
        const paymentId = payload.checkout ? payload.checkout.id : payload.id;
        const amountInCents = payload.amount_in_cents;
        const currency = payload.currency;
        const eventType = payload.event_type;
        const status = payload.checkout ? payload.checkout.status : null;

        if (!paymentId) {
            return res.status(400).json({ success: false, error: 'Missing checkout ID in payload' });
        }

        const { error } = await supabase
            .from('webhook_payments')
            .upsert({
                id: paymentId,
                amount_in_cents: amountInCents,
                currency: currency,
                status: status,
                event_type: eventType,
                payload: payload
            });

        if (error) {
            throw error;
        }

        res.json({ success: true, message: 'Payment recorded' });
    } catch (error) {
        console.error('Error saving payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Retrieve payment data by ID
router.get('/api/payment/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('webhook_payments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ success: false, error: 'Payment not found or error retrieving' });
        }

        res.json({ success: true, data: data.payload });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
