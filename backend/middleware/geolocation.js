// backend/middleware/geolocation.js
const Salon = require('../models/Salon');

class GeolocationService {
    constructor() {
        this.earthRadiusKm = 6371;
    }

    // Convertir degrés en radians
    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Calculer la distance entre deux points (formule Haversine)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLon = this.degreesToRadians(lon2 - lon1);

        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.degreesToRadians(lat1)) * 
            Math.cos(this.degreesToRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = this.earthRadiusKm * c;

        return distance;
    }

    // Middleware pour trouver les salons proches
    async findNearbySalons(req, res, next) {
        try {
            const { latitude, longitude, maxDistance = 5 } = req.query;

            if (!latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'Coordonnées GPS requises (latitude, longitude)'
                });
            }

            const userLat = parseFloat(latitude);
            const userLon = parseFloat(longitude);
            const maxDist = parseFloat(maxDistance);

            // Récupérer tous les salons actifs
            const salons = await Salon.find({ 
                isActive: true,
                isVerified: true,
                'location.coordinates': { $exists: true }
            });

            // Filtrer par distance
            const nearbySalons = salons.filter(salon => {
                const salonLat = salon.location.coordinates.lat;
                const salonLon = salon.location.coordinates.lng;

                if (!salonLat || !salonLon) return false;

                const distance = this.calculateDistance(
                    userLat, userLon, salonLat, salonLon
                );

                // Ajouter la distance au salon
                salon._doc.distance = Math.round(distance * 100) / 100; // 2 décimales
                return distance <= maxDist;
            });

            // Trier par distance
            nearbySalons.sort((a, b) => a._doc.distance - b._doc.distance);

            res.json({
                success: true,
                data: nearbySalons,
                count: nearbySalons.length,
                userLocation: { latitude: userLat, longitude: userLon },
                maxDistance: maxDist
            });

        } catch (error) {
            console.error('❌ Erreur recherche salons proches:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la recherche des salons proches'
            });
        }
    }

    // Calculer le temps de trajet estimé
    estimateTravelTime(distanceKm, traffic = 'normal') {
        const averageSpeed = {
            normal: 30, // km/h en ville
            heavy: 15,  // km/h embouteillages
            light: 40   // km/h circulation fluide
        };

        const speed = averageSpeed[traffic] || averageSpeed.normal;
        const timeHours = distanceKm / speed;
        const timeMinutes = Math.round(timeHours * 60);

        return {
            minutes: timeMinutes,
            traffic: traffic,
            distance: distanceKm
        };
    }

    // Géocodage d'une adresse (simulation)
    async geocodeAddress(address) {
        // En production, intégrer avec Google Maps API ou OpenStreetMap
        const mockCoordinates = {
            'Plateau, Dakar': { lat: 14.6928, lng: -17.4467 },
            'Ouakam, Dakar': { lat: 14.7245, lng: -17.4810 },
            'Almadies, Dakar': { lat: 14.7390, lng: -17.5166 },
            'Mermoz, Dakar': { lat: 14.7065, lng: -17.4670 }
        };

        return mockCoordinates[address] || null;
    }

    // Nouvelle méthode pour obtenir la localisation par IP (backend)
    async getLocationByIP(ip) {
        try {
            // Simulation - en production utiliser un service comme ipapi, ipgeolocation.io
            const mockIPLocation = {
                lat: 14.6928,
                lng: -17.4467,
                city: 'Dakar',
                country: 'Senegal',
                region: 'Dakar'
            };
            
            return mockIPLocation;
        } catch (error) {
            console.error('Erreur géolocalisation IP:', error);
            return null;
        }
    }
}

// Export correct pour Node.js - SUPPRIMER la ligne window
module.exports = new GeolocationService();