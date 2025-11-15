// server.js - VERSION CORRIGÉE
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // ✅ Une seule déclaration

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ SERVIR LES FICHIERS STATIQUES DU FRONTEND
app.use(express.static(path.join(__dirname, '../frontend')));

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keurcoiff')
.then(() => {
  console.log('✅ MongoDB Atlas connecté avec succès');
  console.log(`📊 Base de données: ${mongoose.connection.db.databaseName}`);
})
.catch(err => {
  console.error('❌ Erreur MongoDB:', err);
  process.exit(1);
});

// ====================
// 🎯 ROUTES PUBLIQUES
// ====================

// Import des modèles
const User = require('./models/User');
const Salon = require('./models/Salon');
const Reservation = require('./models/Reservation');

// Route de statut
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: '🚀 API KeurCoiff en ligne',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté',
    cors: '✅ Configuré'
  });
});

// ====================
// 💇 ROUTES DES SALONS
// ====================

// Route de test pour les salons
app.get('/api/salons/test', async (req, res) => {
  try {
    console.log('🔍 Recherche des salons vérifiés...');
    const salons = await Salon.find({ isVerified: true }).limit(10);
    
    console.log(`📊 ${salons.length} salons trouvés`);
    
    const formattedSalons = salons.map(salon => ({
      id: salon._id,
      name: salon.name,
      location: salon.location,
      services: salon.services,
      rating: salon.rating,
      features: salon.features
    }));
    
    res.json({
      success: true,
      data: formattedSalons,
      count: formattedSalons.length
    });
  } catch (error) {
    console.error('❌ Erreur route /api/salons/test:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des salons',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
});

// Route pour obtenir tous les salons
app.get('/api/salons', async (req, res) => {
  try {
    const { service, city, quarter } = req.query;
    console.log('🔍 Recherche salons avec filtres:', { service, city, quarter });
    
    let filter = { isVerified: true };
    if (service) {
      filter['services.name'] = new RegExp(service, 'i');
      console.log(`🎯 Filtre service: ${service}`);
    }
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
      console.log(`🎯 Filtre ville: ${city}`);
    }
    if (quarter) {
      filter['location.quarter'] = new RegExp(quarter, 'i');
      console.log(`🎯 Filtre quartier: ${quarter}`);
    }

    const salons = await Salon.find(filter);
    console.log(`📊 ${salons.length} salons correspondants trouvés`);
    
    res.json({
      success: true,
      data: salons,
      count: salons.length,
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

    const salon = await Salon.findById(req.params.id);
    
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

// Route pour les services d'un salon
app.get('/api/salons/:id/services', async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        services: salon.services,
        salonName: salon.name,
        location: salon.location
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération services:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des services'
    });
  }
});

// ====================
// 🔐 ROUTES D'AUTHENTIFICATION
// ====================

// Route d'inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, fullName, password, email, quarter, userType } = req.body;
    console.log(`👤 Tentative d'inscription: ${phone} - ${fullName}`);

    if (!phone || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone, nom complet et mot de passe sont obligatoires'
      });
    }

    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Format de téléphone invalide. 9 chiffres requis.'
      });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      console.log('❌ Utilisateur existe déjà:', phone);
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec ce téléphone existe déjà'
      });
    }

    const user = new User({
      phone,
      fullName,
      password,
      email: email || '',
      quarter: quarter || 'Dakar',
      userType: userType || 'client',
      role: userType === 'coiffeur' ? 'coiffeur' : 'client'
    });

    await user.save();
    console.log('✅ Nouvel utilisateur créé:', user.fullName);

    // ✅ TOKEN JWT SÉCURISÉ
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        userType: user.userType
      },
      process.env.JWT_SECRET,
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
          userType: user.userType,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
});

// Route de connexion
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

    const user = await User.findOne({ phone });
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', phone);
      return res.status(400).json({
        success: false,
        message: 'Téléphone ou mot de passe incorrect'
      });
    }

    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      console.log('❌ Mot de passe incorrect pour:', phone);
      return res.status(400).json({
        success: false,
        message: 'Téléphone ou mot de passe incorrect'
      });
    }

    // ✅ TOKEN JWT SÉCURISÉ
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        userType: user.userType
      },
      process.env.JWT_SECRET,
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
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

// Route de déconnexion
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  console.log('👤 Déconnexion utilisateur:', req.user.fullName);
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

// Route pour récupérer le profil utilisateur
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
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
          userType: user.userType,
          role: user.role,
          createdAt: user.createdAt
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
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, email, quarter } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        fullName,
        email,
        quarter
      },
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

// Route pour changer le mot de passe
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe sont requis'
      });
    }

    const user = await User.findById(req.user.userId);
    const isCurrentPasswordValid = await user.correctPassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: error.message
    });
  }
});

