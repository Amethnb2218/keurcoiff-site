// server.js - VERSION COMPLÈTE CORRIGÉE
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
    'http://127.0.0.1:5000',
    'https://keurcoiff-site.onrender.com'
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

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
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

// Schéma et Modèle User
const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis'],
    unique: true,
    trim: true,
    match: [/^[0-9]{9}$/, 'Format de téléphone invalide. 9 chiffres requis.']
  },
  fullName: {
    type: String,
    required: [true, 'Le nom complet est requis'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Format d\'email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
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
    default: false
  },
  verificationCode: {
    type: String,
    select: false
  },
  verificationExpires: {
    type: Date,
    select: false
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon'
  }],
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

// Méthode pour comparer les mots de passe
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Middleware pour hacher le mot de passe avant sauvegarde
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

// Middleware pour mettre à jour updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);

// Schéma et Modèle Salon
const salonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du salon est requis'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    quarter: {
      type: String,
      required: [true, 'Le quartier est requis'],
      trim: true
    },
    city: {
      type: String,
      default: 'Dakar',
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    phone: {
      type: String,
      required: [true, 'Le téléphone du salon est requis'],
      match: [/^[0-9]{9}$/, 'Format de téléphone invalide. 9 chiffres requis.']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    whatsapp: {
      type: String,
      trim: true
    }
  },
  services: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Le prix ne peut pas être négatif']
    },
    duration: {
      type: Number, // en minutes
      default: 60
    },
    category: {
      type: String,
      enum: ['tresses', 'coupe', 'soins', 'coloration', 'barbe', 'maquillage', 'autres'],
      default: 'autres'
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  features: {
    homeService: {
      type: Boolean,
      default: false
    },
    wifi: {
      type: Boolean,
      default: false
    },
    parking: {
      type: Boolean,
      default: false
    },
    airConditioning: {
      type: Boolean,
      default: false
    },
    acceptsCards: {
      type: Boolean,
      default: false
    }
  },
  images: [{
    type: String
  }],
  openingHours: [{
    day: {
      type: String,
      enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    },
    open: {
      type: String,
      default: '08:00'
    },
    close: {
      type: String,
      default: '19:00'
    },
    isClosed: {
      type: Boolean,
      default: false
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
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

// Index pour recherche géospatiale
salonSchema.index({ 'location.coordinates': '2dsphere' });

const Salon = mongoose.model('Salon', salonSchema);

// Schéma et Modèle Reservation
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
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  serviceName: {
    type: String,
    required: true
  },
  servicePrice: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['orange_money', 'wave', 'cash', 'card', 'pending'],
      default: 'pending'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: {
      type: String,
      trim: true
    },
    amount: {
      type: Number,
      min: 0
    }
  },
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

const Reservation = mongoose.model('Reservation', reservationSchema);

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
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
          isVerified: true
        },
        {
          phone: '772345678',
          fullName: 'Ibrahima Ndiaye',
          email: 'ibrahima.ndiaye@example.com',
          password: 'password123',
          quarter: 'Almadies',
          role: 'coiffeur',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          isVerified: true
        },
        {
          phone: '773456789',
          fullName: 'Fatou Sall',
          email: 'fatou.sall@example.com',
          password: 'password123',
          quarter: 'Ouakam',
          role: 'client',
          avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
          isVerified: true
        },
        {
          phone: '774567890',
          fullName: 'Mamadou Diallo',
          email: 'mamadou.diallo@example.com',
          password: 'password123',
          quarter: 'Mermoz',
          role: 'coiffeur',
          avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
          isVerified: true
        }
      ];

      const createdUsers = await User.insertMany(demoUsers);
      console.log(`✅ ${createdUsers.length} utilisateurs créés`);

      // Créer des salons de démo
      const demoSalons = [
        {
          name: 'Prestige Dakar',
          description: 'Salon premium spécialisé dans les tresses africaines et soins capillaires haut de gamme.',
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
            { name: 'Tresses simples', description: 'Tresses classiques africaines', price: 3500, duration: 120, category: 'tresses' },
            { name: 'Tresses vanilles', description: 'Tresses fines et élégantes', price: 6000, duration: 180, category: 'tresses' },
            { name: 'Soins capillaires', description: 'Soins profonds pour cheveux abîmés', price: 5000, duration: 90, category: 'soins' },
            { name: 'Coupe moderne', description: 'Coupe tendance personnalisée', price: 4000, duration: 60, category: 'coupe' }
          ],
          features: {
            homeService: true,
            wifi: true,
            parking: true,
            airConditioning: true,
            acceptsCards: true
          },
          images: [
            'https://coiffurealimage.fr/wp-content/uploads/2018/03/img-salon-10.jpg'
          ],
          openingHours: [
            { day: 'lundi', open: '08:00', close: '19:00' },
            { day: 'mardi', open: '08:00', close: '19:00' },
            { day: 'mercredi', open: '08:00', close: '19:00' },
            { day: 'jeudi', open: '08:00', close: '19:00' },
            { day: 'vendredi', open: '08:00', close: '19:00' },
            { day: 'samedi', open: '09:00', close: '18:00' },
            { day: 'dimanche', open: '10:00', close: '16:00', isClosed: false }
          ],
          rating: {
            average: 4.9,
            count: 128
          },
          isVerified: true,
          isActive: true
        },
        {
          name: 'Elégance Coiffure',
          description: 'Spécialiste de la coiffure moderne et des coupes tendance. Expertise en coloration.',
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
            { name: 'Coloration complète', description: 'Coloration professionnelle', price: 8000, duration: 150, category: 'coloration' },
            { name: 'Brushing professionnel', description: 'Brushing soigné et durable', price: 4500, duration: 90, category: 'soins' },
            { name: 'Coupe homme dégradé', description: 'Coupe précise avec dégradé', price: 3000, duration: 45, category: 'coupe' },
            { name: 'Soins du visage', description: 'Soins hydratants et purifiants', price: 6000, duration: 75, category: 'autres' }
          ],
          features: {
            homeService: false,
            wifi: true,
            parking: true,
            airConditioning: true,
            acceptsCards: true
          },
          images: [
            'https://th.bing.com/th/id/R.7135b0e2b4d81a4e891ad9ed67bf3680?rik=cB4PjLrggXJICQ&pid=ImgRaw&r=0'
          ],
          openingHours: [
            { day: 'lundi', open: '09:00', close: '20:00' },
            { day: 'mardi', open: '09:00', close: '20:00' },
            { day: 'mercredi', open: '09:00', close: '20:00' },
            { day: 'jeudi', open: '09:00', close: '20:00' },
            { day: 'vendredi', open: '09:00', close: '20:00' },
            { day: 'samedi', open: '10:00', close: '19:00' },
            { day: 'dimanche', isClosed: true }
          ],
          rating: {
            average: 4.8,
            count: 96
          },
          isVerified: true,
          isActive: true
        },
        {
          name: 'Tradition Hair',
          description: 'Maîtres dans l\'art des tresses traditionnelles africaines et coiffures cérémonielles.',
          owner: createdUsers[1]._id,
          location: {
            quarter: 'Ouakam',
            city: 'Dakar',
            address: 'Rue de Ouakam',
            coordinates: { lat: 14.7390, lng: -17.5166 }
          },
          contact: {
            phone: '773334455',
            email: 'contact@traditionhair.com',
            whatsapp: '773334455'
          },
          services: [
            { name: 'Tresses traditionnelles', description: 'Tresses africaines ancestrales', price: 2500, duration: 180, category: 'tresses' },
            { name: 'Coiffure cérémonie', description: 'Coiffure pour mariage et événements', price: 10000, duration: 240, category: 'tresses' },
            { name: 'Pose de mèches', description: 'Pose de mèches naturelles ou synthétiques', price: 7000, duration: 150, category: 'tresses' },
            { name: 'Soins naturels', description: 'Soins aux produits naturels africains', price: 4000, duration: 90, category: 'soins' }
          ],
          features: {
            homeService: true,
            wifi: false,
            parking: false,
            airConditioning: true,
            acceptsCards: false
          },
          images: [
            'https://www.mobiliercoiffure.com/wp-content/uploads/2021/01/pack-quir.jpg'
          ],
          openingHours: [
            { day: 'lundi', open: '07:00', close: '22:00' },
            { day: 'mardi', open: '07:00', close: '22:00' },
            { day: 'mercredi', open: '07:00', close: '22:00' },
            { day: 'jeudi', open: '07:00', close: '22:00' },
            { day: 'vendredi', open: '07:00', close: '22:00' },
            { day: 'samedi', open: '08:00', close: '20:00' },
            { day: 'dimanche', open: '09:00', close: '18:00' }
          ],
          rating: {
            average: 4.9,
            count: 217
          },
          isVerified: true,
          isActive: true
        }
      ];

      const createdSalons = await Salon.insertMany(demoSalons);
      console.log(`✅ ${createdSalons.length} salons créés`);

      // Créer des réservations de démo
      const demoReservations = [
        {
          user: createdUsers[0]._id,
          salon: createdSalons[0]._id,
          service: createdSalons[0].services[0]._id,
          serviceName: 'Tresses simples',
          servicePrice: 3500,
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Demain
          time: '14:00',
          status: 'confirmed',
          payment: {
            method: 'orange_money',
            status: 'completed',
            transactionId: 'OM_' + Date.now(),
            amount: 3500
          }
        },
        {
          user: createdUsers[2]._id,
          salon: createdSalons[1]._id,
          service: createdSalons[1].services[0]._id,
          serviceName: 'Coloration complète',
          servicePrice: 8000,
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          time: '10:00',
          status: 'pending',
          payment: {
            method: 'wave',
            status: 'completed',
            transactionId: 'WAVE_' + Date.now(),
            amount: 8000
          }
        }
      ];

      const createdReservations = await Reservation.insertMany(demoReservations);
      console.log(`✅ ${createdReservations.length} réservations créées`);
      console.log('🎉 Données de démo créées avec succès !');
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
    status: '🚀 API FlashRV en ligne',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté',
    cors: '✅ Configuré',
    users: '✅ Données de démo disponibles'
  });
});

