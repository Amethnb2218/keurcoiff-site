// backend/middleware/geolocation-fixed.js
const Salon = require('../models/Salon');

class GeolocationService {
    constructor() {
        this.earthRadiusKm = 6371;
    }

    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLon = this.degreesToRadians(lon2 - lon1);

        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.degreesToRadians(lat1)) * 
            Math.cos(this.degreesToRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.earthRadiusKm * c;
    }

    async findNearbySalons(req, res, next) {
        try {
            const { latitude, longitude, maxDistance = 5 } = req.query;

            if (!latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'Coordonnées GPS requises'
                });
            }

            const userLat = parseFloat(latitude);
            const userLon = parseFloat(longitude);
            const maxDist = parseFloat(maxDistance);

            const salons = await Salon.find({ 
                isActive: true,
                isVerified: true,
                'location.coordinates': { $exists: true }
            });

            const nearbySalons = salons.filter(salon => {
                const salonLat = salon.location.coordinates.lat;
                const salonLon = salon.location.coordinates.lng;

                if (!salonLat || !salonLon) return false;

                const distance = this.calculateDistance(userLat, userLon, salonLat, salonLon);
                salon._doc.distance = Math.round(distance * 100) / 100;
                return distance <= maxDist;
            });

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
}

module.exports = new GeolocationService();