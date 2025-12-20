// server.js - VERSION CORRIGÉE ET AMÉLIORÉE
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// ✅ CONFIGURATION CORS COMPLÈTE
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:5500', 
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware pour les preflight requests
app.options('*', cors());

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ SERVIR LES FICHIERS STATIQUES DU FRONTEND
app.use(express.static(path.join(__dirname, '../frontend')));

// ====================
// 🗃️ CONFIGURATION DE MULTER POUR LES FICHIERS
// ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// ====================
// 🛡️ MIDDLEWARE D'AUTHENTIFICATION
// ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token d\'accès requis' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt_tres_securise_changez_cela_en_production');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Erreur vérification token:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Token invalide ou expiré' 
    });
  }
};

// Middleware de logging pour debug
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ====================
// 🗄️ MODÈLES MONGODB
// ====================

// Modèles - nous les importerons
const User = require('./models/User'); // Assurez-vous que le chemin est correct
const Salon = require('./models/Salon');
const Reservation = require('./models/Reservation');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keurcoiff', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log('✅ MongoDB connecté avec succès');
  console.log(`📊 Base de données: ${mongoose.connection.db.databaseName}`);
  
  // Créer des données de démo
  createDemoData();
})
.catch(err => {
  console.error('❌ Erreur MongoDB:', err);
});

// ====================
// 📊 CRÉATION DE DONNÉES DE DÉMO
// ====================

async function createDemoData() {
  try {
    // Vérifier si des utilisateurs existent déjà
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('📊 Création des données de démo...');
      
      // Créer des utilisateurs de démo
      const demoUsers = [
        {
          phone: '771234567',
          fullName: 'Awa Diop',
          email: 'awa.diop@example.com',
          password: 'password123',
          quarter: 'Plateau',
          role: 'client',
          userType: 'client',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
          isActive: true
        },
        {
          phone: '772345678',
          fullName: 'Ibrahima Ndiaye',
          email: 'ibrahima.ndiaye@example.com',
          password: 'password123',
          quarter: 'Almadies',
          role: 'coiffeur',
          userType: 'coiffeur',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          isActive: true
        },
        {
          phone: '773456789',
          fullName: 'Fatou Sall',
          email: 'fatou.sall@example.com',
          password: 'password123',
          quarter: 'Ouakam',
          role: 'client',
          userType: 'client',
          avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
          isActive: true
        },
        {
          phone: '774567890',
          fullName: 'Mamadou Diallo',
          email: 'mamadou.diallo@example.com',
          password: 'password123',
          quarter: 'Mermoz',
          role: 'coiffeur',
          userType: 'coiffeur',
          avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
          isActive: true
        }
      ];

      const createdUsers = await User.insertMany(demoUsers);
      console.log(`✅ ${createdUsers.length} utilisateurs créés`);
    }
  } catch (error) {
    console.error('❌ Erreur création données de démo:', error);
  }
}

// ====================
// 🎯 ROUTES PUBLIQUES
// ====================

// Route de statut
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: '🚀 API KeurCoiff en ligne',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté',
    cors: '✅ Configuré',
    users: '✅ Données de démo disponibles'
  });
});

// ====================
// 🔐 ROUTES D'AUTHENTIFICATION AMÉLIORÉES - CORRIGÉES
// ====================

// Route d'inscription améliorée
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, fullName, password, email, quarter, userType } = req.body;
    console.log(`👤 Tentative d'inscription: ${phone} - ${fullName}`);

    // Validation des champs obligatoires
    if (!phone || !fullName || !password || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    // Validation du format du téléphone
    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Format de téléphone invalide. 9 chiffres requis (ex: 771234567).'
      });
    }

    // Validation du type d'utilisateur
    if (!['client', 'coiffeur'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Type d\'utilisateur invalide'
      });
    }

    // Vérification si l'utilisateur existe déjà
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      console.log('❌ Utilisateur existe déjà:', phone);
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec ce téléphone existe déjà'
      });
    }

    // Création de l'utilisateur
    const user = new User({
      phone,
      fullName,
      password,
      email: email || '',
      quarter: quarter || 'Dakar',
      userType: userType,
      role: userType, // Pour la compatibilité
      isActive: true
    });

    await user.save();
    console.log('✅ Nouvel utilisateur créé:', user.fullName);

    // Génération du token JWT
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        userType: user.userType,
        email: user.email
      },
      process.env.JWT_SECRET || 'votre_secret_jwt_tres_securise_changez_cela_en_production',
      { expiresIn: '7d' }
    );

    // Mettre à jour lastLogin
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          quarter: user.quarter,
          userType: user.userType,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    
    // Gestion des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: messages
      });
    }
    
    // Gestion des erreurs de duplication
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ce téléphone est déjà utilisé'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
});