// ====================
// 🔐 ROUTES D'AUTHENTIFICATION AMÉLIORÉES
// ====================

// Route d'inscription améliorée
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, fullName, password, email, quarter, role } = req.body;
    console.log(`👤 Tentative d'inscription: ${phone} - ${fullName}`);

    // Validation des champs obligatoires
    if (!phone || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone, nom complet et mot de passe sont obligatoires'
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

    // Validation de l'email si fourni
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Format d\'email invalide'
        });
      }
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

    // Vérification si l'email existe déjà
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Un utilisateur avec cet email existe déjà'
        });
      }
    }

    // Création de l'utilisateur
    const user = new User({
      phone,
      fullName,
      password,
      email: email || '',
      quarter: quarter || 'Dakar',
      role: role || 'client',
      isVerified: true // Pour la démo, on vérifie automatiquement
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
        email: user.email
      },
      process.env.JWT_SECRET || 'votre_secret_jwt_tres_securise_changez_cela_en_production',
      { expiresIn: '7d' }
    );

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
        message: 'Ce téléphone ou email est déjà utilisé'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
});

// Route de connexion améliorée
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

    // Recherche de l'utilisateur avec le mot de passe
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

    // Génération du token JWT
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
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
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
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

// Route pour vérifier le token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // RETOURNER UN FORMAT COHÉRENT
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
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

