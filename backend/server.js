// server.js - VERSION COMPLÈTE CORRIGÉE ET OPTIMISÉE
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

// ====================
// 🌐 CONFIGURATION CORS AMÉLIORÉE
// ====================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'file://',
  null // Pour les requêtes locales
];

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme celles de Postman ou curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ Origine bloquée par CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Gérer les requêtes OPTIONS (preflight)
app.options('*', cors());

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====================
// 📁 SERVIR LES FICHIERS STATIQUES
// ====================
app.use(express.static(path.join(__dirname, '../frontend')));

// ====================
// 🗃️ CONFIGURATION MULTER
// ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
// 🔐 MIDDLEWARE D'AUTHENTIFICATION
// ====================
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('🔐 Aucun token fourni');
      return res.status(401).json({ 
        success: false, 
        message: 'Token d\'accès requis' 
      });
    }

    // Décoder le token sans vérification pour debug
    const decodedWithoutVerify = jwt.decode(token);
    console.log('🔐 Token décodé:', decodedWithoutVerify);

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'keurcoiff_secret_key_change_in_production_2024');
    req.user = decoded;
    
    console.log('✅ Token vérifié pour:', decoded.fullName);
    next();
  } catch (error) {
    console.error('❌ Erreur vérification token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token invalide',
        code: 'TOKEN_INVALID'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur d\'authentification' 
    });
  }
};

