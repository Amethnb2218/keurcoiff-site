// backend/services/searchService.js
const Salon = require('../models/Salon');

class SearchService {
    constructor() {
        this.searchIndex = [];
    }

    // Construire l'index de recherche
    async buildSearchIndex() {
        try {
            const salons = await Salon.find({ isActive: true, isVerified: true });
            
            this.searchIndex = salons.map(salon => ({
                id: salon._id,
                name: salon.name,
                location: salon.location,
                services: salon.services,
                features: salon.features,
                rating: salon.rating,
                searchText: this.generateSearchText(salon)
            }));

            console.log(`✅ Index de recherche construit: ${this.searchIndex.length} salons`);
        } catch (error) {
            console.error('❌ Erreur construction index recherche:', error);
        }
    }

    // Générer le texte de recherche
    generateSearchText(salon) {
        const servicesText = salon.services.map(s => s.name).join(' ');
        const featuresText = Object.entries(salon.features)
            .filter(([key, value]) => value)
            .map(([key]) => key)
            .join(' ');

        return `
            ${salon.name}
            ${salon.location.quarter}
            ${salon.location.city}
            ${salon.location.address}
            ${servicesText}
            ${featuresText}
        `.toLowerCase().trim();
    }

    // Recherche avancée
    async search(query, filters = {}) {
        try {
            // Reconstruire l'index si vide
            if (this.searchIndex.length === 0) {
                await this.buildSearchIndex();
            }

            const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
            
            let results = this.searchIndex.filter(item => {
                // Recherche textuelle
                const textMatch = searchTerms.length === 0 || 
                    searchTerms.every(term => item.searchText.includes(term));

                // Application des filtres
                const filterMatch = this.applyFilters(item, filters);

                return textMatch && filterMatch;
            });

            // Tri par pertinence
            results = this.sortByRelevance(results, searchTerms);

            // Récupérer les documents complets
            const salonIds = results.map(result => result.id);
            const fullSalons = await Salon.find({ _id: { $in: salonIds } });

            // Préserver l'ordre de tri
            const sortedSalons = salonIds.map(id => 
                fullSalons.find(salon => salon._id.toString() === id)
            ).filter(salon => salon);

            return {
                success: true,
                data: sortedSalons,
                count: sortedSalons.length,
                query: query,
                filters: filters
            };

        } catch (error) {
            console.error('❌ Erreur recherche:', error);
            return {
                success: false,
                message: 'Erreur lors de la recherche',
                data: [],
                count: 0
            };
        }
    }

    // Appliquer les filtres
    applyFilters(item, filters) {
        let match = true;

        if (filters.quarter && item.location.quarter !== filters.quarter) {
            match = false;
        }

        if (filters.city && item.location.city !== filters.city) {
            match = false;
        }

        if (filters.service) {
            const hasService = item.services.some(s => 
                s.name.toLowerCase().includes(filters.service.toLowerCase())
            );
            if (!hasService) match = false;
        }

        if (filters.homeService && !item.features.homeService) {
            match = false;
        }

        if (filters.mobilePayment && !item.features.mobilePayment) {
            match = false;
        }

        if (filters.minRating && item.rating.average < filters.minRating) {
            match = false;
        }

        if (filters.maxPrice) {
            const hasAffordableService = item.services.some(s => s.price <= filters.maxPrice);
            if (!hasAffordableService) match = false;
        }

        return match;
    }

    // Trier par pertinence
    sortByRelevance(results, searchTerms) {
        return results.sort((a, b) => {
            const aScore = this.calculateRelevanceScore(a, searchTerms);
            const bScore = this.calculateRelevanceScore(b, searchTerms);
            
            return bScore - aScore;
        });
    }

    // Calculer le score de pertinence
    calculateRelevanceScore(item, searchTerms) {
        let score = 0;

        searchTerms.forEach(term => {
            if (item.name.toLowerCase().includes(term)) {
                score += 10; // Nom du salon
            }
            if (item.location.quarter.toLowerCase().includes(term)) {
                score += 8; // Quartier
            }
            if (item.searchText.includes(term)) {
                score += 5; // Autres correspondances
            }
        });

        // Bonus pour la note
        if (item.rating?.average) {
            score += item.rating.average * 2;
        }

        // Bonus pour les services à domicile
        if (item.features.homeService) {
            score += 3;
        }

        return score;
    }

    // Suggérer des termes de recherche
    async getSuggestions(query) {
        if (!query || query.length < 2) {
            return { success: true, data: [] };
        }

        try {
            if (this.searchIndex.length === 0) {
                await this.buildSearchIndex();
            }

            const suggestions = new Set();
            const queryLower = query.toLowerCase();

            this.searchIndex.forEach(item => {
                // Suggestions basées sur le nom
                if (item.name.toLowerCase().includes(queryLower)) {
                    suggestions.add(item.name);
                }

                // Suggestions basées sur les services
                item.services.forEach(service => {
                    if (service.name.toLowerCase().includes(queryLower)) {
                        suggestions.add(service.name);
                    }
                });

                // Suggestions basées sur le quartier
                if (item.location.quarter.toLowerCase().includes(queryLower)) {
                    suggestions.add(item.location.quarter);
                }

                // Suggestions basées sur la ville
                if (item.location.city.toLowerCase().includes(queryLower)) {
                    suggestions.add(item.location.city);
                }
            });

            return {
                success: true,
                data: Array.from(suggestions).slice(0, 8),
                query: query
            };

        } catch (error) {
            console.error('❌ Erreur suggestions:', error);
            return { success: false, data: [] };
        }
    }
}

module.exports = new SearchService();