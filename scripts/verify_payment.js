const http = require('http');

// Payload provided by user
const payload = {
    "amount_in_cents": 1000,
    "api_version": "2024-04-24",
    "checkout": {
        "cancel_url": null,
        "created_at": "2026-01-27T10:29:40.417-06:00",
        "currency": "GTQ",
        "expires_at": null,
        "id": "ch_r6wjdigrt0jzyzcw",
        "latest_intent": {
            "created_at": "2026-01-27T10:30:32.622-06:00",
            "data": {
                "auth_code": "159777"
            },
            "id": "pa_hl6jmewm",
            "type": "PaymentIntent"
        },
        "live_mode": true,
        "metadata": {},
        "payment": {
            "id": "pa_g54qlpg1",
            "paymentable": {
                "address": null,
                "id": "on_q0j4p1zd",
                "phone_number": null,
                "tax_id": "30859301",
                "tax_name": null,
                "type": "OneTimePayment"
            }
        },
        "payment_method": {
            "card": {
                "expiration_month": "02",
                "expiration_year": 2026,
                "issuer_name": "Banco Industrial",
                "last4": "4217",
                "network": "visa"
            },
            "id": "pay_m_7o9jhpsbyrj6wqyi",
            "type": "card"
        },
        "status": "paid",
        "success_url": null,
        "total_in_cents": 1000,
        "transfer_setups": []
    },
    "created_at": "2026-01-27T10:30:32.620-06:00",
    "currency": "GTQ",
    "customer": {
        "email": "kgomez@aumenta.do",
        "full_name": "Ken",
        "id": "cus_opyo3dtr"
    },
    "customer_id": "cus_opyo3dtr",
    "event_type": "payment_intent.succeeded",
    "failure_reason": null,
    "fee": 246,
    "id": "pa_hl6jmewm",
    "payment": {
        "id": "pa_g54qlpg1",
        "paymentable": {
            "address": null,
            "id": "on_q0j4p1zd",
            "phone_number": null,
            "tax_id": "30859301",
            "tax_name": null,
            "type": "OneTimePayment"
        }
    },
    "product": {
        "id": "pay_xeupvkc3"
    },
    "products": [
        {
            "address_requirement": "none",
            "billing_info_requirement": "optional",
            "cancel_url": null,
            "custom_terms_and_conditions": "",
            "description": "",
            "has_dynamic_pricing": false,
            "id": "pay_xeupvkc3",
            "metadata": {},
            "name": "Invisible Product",
            "phone_requirement": "none",
            "prices": [
                {
                    "amount_in_cents": 1000,
                    "billing_interval": "",
                    "billing_interval_count": 0,
                    "charge_type": "one_time",
                    "currency": "GTQ",
                    "free_trial_interval": "",
                    "free_trial_interval_count": 0,
                    "id": "price_jzbfyn0s",
                    "periods_before_automatic_cancellation": null
                }
            ],
            "quantity": 1,
            "status": "active",
            "storefront_link": "https://app.recurrente.com/s/cappucino-restaurante-cafe/pay_xeupvkc3",
            "success_url": null
        }
    ],
    "tax_invoice_url": null,
    "used_presaved_payment_method": false,
    "user_id": "us_wasn6rs1",
    "vat_withheld": 17,
    "vat_withheld_currency": "GTQ"
};

const PAYMENT_ID = payload.checkout.id; // ch_r6wjdigrt0jzyzcw (was pa_hl6jmewm)

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3500,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTest() {
    console.log('--- Starting Verification Test ---');

    try {
        // 1. Send the Webhook
        console.log(`\n1. Sending Webhook POST to /webhook/payment...`);
        const postRes = await request('POST', '/webhook/payment', payload);
        console.log(`Response: ${postRes.status}`, postRes.body);

        if (postRes.status !== 200 || !postRes.body.success) {
            console.error('FAILED: Webhook POST failed.');
            process.exit(1);
        }

        // 2. Retrieve the Payment
        console.log(`\n2. Retrieving Payment GET from /api/payment/${PAYMENT_ID}...`);
        const getRes = await request('GET', `/api/payment/${PAYMENT_ID}`);
        console.log(`Response: ${getRes.status}`, JSON.stringify(getRes.body, null, 2));

        if (getRes.status !== 200 || !getRes.body.success) {
            console.error('FAILED: API GET failed.');
            process.exit(1);
        }

        if (getRes.body.data.checkout.id === PAYMENT_ID) {
            console.log('\nSUCCESS: Retrieved payment matches injected payment.');
        } else {
            console.error('\nFAILED: Retrieved payment ID does not match.');
            console.error(`Expected: ${PAYMENT_ID}, Got: ${getRes.body.data.checkout.id}`);
            process.exit(1);
        }

        // 3. Check Payment Status
        console.log(`\n3. Checking Payment Status GET from /api/payment/${PAYMENT_ID}/status...`);
        const statusRes = await request('GET', `/api/payment/${PAYMENT_ID}/status`);
        console.log(`Response: ${statusRes.status}`, JSON.stringify(statusRes.body, null, 2));

        if (statusRes.status !== 200 || !statusRes.body.success) {
            console.error('FAILED: Status API failed.');
            process.exit(1);
        }

        if (statusRes.body.paid === true) {
            console.log('\nSUCCESS: Payment status is PAID.');
        } else {
            console.error('\nFAILED: Payment status is NOT PAID.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Error running test:', error);
        process.exit(1);
    }
}

// Start the server for testing
console.log('Starting server...');
try {
    const app = require('../src/index');
    // The server starts listening automatically in index.js if NODE_ENV != production
    // We give it a moment to initialize
    setTimeout(runTest, 2000);
} catch (error) {
    console.error('Failed to start server:', error);
}