// Middleware de logging amélioré
app.use((req, res, next) => {
  console.log(`\n📨 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  console.log('📦 Headers:', req.headers);
  console.log('📝 Body:', req.body);
  next();
});

// ====================
// 🗄️ CONNEXION MONGODB
// ====================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keurcoiff', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
})
.then(() => {
  console.log('✅ MongoDB connecté avec succès');
  console.log(`📊 Base: ${mongoose.connection.db.databaseName}`);
  
  // Créer les données de démo si nécessaire
  createDemoData();
})
.catch(err => {
  console.error('❌ Erreur MongoDB:', err.message);
  console.log('💡 Astuce: Assurez-vous que MongoDB est démarré: mongod');
});

// ====================
// 📋 MODÈLES MONGODB
// ====================

// Schéma User amélioré
const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    unique: true,
    trim: true,
    match: [/^(77|76|70|78)[0-9]{7}$/, 'Format téléphone invalide (ex: 771234567)']
  },
  fullName: {
    type: String,
    required: [true, 'Le nom complet est requis'],
    trim: true,
    minlength: [2, '2 caractères minimum']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, '6 caractères minimum'],
    select: false
  },
  quarter: {
    type: String,
    default: 'Dakar',
    trim: true
  },
  role: {
    type: String,
    enum: ['client', 'coiffeur', 'admin'],
    default: 'client'
  },
  avatar: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: true // TRUE pour la démo
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon'
  }],
  loginAttempts: {
    type: Number,
    default: 0
  },
  lastLogin: Date,
  lastLogout: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Méthodes User
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Middleware pour hacher le password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Schéma Salon (simplifié pour la démo)
const salonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    quarter: String,
    city: {
      type: String,
      default: 'Dakar'
    },
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    phone: String,
    email: String,
    whatsapp: String
  },
  services: [{
    name: String,
    description: String,
    price: Number,
    duration: Number,
    category: String,
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  images: [String],
  rating: {
    average: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Salon = mongoose.model('Salon', salonSchema);

// Schéma Reservation
const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: true
  },
  service: {
    name: String,
    price: Number
  },
  date: Date,
  time: String,
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['orange_money', 'wave', 'cash', 'card'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

const Reservation = mongoose.model('Reservation', reservationSchema);

// ====================
// 📊 DONNÉES DE DÉMO
// ====================
async function createDemoData() {
  try {
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('🎨 Création des données de démo...');
      
      // Hash des mots de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Créer les utilisateurs
      const demoUsers = [
        {
          phone: '771234567',
          fullName: 'Awa Diop',
          email: 'awa.diop@example.com',
          password: hashedPassword,
          quarter: 'Plateau',
          role: 'client',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
          isVerified: true
        },
        {
          phone: '772345678',
          fullName: 'Ibrahima Ndiaye',
          email: 'ibrahima.ndiaye@example.com',
          password: hashedPassword,
          quarter: 'Almadies',
          role: 'coiffeur',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          isVerified: true
        },
        {
          phone: '773456789',
          fullName: 'Fatou Sall',
          email: 'fatou.sall@example.com',
          password: hashedPassword,
          quarter: 'Ouakam',
          role: 'client',
          avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
          isVerified: true
        },
        {
          phone: '774567890',
          fullName: 'Mamadou Diallo',
          email: 'mamadou.diallo@example.com',
          password: hashedPassword,
          quarter: 'Mermoz',
          role: 'coiffeur',
          avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
          isVerified: true
        }
      ];

      const createdUsers = await User.insertMany(demoUsers);
      console.log(`✅ ${createdUsers.length} utilisateurs créés`);

      // Créer les salons
      const demoSalons = [
        {
          name: 'Prestige Dakar',
          description: 'Salon premium spécialisé dans les tresses africaines',
          owner: createdUsers[1]._id,
          location: {
            quarter: 'Plateau',
            city: 'Dakar',
            address: 'Avenue Léopold Sédar Senghor',
            coordinates: { lat: 14.6928, lng: -17.4467 }
          },
          contact: {
            phone: '771112233',
            email: 'contact@prestigedakar.com',
            whatsapp: '771112233'
          },
          services: [
            { name: 'Tresses simples', price: 3500, duration: 120, category: 'tresses' },
            { name: 'Tresses vanilles', price: 6000, duration: 180, category: 'tresses' },
            { name: 'Soins capillaires', price: 5000, duration: 90, category: 'soins' }
          ],
          images: ['https://coiffurealimage.fr/wp-content/uploads/2018/03/img-salon-10.jpg'],
          rating: { average: 4.9, count: 128 },
          isVerified: true,
          isActive: true
        },
        {
          name: 'Elégance Coiffure',
          description: 'Spécialiste de la coiffure moderne',
          owner: createdUsers[3]._id,
          location: {
            quarter: 'Almadies',
            city: 'Dakar',
            address: 'Rue des Almadies',
            coordinates: { lat: 14.7245, lng: -17.4810 }
          },
          contact: {
            phone: '772223344',
            email: 'info@elegancecoiffure.com',
            whatsapp: '772223344'
          },
          services: [
            { name: 'Coloration complète', price: 8000, duration: 150, category: 'coloration' },
            { name: 'Coupe homme dégradé', price: 3000, duration: 45, category: 'coupe' }
          ],
          images: ['https://th.bing.com/th/id/R.7135b0e2b4d81a4e891ad9ed67bf3680?rik=cB4PjLrggXJICQ&pid=ImgRaw&r=0'],
          rating: { average: 4.8, count: 96 },
          isVerified: true,
          isActive: true
        }
      ];

      const createdSalons = await Salon.insertMany(demoSalons);
      console.log(`✅ ${createdSalons.length} salons créés`);
      console.log('🎉 Données de démo prêtes !');
    } else {
      console.log('✅ Données de démo déjà existantes');
    }
  } catch (error) {
    console.error('❌ Erreur création données de démo:', error);
  }
}

// ====================
// 🚀 ROUTES DE BASE
// ====================

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Route de statut détaillé
app.get('/api/status', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const salonCount = await Salon.countDocuments();
    const reservationCount = await Reservation.countDocuments();
    
    res.json({
      success: true,
      message: '🚀 API KeurCoiff opérationnelle',
      version: '2.1.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté',
        name: mongoose.connection.db?.databaseName || 'N/A',
        users: userCount,
        salons: salonCount,
        reservations: reservationCount
      },
      endpoints: {
        auth: ['/api/auth/register', '/api/auth/login', '/api/auth/verify'],
        salons: '/api/salons',
        reservations: '/api/reservations',
        search: '/api/search'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ====================
// 🔐 ROUTES D'AUTHENTIFICATION
// ====================

// INSCRIPTION
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('👤 Tentative d\'inscription:', req.body);
    
    const { phone, fullName, password, email, quarter, role } = req.body;
    
    // Validation simple
    if (!phone || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone, nom et mot de passe requis'
      });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ce téléphone est déjà utilisé'
      });
    }
    
    // Créer l'utilisateur
    const user = new User({
      phone,
      fullName,
      password, // Le middleware va hacher
      email: email || '',
      quarter: quarter || 'Dakar',
      role: role || 'client'
    });
    
    await user.save();
    
    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET || 'keurcoiff_secret_key_change_in_production_2024',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Nouvel utilisateur créé:', user.fullName);
    
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
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
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
        message: 'Ce téléphone est déjà utilisé'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription'
    });
  }
});

// CONNEXION
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Tentative de connexion:', req.body.phone);
    
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone et mot de passe requis'
      });
    }
    
    // Chercher l'utilisateur avec le password
    const user = await User.findOne({ phone }).select('+password');
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', phone);
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Mot de passe incorrect:', phone);
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }
    
    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();
    
    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET || 'keurcoiff_secret_key_change_in_production_2024',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Connexion réussie:', user.fullName);
    
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
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
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

// VÉRIFICATION DU TOKEN
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Vérification token pour:', req.user.fullName);
    
    const user = await User.findById(req.user.userId).select('-password');
    
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
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
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

// DÉCONNEXION
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Déconnexion:', req.user.fullName);
    
    // Mettre à jour la dernière déconnexion
    await User.findByIdAndUpdate(req.user.userId, {
      lastLogout: new Date()
    });
    
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
// 💇 ROUTES SALONS
// ====================

// Lister tous les salons
app.get('/api/salons', async (req, res) => {
  try {
    const { quarter, service, limit = 20, page = 1 } = req.query;
    
    let filter = { isVerified: true, isActive: true };
    
    if (quarter) {
      filter['location.quarter'] = new RegExp(quarter, 'i');
    }
    
    if (service) {
      filter['services.name'] = new RegExp(service, 'i');
    }
    
    const skip = (page - 1) * limit;
    
    const salons = await Salon.find(filter)
      .populate('owner', 'fullName phone avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ 'rating.average': -1 });
    
    const total = await Salon.countDocuments(filter);
    
    res.json({
      success: true,
      data: salons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur listage salons:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Obtenir un salon par ID
app.get('/api/salons/:id', async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id)
      .populate('owner', 'fullName phone email avatar');
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: salon
    });
    
  } catch (error) {
    console.error('❌ Erreur salon par ID:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ====================
// 📍 ROUTES GÉOLOCALISATION
// ====================

// Salons à proximité
app.get('/api/salons/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    const salons = await Salon.find({ isVerified: true, isActive: true })
      .populate('owner', 'fullName')
      .limit(10);
    
    // Simuler des distances pour la démo
    const salonsWithDistance = salons.map(salon => ({
      ...salon.toObject(),
      distance: (Math.random() * 10).toFixed(1) + ' km',
      coordinates: salon.location.coordinates || { lat: 14.6928, lng: -17.4467 }
    }));
    
    res.json({
      success: true,
      data: salonsWithDistance
    });
    
  } catch (error) {
    console.error('❌ Erreur salons nearby:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ====================
// 📅 ROUTES RÉSERVATIONS
// ====================

// Créer une réservation
app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { salonId, serviceName, servicePrice, date, time, notes } = req.body;
    
    console.log('📅 Nouvelle réservation:', {
      user: req.user.fullName,
      salonId,
      serviceName
    });
    
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon non trouvé'
      });
    }
    
    const reservation = new Reservation({
      user: req.user.userId,
      salon: salonId,
      service: {
        name: serviceName,
        price: servicePrice
      },
      date: new Date(date),
      time,
      notes,
      status: 'confirmed',
      payment: {
        method: 'cash',
        status: 'pending'
      }
    });
    
    await reservation.save();
    
    // Notifier via socket
    io.emit('new-reservation', {
      reservationId: reservation._id,
      userName: req.user.fullName,
      salonName: salon.name,
      serviceName,
      time
    });
    
    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: reservation
    });
    
  } catch (error) {
    console.error('❌ Erreur création réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création'
    });
  }
});

// Obtenir les réservations de l'utilisateur
app.get('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user.userId })
      .populate('salon', 'name location.quarter images')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: reservations
    });
    
  } catch (error) {
    console.error('❌ Erreur listage réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Annuler une réservation
app.put('/api/reservations/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    if (reservation.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }
    
    reservation.status = 'cancelled';
    await reservation.save();
    
    res.json({
      success: true,
      message: 'Réservation annulée',
      data: reservation
    });
    
  } catch (error) {
    console.error('❌ Erreur annulation réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ====================
// 👤 ROUTES PROFIL
// ====================

// Obtenir le profil
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('favorites', 'name location.quarter rating images');
    
    const reservations = await Reservation.find({ user: req.user.userId })
      .populate('salon', 'name')
      .limit(5);
    
    res.json({
      success: true,
      data: {
        user,
        stats: {
          reservations: await Reservation.countDocuments({ user: req.user.userId }),
          favorites: user.favorites.length
        },
        recentReservations: reservations
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Mettre à jour le profil
app.put('/api/auth/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { fullName, email, quarter } = req.body;
    const updateData = {};
    
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (quarter) updateData.quarter = quarter;
    
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: user
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ====================
// 🔍 ROUTES RECHERCHE
// ====================

app.get('/api/search', async (req, res) => {
  try {
    const { q, quarter, service } = req.query;
    
    let filter = { isVerified: true, isActive: true };
    
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { 'location.quarter': new RegExp(q, 'i') },
        { 'services.name': new RegExp(q, 'i') }
      ];
    }
    
    if (quarter) {
      filter['location.quarter'] = new RegExp(quarter, 'i');
    }
    
    if (service) {
      filter['services.name'] = new RegExp(service, 'i');
    }
    
    const salons = await Salon.find(filter)
      .populate('owner', 'fullName')
      .limit(20);
    
    res.json({
      success: true,
      data: salons,
      count: salons.length
    });
    
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ====================
// 🏪 ROUTES COIFFEURS
// ====================

// Réservations du coiffeur
app.get('/api/coiffeur/reservations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coiffeur') {
      return res.status(403).json({
        success: false,
        message: 'Réservé aux coiffeurs'
      });
    }
    
    const salon = await Salon.findOne({ owner: req.user.userId });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Aucun salon trouvé'
      });
    }
    
    const reservations = await Reservation.find({ salon: salon._id })
      .populate('user', 'fullName phone avatar')
      .sort({ date: -1, time: -1 });
    
    res.json({
      success: true,
      data: reservations,
      salon: salon.name
    });
    
  } catch (error) {
    console.error('❌ Erreur réservations coiffeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// ====================
// 📱 SOCKET.IO
// ====================

io.on('connection', (socket) => {
  console.log('🔌 Socket connecté:', socket.id);
  
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 Utilisateur ${userId} joint`);
  });
  
  socket.on('join-salon', (salonId) => {
    socket.join(`salon-${salonId}`);
    console.log(`🏠 Salon ${salonId} joint`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Socket déconnecté:', socket.id);
  });
});