// ====================
// 📍 ROUTES DES RÉSERVATIONS
// ====================

// Route pour créer une réservation
app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { salonId, serviceId, date, time, notes } = req.body;
    
    console.log('📅 Nouvelle réservation:', {
      user: req.user.fullName,
      salonId,
      serviceId,
      date,
      time
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

    const reservation = new Reservation({
      user: req.user.userId,
      salon: salonId,
      service: serviceId,
      serviceName: service.name,
      servicePrice: service.price,
      date: new Date(date),
      time,
      notes,
      status: 'confirmed'
    });

    await reservation.save();

    io.emit('new-reservation', {
      reservationId: reservation._id,
      salonId,
      userName: req.user.fullName,
      serviceName: service.name,
      date: reservation.date
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: { reservation }
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
      .populate('salon', 'name location')
      .sort({ createdAt: -1 });

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
// 🏪 ROUTES POUR COIFFEURS
// ====================

// Route pour créer un salon (pour coiffeurs)
app.post('/api/salons', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coiffeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux coiffeurs'
      });
    }

    const { name, location, services, features, description } = req.body;

    const salon = new Salon({
      name,
      location,
      services,
      features,
      description,
      owner: req.user.userId,
      isVerified: false
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

// Route pour récupérer les réservations d'un salon (pour coiffeurs)
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

    const reservations = await Reservation.find({ salon: salon._id })
      .populate('user', 'fullName phone')
      .sort({ date: -1, time: -1 });

    res.json({
      success: true,
      data: { reservations },
      count: reservations.length
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

// Route pour mettre à jour le statut d'une réservation
app.put('/api/reservations/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coiffeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux coiffeurs'
      });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'fullName phone');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

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

// Route pour récupérer les statistiques du coiffeur
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
    
    const todayReservations = await Reservation.find({
      salon: salon._id,
      date: { $gte: today }
    });

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyReservations = await Reservation.find({
      salon: salon._id,
      date: { $gte: startOfMonth }
    });

    const stats = {
      today: {
        bookings: todayReservations.length,
        revenue: todayReservations.reduce((sum, r) => sum + r.servicePrice, 0),
        pending: todayReservations.filter(r => r.status === 'pending').length
      },
      monthly: {
        bookings: monthlyReservations.length,
        revenue: monthlyReservations.reduce((sum, r) => sum + r.servicePrice, 0),
        completed: monthlyReservations.filter(r => r.status === 'completed').length
      },
      rating: salon.rating || { average: 4.8, count: 47 }
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
// 🔄 WEB SOCKET POUR NOTIFICATIONS
// ====================

io.on('connection', (socket) => {
  console.log('👤 Nouvel utilisateur connecté:', socket.id);

  socket.on('join-salon', (salonId) => {
    socket.join(`salon-${salonId}`);
    console.log(`🏠 Utilisateur ${socket.id} a rejoint le salon ${salonId}`);
  });

  socket.on('new-reservation', (data) => {
    console.log('📅 Nouvelle réservation reçue:', data);
    io.to(`salon-${data.salonId}`).emit('reservation-update', data);
  });

  socket.on('disconnect', () => {
    console.log('👤 Utilisateur déconnecté:', socket.id);
  });
});

// ====================
// 🗺️ ROUTES GÉOLOCALISATION
// ====================

const geolocationService = {
  findNearbySalons: async (req, res) => {
    try {
      const { latitude, longitude, maxDistance = 5 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Coordonnées GPS requises (latitude, longitude)'
        });
      }

      const salons = await Salon.find({ 
        isActive: true,
        isVerified: true,
        'location.coordinates': { $exists: true }
      });

      const nearbySalons = salons.map(salon => {
        const distance = (Math.random() * 10).toFixed(1);
        return {
          ...salon.toObject(),
          distance: parseFloat(distance)
        };
      }).filter(salon => salon.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);

      res.json({
        success: true,
        data: nearbySalons,
        count: nearbySalons.length,
        userLocation: { latitude, longitude },
        maxDistance: maxDistance
      });

    } catch (error) {
      console.error('❌ Erreur recherche salons proches:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche des salons proches'
      });
    }
  }
};

app.get('/api/salons/nearby', geolocationService.findNearbySalons);

// ====================
// 🔍 ROUTES RECHERCHE AVANCÉE
// ====================

const searchService = {
  search: async (query, filters) => {
    try {
      let searchFilter = { isVerified: true };
      
      if (query) {
        searchFilter.$or = [
          { name: new RegExp(query, 'i') },
          { 'location.quarter': new RegExp(query, 'i') },
          { 'services.name': new RegExp(query, 'i') }
        ];
      }
      
      if (filters.quarter) {
        searchFilter['location.quarter'] = new RegExp(filters.quarter, 'i');
      }
      
      if (filters.service) {
        searchFilter['services.name'] = new RegExp(filters.service, 'i');
      }
      
      if (filters.homeService) {
        searchFilter['features.homeService'] = true;
      }
      
      if (filters.minRating) {
        searchFilter.rating = { $gte: filters.minRating };
      }
      
      if (filters.maxPrice) {
        searchFilter['services.price'] = { $lte: filters.maxPrice };
      }
      
      const salons = await Salon.find(searchFilter);
      
      return {
        success: true,
        data: salons,
        count: salons.length
      };
    } catch (error) {
      throw new Error('Erreur lors de la recherche');
    }
  },
  
  getSuggestions: async (query) => {
    try {
      if (!query || query.length < 2) {
        return { success: true, data: [] };
      }
      
      const salons = await Salon.find({
        $or: [
          { name: new RegExp(query, 'i') },
          { 'location.quarter': new RegExp(query, 'i') }
        ],
        isVerified: true
      }).limit(5);
      
      const services = await Salon.aggregate([
        { $unwind: '$services' },
        { $match: { 
          'services.name': new RegExp(query, 'i'),
          isVerified: true 
        }},
        { $group: { 
          _id: '$services.name',
          count: { $sum: 1 }
        }},
        { $limit: 5 }
      ]);
      
      const suggestions = [
        ...salons.map(salon => ({
          type: 'salon',
          name: salon.name,
          quarter: salon.location.quarter
        })),
        ...services.map(service => ({
          type: 'service',
          name: service._id
        }))
      ];
      
      return { success: true, data: suggestions };
    } catch (error) {
      return { success: true, data: [] };
    }
  }
};

app.get('/api/search/salons', async (req, res) => {
  try {
    const { q, quarter, service, homeService, minRating, maxPrice } = req.query;
    
    const filters = {
      quarter,
      service,
      homeService: homeService === 'true',
      minRating: minRating ? parseFloat(minRating) : null,
      maxPrice: maxPrice ? parseInt(maxPrice) : null
    };

    const result = await searchService.search(q || '', filters);
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
});

app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await searchService.getSuggestions(q);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, data: [] });
  }
});