// ====================
// 💇 ROUTES DES SALONS
// ====================

// Route pour obtenir tous les salons
app.get('/api/salons', async (req, res) => {
  try {
    const { service, city, quarter, limit = 20, page = 1 } = req.query;
    console.log('🔍 Recherche salons avec filtres:', { service, city, quarter });
    
    let filter = { isVerified: true, isActive: true };
    
    if (service) {
      filter['services.name'] = new RegExp(service, 'i');
    }
    
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }
    
    if (quarter) {
      filter['location.quarter'] = new RegExp(quarter, 'i');
    }

    const skip = (page - 1) * limit;
    
    const salons = await Salon.find(filter)
      .populate('owner', 'fullName phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1, createdAt: -1 });
    
    const total = await Salon.countDocuments(filter);
    
    res.json({
      success: true,
      data: salons,
      count: salons.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      filters: { service, city, quarter }
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

// Route pour obtenir les salons populaires
app.get('/api/salons/popular', async (req, res) => {
  try {
    const salons = await Salon.find({ 
      isVerified: true, 
      isActive: true,
      'rating.average': { $gte: 4.5 }
    })
    .populate('owner', 'fullName')
    .limit(6)
    .sort({ 'rating.average': -1, 'rating.count': -1 });
    
    res.json({
      success: true,
      data: salons,
      count: salons.length
    });
  } catch (error) {
    console.error('❌ Erreur salons populaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des salons populaires'
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
      .populate('owner', 'fullName phone email')
      .populate('reviews.user', 'fullName avatar');
    
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

// Route pour ajouter un avis
app.post('/api/salons/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Note invalide (1-5)'
      });
    }

    const salon = await Salon.findById(req.params.id);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon non trouvé'
      });
    }

    // Vérifier si l'utilisateur a déjà laissé un avis
    const existingReview = salon.reviews.find(review => 
      review.user.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà laissé un avis pour ce salon'
      });
    }

    // Ajouter l'avis
    salon.reviews.push({
      user: req.user.userId,
      rating,
      comment
    });

    // Recalculer la moyenne des notes
    const totalRating = salon.reviews.reduce((sum, review) => sum + review.rating, 0);
    salon.rating.average = totalRating / salon.reviews.length;
    salon.rating.count = salon.reviews.length;

    await salon.save();

    res.json({
      success: true,
      message: 'Avis ajouté avec succès',
      data: { salon }
    });
  } catch (error) {
    console.error('❌ Erreur ajout avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de l\'avis'
    });
  }
});

