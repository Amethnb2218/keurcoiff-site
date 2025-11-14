const express = require('express');
const Salon = require('../models/Salon');
const router = express.Router();

// POST /api/chatbot - Endpoint du chatbot
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await processChatbotMessage(message);
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Désolé, je rencontre un problème technique',
      error: error.message 
    });
  }
});

// Fonction de traitement des messages du chatbot
async function processChatbotMessage(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Recherche de salon
  if (lowerMessage.includes('salon') || lowerMessage.includes('trouver') || lowerMessage.includes('coiffeur')) {
    let service = '';
    
    if (lowerMessage.includes('tress') || lowerMessage.includes('vanill')) {
      service = 'tresses';
    } else if (lowerMessage.includes('coupe')) {
      service = 'coupe';
    } else if (lowerMessage.includes('dégradé')) {
      service = 'dégradé';
    }
    
    const salons = await Salon.find({
      'services.name': new RegExp(service, 'i'),
      isVerified: true
    }).limit(3);
    
    if (salons.length === 0) {
      return {
        success: true,
        type: 'text',
        message: `Je n'ai pas trouvé de salon spécialisé en ${service}. Essayez avec un autre terme.`,
        suggestions: ['Tresses', 'Coupe femme', 'Dégradé homme']
      };
    }
    
    return {
      success: true,
      type: 'salons_list',
      message: `Voici ${salons.length} salons spécialisés en ${service} :`,
      data: salons,
      suggestions: ['Réserver maintenant', 'Voir plus de salons']
    };
  }
  
  // Conseils de style
  if (lowerMessage.includes('conseil') || lowerMessage.includes('style')) {
    return {
      success: true,
      type: 'style_advice',
      message: 'Je peux vous conseiller ! Pour quelle occasion ?',
      suggestions: ['Mariage', 'Travail', 'Quotidien', 'Soirée']
    };
  }
  
  // Prix
  if (lowerMessage.includes('prix') || lowerMessage.includes('combien')) {
    return {
      success: true,
      type: 'prices',
      message: '💰 **Prix moyens à Dakar :**\n• Tresses : 3 000 - 8 000 FCFA\n• Coupe femme : 4 000 - 7 000 FCFA\n• Coupe homme : 2 000 - 4 000 FCFA\n• Dégradé : 3 000 - 6 000 FCFA',
      suggestions: ['Trouver salon pas cher', 'Voir promotions']
    };
  }
  
  // Message par défaut
  return {
    success: true,
    type: 'welcome',
    message: '👋 Bonjour ! Je suis l\'assistant KeurCoiff\' 🤖\nJe peux vous aider à :\n• Trouver des salons\n• Voir les prix\n• Trouver un service à domicile\n\nQue cherchez-vous ?',
    suggestions: ['Trouver un salon', 'Connaître les prix', 'Service à domicile']
  };
}

module.exports = router;