const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, authLimiter } = require('../middleware/auth');

const router = express.Router();

// Vérification que JWT_SECRET est défini
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET non défini dans les variables d\'environnement');
    process.exit(1);
}

// Middleware de validation simple
const validateRequest = (requiredFields) => {
    return (req, res, next) => {
        for (let field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `Le champ ${field} est requis`
                });
            }
        }
        next();
    };
};

// Inscription
router.post('/register', authLimiter, validateRequest(['fullName', 'phone', 'password', 'userType']), async (req, res) => {
    try {
        const { fullName, phone, email, quarter, password, userType } = req.body;

        // Validation du téléphone
        if (!/^[0-9]{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Format de téléphone invalide. 9 chiffres requis.'
            });
        }

        // Validation de l'email si fourni
        if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Format d\'email invalide'
            });
        }

        // Vérification si l'utilisateur existe déjà
        const existingUser = await User.findOne({ 
            $or: [{ phone }, { email: email || '' }] 
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec ce numéro ou email existe déjà'
            });
        }

        // CRITIQUE : Le mot de passe sera hashé automatiquement par le modèle User
        // NE PAS re-hasher ici !

        // Création de l'utilisateur
        const user = new User({
            fullName: fullName.trim(),
            phone,
            email: email ? email.trim().toLowerCase() : undefined,
            quarter: quarter || 'Dakar',
            password, // Le modèle va le hasher automatiquement
            userType,
            role: userType === 'coiffeur' ? 'coiffeur' : 'client'
        });

        await user.save();

        // Génération du token JWT
        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role,
                phone: user.phone
            },
            process.env.JWT_SECRET, // CRITIQUE : Utiliser process.env
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    phone: user.phone,
                    email: user.email,
                    quarter: user.quarter,
                    userType: user.userType,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        
        // Gestion des erreurs MongoDB
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec ce numéro existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du compte'
        });
    }
});

// Connexion
router.post('/login', authLimiter, validateRequest(['phone', 'password']), async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Validation du téléphone
        if (!/^[0-9]{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Format de téléphone invalide'
            });
        }

        // Recherche de l'utilisateur
        const user = await User.findOne({ phone });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Numéro de téléphone ou mot de passe incorrect'
            });
        }

        // Vérification du mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Numéro de téléphone ou mot de passe incorrect'
            });
        }

        // Vérification si le compte est actif
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Compte désactivé. Contactez le support.'
            });
        }

        // Génération du token JWT
        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role,
                phone: user.phone
            },
            process.env.JWT_SECRET, // CRITIQUE : Utiliser process.env
            { expiresIn: '7d' }
        );

        // Mise à jour de la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    phone: user.phone,
                    email: user.email,
                    quarter: user.quarter,
                    userType: user.userType,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la connexion'
        });
    }
});

// Les autres routes (profile, change-password, etc.) restent identiques
// ... (garder le code existant pour ces routes)

module.exports = router;