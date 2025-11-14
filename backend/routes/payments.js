const express = require('express');
const Reservation = require('../models/Reservation');
const router = express.Router();

// POST /api/payments/initiate - Initialiser un paiement
router.post('/initiate', async (req, res) => {
  try {
    const { reservationId, method, phone } = req.body;
    
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    // Simulation de paiement mobile money
    const paymentResult = await simulateMobileMoneyPayment({
      amount: reservation.service.price,
      phone,
      method
    });
    
    if (paymentResult.success) {
      reservation.payment.status = 'paid';
      reservation.payment.transactionId = paymentResult.transactionId;
      reservation.status = 'confirmed';
      await reservation.save();
      
      res.json({
        success: true,
        message: 'Paiement effectué avec succès',
        data: {
          transactionId: paymentResult.transactionId,
          amount: paymentResult.amount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Échec du paiement'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du paiement',
      error: error.message
    });
  }
});

// Simulation de paiement mobile money
async function simulateMobileMoneyPayment({ amount, phone, method }) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: 'TX_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        amount,
        method,
        timestamp: new Date()
      });
    }, 2000);
  });
}

module.exports = router;