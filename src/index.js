require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const OdooClient = require('./odoo/odoo-client');

const app = express();
app.use(bodyParser.json());

const odoo = new OdooClient(
    process.env.ODOO_URL,
    process.env.ODOO_DB,
    process.env.ODOO_USERNAME,
    process.env.ODOO_PASSWORD
);

const PORT = process.env.PORT || 3000;

// --- Webhook: Clients ---

// Búsqueda de clientes por nombre o teléfono
app.post('/webhook/clients/search', async (req, res) => {
    try {
        const { query } = req.body;
        const domain = ['|', ['name', 'ilike', query], ['phone', 'ilike', query]];
        const clients = await odoo.searchRead('res.partner', domain, ['id', 'name', 'email', 'phone']);
        res.json({ success: true, data: clients });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creación de clientes
app.post('/webhook/clients/create', async (req, res) => {
    try {
        const { name, phone, email, street, city, zip } = req.body;
        const clientId = await odoo.create('res.partner', {
            name,
            phone,
            email,
            street,
            city,
            zip
        });
        res.json({ success: true, id: clientId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Webhook: Products ---

// Búsqueda de productos por descripción o SKU
app.post('/webhook/products/search', async (req, res) => {
    try {
        const { query } = req.body;
        const domain = ['|', ['name', 'ilike', query], ['default_code', 'ilike', query]];
        const products = await odoo.searchRead('product.product', domain, ['id', 'name', 'default_code', 'list_price']);
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Webhook: Orders ---

// Creación de pedidos
app.post('/webhook/orders/create', async (req, res) => {
    try {
        const { partner_id, products, street, city, zip, confirm } = req.body;

        // Si se envían datos de dirección, actualizamos el partner primero
        if (street || city || zip) {
            const updateData = {};
            if (street) updateData.street = street;
            if (city) updateData.city = city;
            if (zip) updateData.zip = zip;
            await odoo.write('res.partner', [partner_id], updateData);
        }

        const orderLine = products.map(p => [0, 0, {
            product_id: p.product_id,
            product_uom_qty: p.quantity
        }]);

        const orderId = await odoo.create('sale.order', {
            partner_id: partner_id,
            order_line: orderLine
        });

        // Si se solicita confirmación inmediata
        if (confirm === true) {
            await odoo.execute('sale.order', 'action_confirm', [[orderId]]);
        }

        res.json({ success: true, id: orderId, confirmed: confirm || false });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Confirmar pedido (manual)
app.post('/webhook/orders/confirm', async (req, res) => {
    try {
        const { order_id } = req.body;
        await odoo.execute('sale.order', 'action_confirm', [[order_id]]);
        res.json({ success: true, message: 'Order confirmed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Actualizar pedido tras pago (Confirmar orden y Facturar)
app.post('/webhook/orders/update-payment', async (req, res) => {
    try {
        const { order_id, payment_status } = req.body;

        if (payment_status === 'paid') {
            // 1. Obtener estado actual de la orden
            const [order] = await odoo.searchRead('sale.order', [['id', '=', order_id]], ['state', 'invoice_status']);

            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }

            // 2. Confirmar si está en borrador
            if (['draft', 'sent'].includes(order.state)) {
                await odoo.execute('sale.order', 'action_confirm', [[order_id]]);
            }

            // 3. Crear Factura (si no existe una ya)
            // En Odoo, action_create_invoices crea las facturas basadas en la configuración de la orden
            const invoiceIds = await odoo.execute('sale.order', '_create_invoices', [[order_id]]);

            if (invoiceIds && invoiceIds.length > 0) {
                // 4. Validar/Publicar la factura (action_post)
                await odoo.execute('account.move', 'action_post', [invoiceIds]);
                res.json({
                    success: true,
                    message: 'Order confirmed and Invoice created/posted',
                    invoice_ids: invoiceIds
                });
            } else {
                res.json({
                    success: true,
                    message: 'Order confirmed (Invoice might already exist or not required)',
                    order_state: 'confirmed'
                });
            }
        } else {
            res.json({ success: false, message: 'Payment not completed' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Test Connection ---
app.get('/test-connection', async (req, res) => {
    try {
        const uid = await odoo.authenticate();
        res.json({ success: true, uid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Odoo Hub running locally on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