// ====================
// 📍 ROUTES GÉOLOCALISATION
// ====================

// Route pour les salons proches
app.get('/api/salons/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5 } = req.query;

    if (!latitude || !longitude) {
      // Retourner les salons les mieux notés si pas de coordonnées
      const salons = await Salon.find({ 
        isVerified: true, 
        isActive: true 
      })
      .limit(10)
      .sort({ 'rating.average': -1 });

      return res.json({
        success: true,
        data: salons.map(salon => ({
          ...salon.toObject(),
          distance: (Math.random() * 10).toFixed(1) + ' km'
        }))
      });
    }

    // Simulation de géolocalisation avec des données de démo
    const allSalons = await Salon.find({ 
      isVerified: true, 
      isActive: true 
    });

    const nearbySalons = allSalons.map(salon => {
      // Calcul de distance simulée
      const distance = (Math.random() * 10).toFixed(1);
      return {
        ...salon.toObject(),
        distance: parseFloat(distance),
        distanceText: distance <= maxDistance ? `${distance} km` : `${distance} km`
      };
    }).filter(salon => salon.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: nearbySalons,
      count: nearbySalons.length,
      userLocation: { latitude, longitude },
      maxDistance
    });
  } catch (error) {
    console.error('❌ Erreur recherche salons proches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche des salons proches'
    });
  }
});

// ====================
// 📅 ROUTES DES RÉSERVATIONS
// ====================

