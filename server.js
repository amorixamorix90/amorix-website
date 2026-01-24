require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Prix des produits en centimes CAD
const PRODUCTS = {
    standard: {
        name: 'Chanson Personnalisée - Standard',
        price: 2900,
        description: '1 chanson personnalisée + MP3 + Paroles PDF'
    },
    couple: {
        name: 'Chanson Personnalisée - Pack Couple',
        price: 4900,
        description: '2 chansons différentes + MP3 + Paroles PDF'
    },
    deluxe: {
        name: 'Chanson Personnalisée - Pack Deluxe',
        price: 5500,
        description: '2 chansons + 2 versions chaque (4 MP3) + Paroles PDF'
    }
};

const URGENT_FEE = 1500; // 15$ en centimes

// Fonction pour envoyer l'email de commande
async function sendOrderEmail(session, songData) {
    const product = PRODUCTS[songData.plan] || PRODUCTS.standard;
    const isUrgent = songData.urgentDelivery === 'true' || songData.urgentDelivery === true;
    const basePrice = product.price / 100;
    const urgentPrice = isUrgent ? 15 : 0;
    const totalPrice = (basePrice + urgentPrice).toFixed(2);
    
    const deliveryTime = isUrgent ? '⚡ URGENT - 6 HEURES' : '48 heures';
    const urgentBadge = isUrgent ? '<span style="background:#EF5B6C;color:white;padding:5px 10px;border-radius:20px;font-size:12px;margin-left:10px;">⚡ URGENT</span>' : '';
    
    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #EF5B6C, #D94A5A); padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎵 Nouvelle Commande AMORIX! ${urgentBadge}</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #eee;">
            <h2 style="color: #EF5B6C; border-bottom: 2px solid #EF5B6C; padding-bottom: 10px;">💰 Détails de la commande</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold;">Formule:</td><td>${product.name}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Prix formule:</td><td>${basePrice}$ CAD</td></tr>
                ${isUrgent ? '<tr><td style="padding: 8px 0; font-weight: bold; color: #EF5B6C;">⚡ Livraison urgente:</td><td style="color: #EF5B6C;">+15$ CAD</td></tr>' : ''}
                <tr><td style="padding: 8px 0; font-weight: bold;">Total:</td><td style="color: #EF5B6C; font-weight: bold; font-size: 18px;">${totalPrice}$ CAD</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Délai livraison:</td><td style="font-weight: bold; ${isUrgent ? 'color: #EF5B6C;' : ''}">${deliveryTime}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Email client:</td><td>${session.customer_email || 'Non fourni'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Date:</td><td>${new Date().toLocaleString('fr-CA')}</td></tr>
            </table>
            
            <h2 style="color: #EF5B6C; border-bottom: 2px solid #EF5B6C; padding-bottom: 10px; margin-top: 30px;">🎤 Informations pour la chanson</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold;">Pour:</td><td>${songData.recipientName || 'Non spécifié'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Langue:</td><td>${songData.songLanguage === 'french' ? 'Français' : 'Anglais'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Occasion:</td><td>${songData.occasion || 'Non spécifié'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Genre musical:</td><td>${songData.genre || 'Non spécifié'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Ambiance:</td><td>${songData.mood || 'Non spécifié'}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Voix:</td><td>${songData.vocal || 'Non spécifié'}</td></tr>
            </table>
            
            <h2 style="color: #EF5B6C; border-bottom: 2px solid #EF5B6C; padding-bottom: 10px; margin-top: 30px;">💕 L'histoire d'amour</h2>
            
            <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Où ils se sont rencontrés:</h4>
                <p style="margin: 0; color: #555;">${songData.meetStory || 'Non spécifié'}</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Plus beau souvenir:</h4>
                <p style="margin: 0; color: #555;">${songData.bestMemory || 'Non spécifié'}</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Ce qu'il/elle aime:</h4>
                <p style="margin: 0; color: #555;">${songData.whatILove || 'Non spécifié'}</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 10px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Mot spécial à inclure:</h4>
                <p style="margin: 0; color: #555;">${songData.specialWord || 'Aucun'}</p>
            </div>
        </div>
        
        <div style="background: #2A2A2A; padding: 20px; border-radius: 0 0 15px 15px; text-align: center;">
            <p style="color: white; margin: 0;">AMORIX - Chaque amour a sa chanson 🎵</p>
        </div>
    </div>
    `;
    
    // Créer le CSV pour import Google Sheets
    const csvData = `Date,Email Client,Formule,Prix,Urgent,Délai,Destinataire,Langue,Occasion,Genre,Ambiance,Voix,Rencontre,Souvenir,Ce que j'aime,Mot special
"${new Date().toLocaleString('fr-CA')}","${session.customer_email || ''}","${product.name}","${totalPrice}$","${isUrgent ? 'OUI' : 'Non'}","${isUrgent ? '6h' : '48h'}","${songData.recipientName || ''}","${songData.songLanguage || ''}","${songData.occasion || ''}","${songData.genre || ''}","${songData.mood || ''}","${songData.vocal || ''}","${(songData.meetStory || '').replace(/"/g, '""')}","${(songData.bestMemory || '').replace(/"/g, '""')}","${(songData.whatILove || '').replace(/"/g, '""')}","${(songData.specialWord || '').replace(/"/g, '""')}"`;

    try {
        await transporter.sendMail({
            from: `"AMORIX 🎵" <${process.env.EMAIL_USER}>`,
            to: 'amorixamorix90@gmail.com',
            subject: `${isUrgent ? '⚡ URGENT - ' : ''}🎵 Nouvelle commande AMORIX - ${songData.recipientName || 'Client'} - ${totalPrice}$ CAD`,
            html: emailHTML,
            attachments: [
                {
                    filename: `commande-amorix-${Date.now()}.csv`,
                    content: csvData
                }
            ]
        });
        console.log('📧 Email envoyé avec succès!');
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
    }
}

// Créer une session Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { plan, songData, email, language, urgentDelivery } = req.body;
        
        const product = PRODUCTS[plan] || PRODUCTS.standard;
        
        // Créer les line items
        const lineItems = [
            {
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: product.name,
                        description: product.description,
                    },
                    unit_amount: product.price,
                },
                quantity: 1,
            }
        ];
        
        // Ajouter frais urgents si sélectionné
        if (urgentDelivery) {
            lineItems.push({
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: '⚡ Livraison urgente (6h)',
                        description: 'Livraison express en 6 heures',
                    },
                    unit_amount: URGENT_FEE,
                },
                quantity: 1,
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${req.headers.origin || 'https://amorix-website.onrender.com'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'https://amorix-website.onrender.com'}/#pricing`,
            customer_email: email,
            metadata: {
                plan: plan,
                recipientName: songData?.recipientName || '',
                occasion: songData?.occasion || '',
                genre: songData?.genre || '',
                mood: songData?.mood || '',
                vocal: songData?.vocal || '',
                songLanguage: songData?.language || '',
                meetStory: (songData?.meetStory || '').substring(0, 500),
                bestMemory: (songData?.bestMemory || '').substring(0, 500),
                whatILove: (songData?.whatILove || '').substring(0, 500),
                specialWord: songData?.specialWord || '',
                urgentDelivery: urgentDelivery ? 'true' : 'false',
            },
            locale: language === 'en' ? 'en' : 'fr',
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Erreur Stripe:', error);
        res.status(500).json({ error: error.message });
    }
});

// Vérifier le statut d'une session ET envoyer l'email
app.get('/session-status', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
        
        // Si paiement réussi, envoyer l'email
        if (session.payment_status === 'paid' && session.metadata) {
            await sendOrderEmail(session, {
                plan: session.metadata.plan,
                recipientName: session.metadata.recipientName,
                occasion: session.metadata.occasion,
                genre: session.metadata.genre,
                mood: session.metadata.mood,
                vocal: session.metadata.vocal,
                songLanguage: session.metadata.songLanguage,
                meetStory: session.metadata.meetStory,
                bestMemory: session.metadata.bestMemory,
                whatILove: session.metadata.whatILove,
                specialWord: session.metadata.specialWord,
                urgentDelivery: session.metadata.urgentDelivery,
            });
        }
        
        res.json({
            status: session.payment_status,
            customer_email: session.customer_details?.email,
            metadata: session.metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur AMORIX démarré sur http://localhost:${PORT}`);
});