// ====================
// 💳 ROUTES PAIEMENT (SIMULATION)
// ====================

const paymentService = {
  processOrangeMoneyPayment: async (paymentData) => {
    return {
      success: true,
      transactionId: 'OM_' + Date.now(),
      message: 'Paiement Orange Money traité avec succès'
    };
  },
  
  processWavePayment: async (paymentData) => {
    return {
      success: true,
      transactionId: 'WAVE_' + Date.now(),
      message: 'Paiement Wave traité avec succès'
    };
  },
  
  processCardPayment: async (paymentData) => {
    return {
      success: true,
      transactionId: 'CARD_' + Date.now(),
      message: 'Paiement par carte traité avec succès'
    };
  }
};

app.post('/api/payments/orange-money', async (req, res) => {
  try {
    const result = await paymentService.processOrangeMoneyPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/payments/wave', async (req, res) => {
  try {
    const result = await paymentService.processWavePayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/payments/card', async (req, res) => {
  try {
    const result = await paymentService.processCardPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ====================
// 🚨 GESTION D'ERREURS
// ====================

// Route catch-all pour servir le frontend
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    console.log('❌ Route API non trouvée:', req.originalUrl);
    return res.status(404).json({
      success: false,
      message: 'Route API non trouvée',
      path: req.originalUrl
    });
  }
  
  console.log('🌐 Servir frontend pour:', req.originalUrl);
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Gestion des erreurs globale
app.use((error, req, res, next) => {
  console.error('🔥 Erreur serveur:', error);
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
  console.log('📁 Structure détectée:');
  console.log('   • backend/ → API Server');
  console.log('   • frontend/ → Application Web');
  console.log('✨ ======================================');
  console.log('🛡️  Routes protégées disponibles:');
  console.log('   • GET  /api/auth/profile');
  console.log('   • PUT  /api/auth/profile');
  console.log('   • POST /api/auth/change-password');
  console.log('   • POST /api/reservations');
  console.log('   • GET  /api/reservations');
  console.log('✨ ======================================');
  console.log('🗺️  Routes disponibles:');
  console.log('   • GET  /api/salons/nearby');
  console.log('   • GET  /api/search/salons');
  console.log('   • GET  /api/search/suggestions');
  console.log('   • POST /api/payments/orange-money');
  console.log('   • POST /api/payments/wave');
  console.log('   • POST /api/payments/card');
  console.log('✨ ======================================');
  console.log('🎯 Pages frontend:');
  console.log('   • / → index.html');
  console.log('   • /login.html → Connexion');
  console.log('   • /profile.html → Profil');
  console.log('   • /mes-reservations.html → Réservations');
  console.log('   • /dashboard-coiffeur.html → Dashboard coiffeur');
  console.log('✨ ======================================\n');
});