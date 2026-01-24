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
const VIDEO_FEE = 1200;  // 12$ en centimes
const TPS_RATE = 0.05;      // 5%
const TVQ_RATE = 0.09975;   // 9.975%

// Fonction pour envoyer l'email de commande
async function sendOrderEmail(session, songData) {
    const product = PRODUCTS[songData.plan] || PRODUCTS.standard;
    const isUrgent = songData.urgentDelivery === 'true' || songData.urgentDelivery === true;
    const hasVideo = songData.videoOption === 'true' || songData.videoOption === true;
    const basePrice = product.price / 100;
    const urgentPrice = isUrgent ? 15 : 0;
    const videoPrice = hasVideo ? 12 : 0;
    const totalPrice = (basePrice + urgentPrice + videoPrice).toFixed(2);
    
    const deliveryTime = isUrgent ? '⚡ URGENT - 6 HEURES' : '48 heures';
    const urgentBadge = isUrgent ? '<span style="background:#EF5B6C;color:white;padding:5px 10px;border-radius:20px;font-size:12px;margin-left:10px;">⚡ URGENT</span>' : '';
    const videoBadge = hasVideo ? '<span style="background:#9333EA;color:white;padding:5px 10px;border-radius:20px;font-size:12px;margin-left:10px;">🎬 VIDÉO</span>' : '';
    
    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #EF5B6C, #D94A5A); padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎵 Nouvelle Commande AMORIX! ${urgentBadge}${videoBadge}</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #eee;">
            <h2 style="color: #EF5B6C; border-bottom: 2px solid #EF5B6C; padding-bottom: 10px;">💰 Détails de la commande</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold;">Formule:</td><td>${product.name}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Prix formule:</td><td>${basePrice}$ CAD</td></tr>
                ${hasVideo ? '<tr><td style="padding: 8px 0; font-weight: bold; color: #9333EA;">🎬 Vidéo avec paroles:</td><td style="color: #9333EA;">+12$ CAD</td></tr>' : ''}
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
                <tr><td style="padding: 8px 0; font-weight: bold;">Vidéo:</td><td>${hasVideo ? '✅ Oui' : '❌ Non'}</td></tr>
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
        console.log('📧 Email admin envoyé avec succès!');
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
    }
}