// Route de connexion améliorée - CORRIGÉE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(`🔐 Tentative de connexion: ${phone}`);

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone et mot de passe sont obligatoires'
      });
    }

    // Recherche de l'utilisateur AVEC le mot de passe
    const user = await User.findOne({ phone }).select('+password');
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', phone);
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérification du mot de passe
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      console.log('❌ Mot de passe incorrect pour:', phone);
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Ce compte est désactivé'
      });
    }

    // Mettre à jour lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Génération du token JWT
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        userType: user.userType,
        email: user.email
      },
      process.env.JWT_SECRET || 'votre_secret_jwt_tres_securise_changez_cela_en_production',
      { expiresIn: '7d' }
    );

    console.log('✅ Connexion réussie pour:', user.fullName);
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          quarter: user.quarter,
          userType: user.userType,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
});

// Route de vérification de token - CORRIGÉE
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          quarter: user.quarter,
          userType: user.userType,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur vérification token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de vérification'
    });
  }
});

// Route de déconnexion
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Déconnexion utilisateur:', req.user.fullName);
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
});

// ====================
// 👤 ROUTES PROFIL UTILISATEUR
// ====================

// Route pour récupérer le profil utilisateur
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          quarter: user.quarter,
          userType: user.userType,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          favorites: user.favorites
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
});

// Route pour mettre à jour le profil
app.put('/api/auth/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { fullName, email, quarter } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (quarter) updateData.quarter = quarter;
    
    // Gérer l'upload de l'avatar
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { 
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          quarter: user.quarter,
          userType: user.userType,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message
    });
  }
});

// ====================
// 💇 ROUTES DES SALONS
// ====================

// Route pour obtenir tous les salons
app.get('/api/salons', async (req, res) => {
  try {
    const salons = await Salon.find({ isActive: true })
      .populate('owner', 'fullName phone')
      .limit(20)
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: salons,
      count: salons.length
    });
  } catch (error) {
    console.error('❌ Erreur route /api/salons:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche des salons',
      error: error.message
    });
  }
});

// Route pour obtenir un salon par ID
app.get('/api/salons/:id', async (req, res) => {
  try {
    console.log(`🔍 Recherche salon ID: ${req.params.id}`);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de salon invalide'
      });
    }

    const salon = await Salon.findById(req.params.id)
      .populate('owner', 'fullName phone email');
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon non trouvé'
      });
    }

    console.log(`✅ Salon trouvé: ${salon.name}`);
    res.json({
      success: true,
      data: salon
    });
  } catch (error) {
    console.error('❌ Erreur route /api/salons/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// ====================
// 📅 ROUTES DES RÉSERVATIONS
// ====================

// Route pour créer une réservation
app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { salonId, serviceName, servicePrice, date, time, notes } = req.body;
    
    console.log('📅 Nouvelle réservation:', {
      user: req.user.fullName,
      salonId,
      serviceName,
      date,
      time
    });

    // Créer une réservation simplifiée
    const reservation = new Reservation({
      user: req.user.userId,
      salon: salonId,
      serviceName,
      servicePrice,
      date: new Date(date),
      time,
      notes,
      status: 'confirmed',
      payment: {
        method: 'cash',
        status: 'pending',
        amount: servicePrice
      }
    });

    await reservation.save();

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: { 
        reservation,
        serviceName,
        servicePrice
      }
    });
  } catch (error) {
    console.error('❌ Erreur création réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation',
      error: error.message
    });
  }
});

// Route pour récupérer les réservations d'un utilisateur
app.get('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user.userId })
      .populate('salon', 'name location.quarter')
      .sort({ date: -1, time: -1 });
    
    res.json({
      success: true,
      data: { reservations },
      count: reservations.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations',
      error: error.message
    });
  }
});

// ====================
// 🚀 WEB SOCKETS POUR NOTIFICATIONS
// ====================

io.on('connection', (socket) => {
  console.log('👤 Nouvel utilisateur connecté:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('👤 Utilisateur déconnecté:', socket.id);
  });
});

// ====================
// 📱 ROUTES POUR PAGES FRONTEND
// ====================

// Route pour la page de connexion
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Route pour la page d'inscription
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Route par défaut pour le frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ====================
// 🚨 GESTION DES ERREURS
// ====================

// Gestion des erreurs globale
app.use((error, req, res, next) => {
  console.error('🔥 Erreur serveur:', error);
  
  // Erreurs de validation Mongoose
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: messages
    });
  }
  
  // Erreur JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
  
  // Erreur JWT expiré
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expiré'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  });
});

// ====================
// 🚀 DÉMARRAGE SERVEUR
// ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✨ ======================================');
  console.log(`🚀 Serveur KeurCoiff' démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`🏠 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 Status: http://localhost:${PORT}/api/status`);
  console.log('✨ ======================================');
  console.log('👤 Données de démo créées automatiquement:');
  console.log('   • Client: Awa Diop (771234567 / password123)');
  console.log('   • Coiffeur: Ibrahima Ndiaye (772345678 / password123)');
  console.log('✨ ======================================\n');
});