// Route pour créer une réservation
app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { salonId, serviceId, date, time, notes, paymentMethod } = req.body;
    
    console.log('📅 Nouvelle réservation:', {
      user: req.user.fullName,
      salonId,
      serviceId,
      date,
      time,
      paymentMethod
    });

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon non trouvé'
      });
    }

    const service = salon.services.id(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    // Vérifier si le service est disponible
    if (!service.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Ce service n\'est pas disponible actuellement'
      });
    }

    // Vérifier la disponibilité de l'horaire
    const existingReservation = await Reservation.findOne({
      salon: salonId,
      date: new Date(date),
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: 'Cet horaire n\'est plus disponible'
      });
    }

    const reservation = new Reservation({
      user: req.user.userId,
      salon: salonId,
      service: serviceId,
      serviceName: service.name,
      servicePrice: service.price,
      date: new Date(date),
      time,
      notes,
      status: 'confirmed',
      payment: {
        method: paymentMethod || 'cash',
        status: paymentMethod ? 'completed' : 'pending',
        transactionId: paymentMethod ? `${paymentMethod.toUpperCase()}_${Date.now()}` : null,
        amount: service.price
      }
    });

    await reservation.save();

    // Émettre l'événement socket pour les notifications
    io.emit('new-reservation', {
      reservationId: reservation._id,
      salonId,
      userName: req.user.fullName,
      serviceName: service.name,
      date: reservation.date,
      time
    });

    // Notifier le propriétaire du salon
    io.to(`salon-${salonId}`).emit('reservation-notification', {
      type: 'new',
      reservationId: reservation._id,
      userName: req.user.fullName,
      serviceName: service.name,
      time
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: { 
        reservation,
        salonName: salon.name,
        serviceName: service.name
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
    const { status, limit = 10, page = 1 } = req.query;
    
    let filter = { user: req.user.userId };
    
    if (status) {
      filter.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const reservations = await Reservation.find(filter)
      .populate('salon', 'name location.quarter location.city images')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Reservation.countDocuments(filter);
    
    res.json({
      success: true,
      data: { reservations },
      count: reservations.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
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

// Route pour annuler une réservation
app.put('/api/reservations/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    // Vérifier que l'utilisateur est bien le propriétaire de la réservation
    if (reservation.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à annuler cette réservation'
      });
    }
    
    // Vérifier si la réservation peut être annulée
    if (['cancelled', 'completed'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation ne peut pas être annulée'
      });
    }
    
    reservation.status = 'cancelled';
    await reservation.save();
    
    // Notifier le salon
    io.to(`salon-${reservation.salon}`).emit('reservation-notification', {
      type: 'cancelled',
      reservationId: reservation._id,
      userName: req.user.fullName
    });
    
    res.json({
      success: true,
      message: 'Réservation annulée avec succès',
      data: { reservation }
    });
  } catch (error) {
    console.error('❌ Erreur annulation réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la réservation',
      error: error.message
    });
  }
});

// ====================
// 👤 ROUTES PROFIL UTILISATEUR
// ====================

// Route pour récupérer le profil utilisateur
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -verificationCode -verificationExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les statistiques de l'utilisateur
    const reservationsCount = await Reservation.countDocuments({ user: user._id });
    const favoriteSalons = await Salon.find({ _id: { $in: user.favorites } })
      .select('name location.quarter rating images')
      .limit(5);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          reservations: reservationsCount,
          favorites: user.favorites.length
        },
        favoriteSalons
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
    ).select('-password');

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user }
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

// Route pour ajouter un salon aux favoris
app.post('/api/auth/favorites/:salonId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user.favorites.includes(req.params.salonId)) {
      user.favorites.push(req.params.salonId);
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Salon ajouté aux favoris',
      data: { favorites: user.favorites }
    });
  } catch (error) {
    console.error('❌ Erreur ajout favoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout aux favoris'
    });
  }
});

// Route pour retirer un salon des favoris
app.delete('/api/auth/favorites/:salonId', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { favorites: req.params.salonId }
    });
    
    res.json({
      success: true,
      message: 'Salon retiré des favoris'
    });
  } catch (error) {
    console.error('❌ Erreur suppression favoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression des favoris'
    });
  }
});

// ====================
// 🏪 ROUTES POUR COIFFEURS
// ====================

