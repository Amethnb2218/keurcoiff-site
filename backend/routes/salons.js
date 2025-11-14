const express = require('express');
const Salon = require('../models/Salon');
const router = express.Router();

// GET /api/salons - Recherche des salons
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, city = 'Dakar', service, homeService } = req.query;
    
    let filter = { isVerified: true, isActive: true };
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (service) filter['services.name'] = new RegExp(service, 'i');
    if (homeService === 'true') filter['features.homeService'] = true;

    const salons = await Salon.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'rating.average': -1 });

    const total = await Salon.countDocuments(filter);

    res.json({
      success: true,
      data: salons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche des salons',
      error: error.message
    });
  }
});

// GET /api/salons/:id - Détails d'un salon
router.get('/:id', async (req, res) => {
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
      data: salon
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// POST /api/salons/register - Inscription nouveau salon
router.post('/register', async (req, res) => {
  try {
    const salon = new Salon(req.body);
    await salon.save();

    res.status(201).json({
      success: true,
      message: 'Salon enregistré avec succès. En attente de vérification.',
      data: {
        id: salon._id,
        name: salon.name
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription du salon',
      error: error.message
    });
  }
});

module.exports = router;