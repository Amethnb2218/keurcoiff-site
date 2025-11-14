const express = require('express');
const Reservation = require('../models/Reservation');
const Salon = require('../models/Salon');
const router = express.Router();

// GET /api/reservations - Récupérer les réservations
router.get('/', async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('user', 'fullName phone')
      .populate('salon', 'name location');
    
    res.json({
      success: true,
      data: reservations,
      count: reservations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations',
      error: error.message
    });
  }
});

// POST /api/reservations - Créer une réservation
router.post('/', async (req, res) => {
  try {
    const { userId, salonId, service, dateTime, notes } = req.body;

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon non trouvé'
      });
    }

    const selectedService = salon.services.find(s => s.name === service);
    if (!selectedService) {
      return res.status(400).json({
        success: false,
        message: 'Service non disponible'
      });
    }

    const reservation = new Reservation({
      user: userId,
      salon: salonId,
      service: {
        name: selectedService.name,
        price: selectedService.price,
        duration: selectedService.duration
      },
      dateTime,
      notes
    });

    await reservation.save();

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation',
      error: error.message
    });
  }
});

module.exports = router;