// Route pour créer un salon
app.post('/api/coiffeur/salons', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    if (req.user.role !== 'coiffeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux coiffeurs'
      });
    }

    const { 
      name, 
      description, 
      location, 
      contact, 
      services, 
      features,
      openingHours 
    } = req.body;

    // Parse JSON strings
    const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
    const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
    const parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
    const parsedOpeningHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;

    // Gérer les images uploadées
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const salon = new Salon({
      name,
      description,
      owner: req.user.userId,
      location: parsedLocation,
      contact: typeof contact === 'string' ? JSON.parse(contact) : contact,
      services: parsedServices,
      features: parsedFeatures,
      openingHours: parsedOpeningHours,
      images
    });

    await salon.save();

    res.status(201).json({
      success: true,
      message: 'Salon créé avec succès. En attente de vérification.',
      data: { salon }
    });
  } catch (error) {
    console.error('❌ Erreur création salon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du salon',
      error: error.message
    });
  }
});

// Route pour les réservations d'un coiffeur
app.get('/api/coiffeur/reservations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coiffeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux coiffeurs'
      });
    }

    const salon = await Salon.findOne({ owner: req.user.userId });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Aucun salon trouvé pour ce coiffeur'
      });
    }

    const { status, limit = 20, page = 1 } = req.query;
    
    let filter = { salon: salon._id };
    if (status) filter.status = status;
    
    const skip = (page - 1) * limit;
    
    const reservations = await Reservation.find(filter)
      .populate('user', 'fullName phone avatar')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Reservation.countDocuments(filter);
    
    res.json({
      success: true,
      data: { 
        reservations,
        salonName: salon.name 
      },
      count: reservations.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('❌ Erreur récupération réservations coiffeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations',
      error: error.message
    });
  }
});

// Route pour mettre à jour le statut d'une réservation (coiffeur)
app.put('/api/coiffeur/reservations/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coiffeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux coiffeurs'
      });
    }

    const { status } = req.body;
    const validStatuses = ['confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'fullName phone');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Vérifier que le coiffeur est bien le propriétaire du salon
    const salon = await Salon.findOne({ 
      _id: reservation.salon, 
      owner: req.user.userId 
    });
    
    if (!salon) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette réservation'
      });
    }

    reservation.status = status;
    await reservation.save();

    // Notifier l'utilisateur du changement de statut
    io.to(`user-${reservation.user._id}`).emit('reservation-update', {
      reservationId: reservation._id,
      status,
      salonName: salon.name
    });

    res.json({
      success: true,
      message: 'Statut de réservation mis à jour',
      data: { reservation }
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour statut réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
});

