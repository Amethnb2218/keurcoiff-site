const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // en minutes
    required: true
  },
  category: {
    type: String,
    enum: ['femme', 'homme', 'enfant', 'autre'],
    required: true
  },
  description: String
});

const salonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du salon est obligatoire'],
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  location: {
    address: String,
    quarter: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true,
      default: 'Dakar'
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    phone: {
      type: String,
      required: true
    },
    whatsapp: String,
    email: String
  },
  services: [serviceSchema],
  openingHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
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
    },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  features: {
    homeService: { type: Boolean, default: false },
    mobilePayment: { type: Boolean, default: true },
    parking: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    airConditioning: { type: Boolean, default: false },
    accessibility: { type: Boolean, default: false }
  },
  photos: [String],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour la recherche
salonSchema.index({ 'location.city': 1, 'location.quarter': 1 });
salonSchema.index({ 'services.name': 'text', name: 'text' });

module.exports = mongoose.model('Salon', salonSchema);