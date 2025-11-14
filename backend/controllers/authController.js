const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Générer token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Inscription
exports.register = async (req, res) => {
  try {
    const { phone, fullName, password, email } = req.body;

    // Vérifier si l'utilisateur existe
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec ce téléphone existe déjà.'
      });
    }

    // Créer l'utilisateur
    const user = new User({
      phone,
      fullName,
      password,
      email: email || undefined
    });

    await user.save();

    // Générer token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie !',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// Connexion
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone ou mot de passe incorrect.'
      });
    }

    // Vérifier le mot de passe
    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Téléphone ou mot de passe incorrect.'
      });
    }

    // Générer token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Connexion réussie !',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
};

// Profil utilisateur
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
};

// Mettre à jour le profil
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, location } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        fullName, 
        email, 
        location,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message
    });
  }
};