// Fonction pour envoyer l'email de confirmation au CLIENT
async function sendClientConfirmationEmail(session, songData, language = 'fr') {
    const product = PRODUCTS[songData.plan] || PRODUCTS.standard;
    const isUrgent = songData.urgentDelivery === 'true' || songData.urgentDelivery === true;
    const hasVideo = songData.videoOption === 'true' || songData.videoOption === true;
    const clientEmail = session.customer_email || session.customer_details?.email;
    
    if (!clientEmail) {
        console.log('❌ Pas d\'email client trouvé');
        return;
    }
    
    const basePrice = product.price / 100;
    const urgentPrice = isUrgent ? 15 : 0;
    const videoPrice = hasVideo ? 12 : 0;
    const subtotal = basePrice + urgentPrice + videoPrice;
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    const totalPrice = (subtotal + tps + tvq).toFixed(2);
    
    const deliveryTime = isUrgent ? (language === 'en' ? '6 hours' : '6 heures') : '48h';
    const recipientName = songData.recipientName || (language === 'en' ? 'your loved one' : 'votre être cher');
    
    // Contenu bilingue
    const content = language === 'en' ? {
        subject: `🎵 Your AMORIX order is confirmed!`,
        greeting: `Thank you for your order!`,
        intro: `We're thrilled to create a personalized song for <strong>${recipientName}</strong>. Our team is already working on making this moment unforgettable.`,
        orderTitle: `Order Summary`,
        product: `Product`,
        delivery: `Delivery`,
        video: `Video with lyrics`,
        subtotal: `Subtotal`,
        total: `Total`,
        nextTitle: `What's Next?`,
        step1: `<strong>Creation in progress</strong> - Our artists are composing your unique song`,
        step2: `<strong>Delivery</strong> - You'll receive your MP3 ${hasVideo ? '+ video ' : ''}by email within <strong>${deliveryTime}</strong>`,
        step3: `<strong>Surprise!</strong> - Get ready to see tears of joy!`,
        questions: `Questions? Reply to this email or contact us at amorixamorix90@gmail.com`,
        closing: `With love,<br>The AMORIX Team 🎵`,
        footer: `You're receiving this email because you placed an order on amorix-website.onrender.com`
    } : {
        subject: `🎵 Votre commande AMORIX est confirmée!`,
        greeting: `Merci pour votre commande!`,
        intro: `Nous sommes ravis de créer une chanson personnalisée pour <strong>${recipientName}</strong>. Notre équipe travaille déjà à rendre ce moment inoubliable.`,
        orderTitle: `Résumé de la commande`,
        product: `Produit`,
        delivery: `Livraison`,
        video: `Vidéo avec paroles`,
        subtotal: `Sous-total`,
        total: `Total`,
        nextTitle: `Prochaines étapes`,
        step1: `<strong>Création en cours</strong> - Nos artistes composent votre chanson unique`,
        step2: `<strong>Livraison</strong> - Vous recevrez votre MP3 ${hasVideo ? '+ vidéo ' : ''}par email dans <strong>${deliveryTime}</strong>`,
        step3: `<strong>Surprise!</strong> - Préparez-vous à voir des larmes de joie!`,
        questions: `Des questions? Répondez à cet email ou contactez-nous à amorixamorix90@gmail.com`,
        closing: `Avec amour,<br>L'équipe AMORIX 🎵`,
        footer: `Vous recevez cet email car vous avez passé une commande sur amorix-website.onrender.com`
    };
    
    const emailHTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #EF5B6C, #D94A5A); padding: 40px 30px; text-align: center; border-radius: 0 0 30px 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎵 AMORIX</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${content.greeting}</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                ${content.intro}
            </p>
            
            <!-- Order Summary Box -->
            <div style="background: #f8f9fa; border-radius: 16px; padding: 25px; margin-bottom: 30px;">
                <h2 style="color: #EF5B6C; margin: 0 0 20px 0; font-size: 18px;">${content.orderTitle}</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #666;">${content.product}</td>
                        <td style="padding: 10px 0; text-align: right; color: #333; font-weight: 500;">${product.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666;">${content.delivery}</td>
                        <td style="padding: 10px 0; text-align: right; color: #333;">${deliveryTime} ${isUrgent ? '⚡' : ''}</td>
                    </tr>
                    ${hasVideo ? `<tr>
                        <td style="padding: 10px 0; color: #666;">${content.video}</td>
                        <td style="padding: 10px 0; text-align: right; color: #9333EA;">🎬 +12$</td>
                    </tr>` : ''}
                    <tr style="border-top: 2px solid #eee;">
                        <td style="padding: 15px 0 5px 0; color: #333; font-weight: bold; font-size: 18px;">${content.total}</td>
                        <td style="padding: 15px 0 5px 0; text-align: right; color: #EF5B6C; font-weight: bold; font-size: 20px;">${totalPrice}$ CAD</td>
                    </tr>
                </table>
            </div>
            
            <!-- Next Steps -->
            <div style="margin-bottom: 30px;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 18px;">${content.nextTitle}</h2>
                <div style="background: #fff5f6; border-left: 4px solid #EF5B6C; padding: 15px 20px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; color: #333;">1️⃣ ${content.step1}</p>
                </div>
                <div style="background: #fff5f6; border-left: 4px solid #EF5B6C; padding: 15px 20px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; color: #333;">2️⃣ ${content.step2}</p>
                </div>
                <div style="background: #fff5f6; border-left: 4px solid #EF5B6C; padding: 15px 20px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; color: #333;">3️⃣ ${content.step3}</p>
                </div>
            </div>
            
            <!-- Questions -->
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 30px;">
                ${content.questions}
            </p>
            
            <!-- Closing -->
            <p style="color: #333; font-size: 16px; text-align: center; margin: 0;">
                ${content.closing}
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #2A2A2A; padding: 20px 30px; text-align: center; border-radius: 30px 30px 0 0;">
            <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0;">
                ${content.footer}
            </p>
        </div>
    </div>
    `;
    
    try {
        await transporter.sendMail({
            from: `"AMORIX 🎵" <${process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: content.subject,
            html: emailHTML
        });
        console.log('📧 Email de confirmation client envoyé à:', clientEmail);
    } catch (error) {
        console.error('❌ Erreur envoi email client:', error);
    }
}

// Créer une session Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { plan, songData, email, language, urgentDelivery, videoOption } = req.body;
        
        const product = PRODUCTS[plan] || PRODUCTS.standard;
        
        // Calculer sous-total
        let subtotal = product.price;
        if (videoOption) {
            subtotal += VIDEO_FEE;
        }
        if (urgentDelivery) {
            subtotal += URGENT_FEE;
        }
        
        // Calculer taxes
        const tpsAmount = Math.round(subtotal * TPS_RATE);
        const tvqAmount = Math.round(subtotal * TVQ_RATE);
        
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
                        name: 'Livraison EXPRESS (6h)',
                        description: 'Livraison express en 6 heures',
                    },
                    unit_amount: URGENT_FEE,
                },
                quantity: 1,
            });
        }
        
        // Ajouter option vidéo si sélectionné
        if (videoOption) {
            lineItems.push({
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: 'Vidéo avec paroles',
                        description: 'Vidéo générée avec les paroles de la chanson',
                    },
                    unit_amount: VIDEO_FEE,
                },
                quantity: 1,
            });
        }
        
        // Ajouter TPS
        lineItems.push({
            price_data: {
                currency: 'cad',
                product_data: {
                    name: 'TPS (5%)',
                    description: 'Taxe sur les produits et services',
                },
                unit_amount: tpsAmount,
            },
            quantity: 1,
        });
        
        // Ajouter TVQ
        lineItems.push({
            price_data: {
                currency: 'cad',
                product_data: {
                    name: 'TVQ (9.975%)',
                    description: 'Taxe de vente du Québec',
                },
                unit_amount: tvqAmount,
            },
            quantity: 1,
        });

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
                videoOption: videoOption ? 'true' : 'false',
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
            const songData = {
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
                videoOption: session.metadata.videoOption,
            };
            
            // Envoyer email admin
            await sendOrderEmail(session, songData);
            
            // Envoyer email de confirmation au client
            const language = session.locale === 'en' ? 'en' : 'fr';
            await sendClientConfirmationEmail(session, songData, language);
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
