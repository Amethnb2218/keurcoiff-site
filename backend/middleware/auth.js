// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Clé secrète (à mettre dans les variables d'environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'votre_cle_secrete_super_securisee';

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token d\'accès requis'
            });
        }

        // Vérification du token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Récupération de l'utilisateur
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Compte désactivé'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Erreur d\'authentification:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token invalide'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expiré'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur d\'authentification'
        });
    }
};

// Middleware d'autorisation (rôles)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        next();
    };
};

// Middleware de validation des données
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }
        
        next();
    };
};

// Middleware de rate limiting
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives max
    message: {
        success: false,
        message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes max
    message: {
        success: false,
        message: 'Trop de requêtes. Réessayez dans 15 minutes.'
    }
});

// Middleware de sécurité Helmet
const helmet = require('helmet');

const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
});

// Middleware CORS
const cors = require('cors');

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = {
    authenticateToken,
    authorize,
    validateRequest,
    authLimiter,
    apiLimiter,
    securityHeaders,
    corsOptions,
    JWT_SECRET
};