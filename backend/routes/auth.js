// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, authLimiter, validateRequest, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Schémas de validation
const registerSchema = {
    fullName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().regex(/^[0-9]{9}$/).required(),
    email: Joi.string().email().optional(),
    quarter: Joi.string().required(),
    password: Joi.string().min(6).required(),
    userType: Joi.string().valid('client', 'coiffeur').required()
};

const loginSchema = {
    phone: Joi.string().regex(/^[0-9]{9}$/).required(),
    password: Joi.string().required()
};

// Inscription
router.post('/register', authLimiter, validateRequest(registerSchema), async (req, res) => {
    try {
        const { fullName, phone, email, quarter, password, userType } = req.body;

        // Vérification si l'utilisateur existe déjà
        const existingUser = await User.findOne({ 
            $or: [{ phone }, { email }] 
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec ce numéro ou email existe déjà'
            });
        }

        // Hash du mot de passe
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Création de l'utilisateur
        const user = new User({
            fullName,
            phone,
            email,
            quarter,
            password: hashedPassword,
            userType,
            role: userType === 'coiffeur' ? 'coiffeur' : 'client'
        });

        await user.save();

        // Génération du token JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
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
        console.error('Erreur inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du compte'
        });
    }
});

// Connexion
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
    try {
        const { phone, password } = req.body;

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
            { userId: user._id, role: user.role },
            JWT_SECRET,
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
        console.error('Erreur connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la connexion'
        });
    }
});

// Récupération du profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user._id,
                    fullName: req.user.fullName,
                    phone: req.user.phone,
                    email: req.user.email,
                    quarter: req.user.quarter,
                    userType: req.user.userType,
                    role: req.user.role,
                    createdAt: req.user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('Erreur récupération profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du profil'
        });
    }
});

// Mise à jour du profil
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { fullName, email, quarter } = req.body;

        // Mise à jour des champs autorisés
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (quarter) updateData.quarter = quarter;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profil mis à jour avec succès',
            data: { user }
        });

    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du profil'
        });
    }
});

// Changement de mot de passe
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Vérification du mot de passe actuel
        const user = await User.findById(req.user._id);
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        // Hash du nouveau mot de passe
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Mise à jour du mot de passe
        user.password = hashedNewPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Mot de passe modifié avec succès'
        });

    } catch (error) {
        console.error('Erreur changement mot de passe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de mot de passe'
        });
    }
});

// Déconnexion (côté client seulement pour JWT)
router.post('/logout', authenticateToken, (req, res) => {
    // Pour JWT, la déconnexion se fait côté client en supprimant le token
    // On pourrait implémenter une blacklist de tokens si nécessaire
    res.json({
        success: true,
        message: 'Déconnexion réussie'
    });
});

module.exports = router;