// scripts/seedDatabase.js - VERSION AMÉLIORÉE
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Salon = require('../models/Salon');
const Reservation = require('../models/Reservation');

// Données de test COMPLÈTES
const sampleUsers = [
  {
    phone: '771234567',
    fullName: 'Awa Diop',
    password: 'password123',
    location: {
      address: 'Rue 10, Plateau',
      quarter: 'Plateau',
      city: 'Dakar',
      coordinates: { lat: 14.6928, lng: -17.4467 }
    },
    isVerified: true
  },
  {
    phone: '772345678', 
    fullName: 'Ibrahima Ndiaye',
    password: 'password123',
    location: {
      address: 'Rue 15, Ouakam',
      quarter: 'Ouakam',
      city: 'Dakar',
      coordinates: { lat: 14.7245, lng: -17.4810 }
    },
    isVerified: true
  },
  {
    phone: '773456789',
    fullName: 'Fatou Sarr',
    password: 'password123', 
    location: {
      address: 'Almadies',
      quarter: 'Almadies',
      city: 'Dakar',
      coordinates: { lat: 14.7390, lng: -17.5166 }
    },
    isVerified: true
  }
];

const sampleSalons = [
  {
    name: "Salon Awa Beauty",
    owner: {
      name: "Awa Diop",
      phone: "771234567",
      email: "awa.salon@example.com"
    },
    location: {
      address: "Rue 10, Plateau",
      quarter: "Plateau", 
      city: "Dakar",
      coordinates: { lat: 14.6928, lng: -17.4467 }
    },
    contact: {
      phone: "771234567",
      whatsapp: "771234567",
      email: "awa.salon@example.com"
    },
    services: [
      {
        name: "Tresses simples",
        price: 4000,
        duration: 120,
        category: "femme"
      },
      {
        name: "Tresses vanilles", 
        price: 8000,
        duration: 180,
        category: "femme"
      },
      {
        name: "Pose weave",
        price: 15000,
        duration: 120,
        category: "femme"
      }
    ],
    openingHours: {
      monday: { open: "08:00", close: "20:00" },
      tuesday: { open: "08:00", close: "20:00" },
      wednesday: { open: "08:00", close: "20:00" },
      thursday: { open: "08:00", close: "20:00" },
      friday: { open: "08:00", close: "20:00" },
      saturday: { open: "09:00", close: "18:00" },
      sunday: { closed: true }
    },
    features: {
      homeService: true,
      mobilePayment: true,
      parking: true,
      wifi: true
    },
    rating: {
      average: 4.8,
      count: 47
    },
    isVerified: true,
    isActive: true
  },
  {
    name: "Chez Ibra - Coiffeur Homme",
    owner: {
      name: "Ibrahima Ndiaye",
      phone: "772345678"
    },
    location: {
      address: "Rue des artisans, Ouakam",
      quarter: "Ouakam",
      city: "Dakar", 
      coordinates: { lat: 14.7245, lng: -17.4810 }
    },
    contact: {
      phone: "772345678",
      whatsapp: "772345678"
    },
    services: [
      {
        name: "Coupe homme",
        price: 2500,
        duration: 45,
        category: "homme"
      },
      {
        name: "Dégradé",
        price: 4000, 
        duration: 60,
        category: "homme"
      },
      {
        name: "Tresses homme",
        price: 5000,
        duration: 90,
        category: "homme" 
      }
    ],
    openingHours: {
      monday: { open: "07:00", close: "22:00" },
      tuesday: { open: "07:00", close: "22:00" },
      wednesday: { open: "07:00", close: "22:00" },
      thursday: { open: "07:00", close: "22:00" },
      friday: { open: "07:00", close: "22:00" },
      saturday: { open: "08:00", close: "20:00" },
      sunday: { open: "09:00", close: "18:00" }
    },
    features: {
      homeService: true,
      mobilePayment: true
    },
    rating: {
      average: 4.9,
      count: 89
    },
    isVerified: true,
    isActive: true
  },
  {
    name: "Beauty Dakar - Spa & Coiffure",
    owner: {
      name: "Sophie Ndiaye", 
      phone: "774567890",
      email: "beauty.dakar@example.com"
    },
    location: {
      address: "Route de la Corniche, Almadies",
      quarter: "Almadies",
      city: "Dakar",
      coordinates: { lat: 14.7390, lng: -17.5166 }
    },
    contact: {
      phone: "774567890",
      whatsapp: "774567890", 
      email: "beauty.dakar@example.com"
    },
    services: [
      {
        name: "Coupe et brushing",
        price: 8000,
        duration: 90,
        category: "femme"
      },
      {
        name: "Tresses artistiques",
        price: 12000,
        duration: 180,
        category: "femme"
      },
      {
        name: "Soins cheveux",
        price: 6000,
        duration: 60, 
        category: "femme"
      }
    ],
    openingHours: {
      monday: { open: "09:00", close: "19:00" },
      tuesday: { open: "09:00", close: "19:00" },
      wednesday: { open: "09:00", close: "19:00" },
      thursday: { open: "09:00", close: "19:00" },
      friday: { open: "09:00", close: "19:00" },
      saturday: { open: "10:00", close: "18:00" },
      sunday: { closed: true }
    },
    features: {
      homeService: false,
      mobilePayment: true,
      parking: true,
      wifi: true
    },
    rating: {
      average: 4.7,
      count: 124
    },
    isVerified: true,
    isActive: true
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Début du seeding de la base de données...');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Nettoyer les collections
    console.log('🧹 Nettoyage des collections...');
    await User.deleteMany({});
    await Salon.deleteMany({}); 
    await Reservation.deleteMany({});

    // Créer les utilisateurs
    console.log('👥 Création des utilisateurs...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`   ✅ ${user.fullName} (${user.phone})`);
    }

    // Créer les salons  
    console.log('💇 Création des salons...');
    const createdSalons = [];
    for (const salonData of sampleSalons) {
      const salon = new Salon(salonData);
      await salon.save();
      createdSalons.push(salon);
      console.log(`   ✅ ${salon.name} - ${salon.location.quarter}`);
    }

    console.log('\n🎉 ======================================');
    console.log('✅ BASE DE DONNÉES PEUPLÉE AVEC SUCCÈS!');
    console.log('======================================');
    console.log(`👥 ${createdUsers.length} utilisateurs créés`);
    console.log(`💇 ${createdSalons.length} salons créés`);
    console.log('🌐 Testez: http://localhost:5000/api/salons');
    console.log('======================================\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
};

seedDatabase();