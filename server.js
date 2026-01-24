require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Prix des produits en centimes CAD
const PRODUCTS = {
    standard: {
        name: 'Chanson Personnalisée - Standard',
        price: 2900, // 29.00 CAD
        description: '1 chanson personnalisée + MP3 + Paroles PDF'
    },
    couple: {
        name: 'Chanson Personnalisée - Pack Couple',
        price: 4900, // 49.00 CAD
        description: '2 chansons différentes + MP3 + Paroles PDF'
    },
    deluxe: {
        name: 'Chanson Personnalisée - Pack Deluxe',
        price: 5500, // 55.00 CAD
        description: '2 chansons + 2 versions chaque (4 MP3) + Paroles PDF'
    }
};

// Créer une session Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { plan, songData, email, language } = req.body;
        
        const product = PRODUCTS[plan] || PRODUCTS.standard;
        
        // Créer la description avec les détails de la chanson
        let description = product.description;
        if (songData) {
            description += `\n\n--- Détails de la commande ---`;
            description += `\nPour: ${songData.recipientName || 'Non spécifié'}`;
            description += `\nOccasion: ${songData.occasion || 'Non spécifié'}`;
            description += `\nGenre: ${songData.genre || 'Non spécifié'}`;
            description += `\nAmbiance: ${songData.mood || 'Non spécifié'}`;
            description += `\nVoix: ${songData.vocal || 'Non spécifié'}`;
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'cad',
                        product_data: {
                            name: product.name,
                            description: product.description,
                            images: ['https://i.imgur.com/YourLogo.png'], // Remplace par ton logo
                        },
                        unit_amount: product.price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'http://localhost:3000'}/#pricing`,
            customer_email: email,
            metadata: {
                plan: plan,
                recipientName: songData?.recipientName || '',
                occasion: songData?.occasion || '',
                genre: songData?.genre || '',
                mood: songData?.mood || '',
                vocal: songData?.vocal || '',
                songLanguage: songData?.language || '',
                meetStory: songData?.meetStory || '',
                bestMemory: songData?.bestMemory || '',
                whatILove: songData?.whatILove || '',
                specialWord: songData?.specialWord || '',
            },
            locale: language === 'en' ? 'en' : 'fr',
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Erreur Stripe:', error);
        res.status(500).json({ error: error.message });
    }
});

// Vérifier le statut d'une session
app.get('/session-status', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
        res.json({
            status: session.payment_status,
            customer_email: session.customer_details?.email,
            metadata: session.metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook pour recevoir les événements Stripe (optionnel mais recommandé)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer les événements
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('Paiement réussi!', session.metadata);
            // Ici tu peux envoyer un email, sauvegarder en DB, etc.
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur AMORIX démarré sur http://localhost:${PORT}`);
});