// ====================
// 📁 ROUTES PAGES
// ====================

// Route pour l'index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Route pour le login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Route pour l'inscription
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Route 404 pour l'API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route API non trouvée'
  });
});

// Route 404 pour le frontend
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ====================
// 🚀 DÉMARRAGE SERVEUR
// ====================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✨ ======================================');
  console.log(`🚀 Serveur KeurCoiff' démarré sur le port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  console.log('✨ ======================================');
  console.log('👥 UTILISATEURS DE DÉMO:');
  console.log('   Clients:');
  console.log('   • Awa Diop - 771234567');
  console.log('   • Fatou Sall - 773456789');
  console.log('');
  console.log('   Coiffeurs:');
  console.log('   • Ibrahima Ndiaye - 772345678');
  console.log('   • Mamadou Diallo - 774567890');
  console.log('');
  console.log('   🔑 Mot de passe pour tous: password123');
  console.log('✨ ======================================');
  console.log('🔐 ENDPOINTS AUTH:');
  console.log('   POST /api/auth/register - Inscription');
  console.log('   POST /api/auth/login - Connexion');
  console.log('   GET  /api/auth/verify - Vérifier token');
  console.log('   GET  /api/auth/profile - Profil utilisateur');
  console.log('✨ ======================================');
  console.log('💡 ASTUCES:');
  console.log('   1. Testez l\'API avec:');
  console.log('      curl http://localhost:5000/api/status');
  console.log('   2. Testez l\'authentification:');
  console.log('      curl -X POST http://localhost:5000/api/auth/login \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{"phone":"771234567","password":"password123"}\'');
  console.log('✨ ======================================\n');
});