// Route pour les statistiques du coiffeur
app.get('/api/coiffeur/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coiffeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux coiffeurs'
      });
    }

    const salon = await Salon.findOne({ owner: req.user.userId });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Aucun salon trouvé'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Lundi de cette semaine
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Requêtes parallèles pour les statistiques
    const [
      todayReservations,
      upcomingReservations,
      weekReservations,
      monthReservations,
      allReservations,
      reviews
    ] = await Promise.all([
      Reservation.find({
        salon: salon._id,
        date: { $gte: today, $lt: tomorrow }
      }),
      Reservation.find({
        salon: salon._id,
        date: { $gte: tomorrow },
        status: { $in: ['pending', 'confirmed'] }
      }),
      Reservation.find({
        salon: salon._id,
        date: { $gte: startOfWeek }
      }),
      Reservation.find({
        salon: salon._id,
        date: { $gte: startOfMonth }
      }),
      Reservation.find({ salon: salon._id }),
      Reservation.find({
        salon: salon._id,
        status: 'completed'
      }).populate('user', 'fullName avatar')
    ]);

    const stats = {
      today: {
        bookings: todayReservations.length,
        revenue: todayReservations.reduce((sum, r) => sum + r.servicePrice, 0),
        completed: todayReservations.filter(r => r.status === 'completed').length,
        pending: todayReservations.filter(r => r.status === 'pending').length
      },
      week: {
        bookings: weekReservations.length,
        revenue: weekReservations.reduce((sum, r) => sum + r.servicePrice, 0)
      },
      month: {
        bookings: monthReservations.length,
        revenue: monthReservations.reduce((sum, r) => sum + r.servicePrice, 0)
      },
      upcoming: {
        bookings: upcomingReservations.length
      },
      total: {
        bookings: allReservations.length,
        revenue: allReservations.reduce((sum, r) => sum + r.servicePrice, 0),
        averageRating: salon.rating.average,
        reviewCount: salon.rating.count
      },
      recentReviews: reviews.slice(0, 5).map(r => ({
        userName: r.user.fullName,
        userAvatar: r.user.avatar,
        serviceName: r.serviceName,
        date: r.date,
        time: r.time
      }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Erreur récupération stats coiffeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// ====================
// 🔍 ROUTES RECHERCHE
// ====================
app.get('/api/search/salons', async (req, res) => {
  try {
    const { q, quarter, service, minRating, maxPrice, homeService } = req.query;
    
    let filter = { isVerified: true, isActive: true };
    
    // Recherche textuelle
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { 'location.quarter': new RegExp(q, 'i') },
        { 'services.name': new RegExp(q, 'i') }
      ];
    }
    
    // Filtres
    if (quarter) {
      filter['location.quarter'] = new RegExp(quarter, 'i');
    }
    
    if (service) {
      filter['services.name'] = new RegExp(service, 'i');
    }
    
    if (minRating) {
      filter['rating.average'] = { $gte: parseFloat(minRating) };
    }
    
    if (maxPrice) {
      filter['services.price'] = { $lte: parseInt(maxPrice) };
    }
    
    if (homeService === 'true') {
      filter['features.homeService'] = true;
    }
    
    const salons = await Salon.find(filter)
      .populate('owner', 'fullName')
      .sort({ 'rating.average': -1, 'rating.count': -1 });
    
    res.json({
      success: true,
      data: salons,
      count: salons.length
    });
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
});

// ====================
// 🚀 WEB SOCKETS POUR NOTIFICATIONS
// ====================
io.on('connection', (socket) => {
  console.log('👤 Nouvel utilisateur connecté:', socket.id);
  
  // Rejoindre la salle de l'utilisateur
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 Utilisateur ${userId} connecté au socket`);
  });
  
  // Rejoindre la salle du salon
  socket.on('join-salon', (salonId) => {
    socket.join(`salon-${salonId}`);
    console.log(`🏠 Utilisateur ${socket.id} a rejoint le salon ${salonId}`);
  });
  
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

// Route pour la page de profil
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/profile.html'));
});

// Route pour les réservations
app.get('/mes-reservations', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/mes-reservations.html'));
});

// Route pour le dashboard coiffeur
app.get('/dashboard-coiffeur', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard-coiffeur.html'));
});

// ====================
// 🚨 GESTION DES ERREURS
// ====================

// 404 - Route non trouvée
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    console.log('❌ Route API non trouvée:', req.originalUrl);
    return res.status(404).json({
      success: false,
      message: 'Route API non trouvée',
      path: req.originalUrl
    });
  }
  
  console.log('🌐 Servir frontend pour:', req.originalUrl);
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

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
  
  // Erreur Multer
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'La taille du fichier ne doit pas dépasser 5MB'
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
  console.log(`🚀 Serveur FlashRV démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`🏠 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 Status: http://localhost:${PORT}/api/status`);
  console.log('✨ ======================================');
  console.log('👤 Données de démo créées automatiquement:');
  console.log('   • Clients: Awa Diop (771234567), Fatou Sall (773456789)');
  console.log('   • Coiffeurs: Ibrahima Ndiaye (772345678), Mamadou Diallo (774567890)');
  console.log('   • Mot de passe pour tous: password123');
  console.log('✨ ======================================');
  console.log('🛡️  Routes authentifiées:');
  console.log('   • GET  /api/auth/profile');
  console.log('   • PUT  /api/auth/profile');
  console.log('   • POST /api/reservations');
  console.log('   • GET  /api/reservations');
  console.log('✨ ======================================');
  console.log('🔍 Fonctionnalités disponibles:');
  console.log('   • Connexion/Déconnexion améliorée');
  console.log('   • Vérification stricte des identifiants');
  console.log('   • Données de démo réalistes');
  console.log('   • Notifications en temps réel');
  console.log('   • Géolocalisation des salons');
  console.log('✨ ======================================\n');
});