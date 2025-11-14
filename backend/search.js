class AdvancedSearch {
  constructor() {
    this.index = null;
    this.salons = [];
  }

  // Initialiser l'index de recherche
  async initialize(salons) {
    this.salons = salons;
    this.buildSearchIndex();
  }

  // Construire l'index de recherche
  buildSearchIndex() {
    this.index = this.salons.map(salon => ({
      id: salon.id,
      name: salon.name,
      location: salon.location,
      services: salon.services,
      features: salon.features,
      searchText: this.generateSearchText(salon)
    }));
  }

  // Générer le texte de recherche
  generateSearchText(salon) {
    return `
      ${salon.name}
      ${salon.location.quarter}
      ${salon.location.city}
      ${salon.location.address}
      ${salon.services.map(s => s.name).join(' ')}
      ${salon.features.homeService ? 'domicile à domicile' : ''}
      ${salon.features.mobilePayment ? 'orange money wave paiement mobile' : ''}
    `.toLowerCase();
  }

  // Recherche avec plusieurs critères
  search(query, filters = {}) {
    if (!this.index) return [];

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    let results = this.index.filter(item => {
      // Recherche textuelle
      const textMatch = searchTerms.every(term => 
        item.searchText.includes(term)
      );

      // Filtres avancés
      const filterMatch = this.applyFilters(item, filters);

      return textMatch && filterMatch;
    });

    // Tri par pertinence
    results = this.sortByRelevance(results, searchTerms);

    return results.map(result => 
      this.salons.find(salon => salon.id === result.id)
    );
  }

  // Appliquer les filtres
  applyFilters(item, filters) {
    let match = true;

    if (filters.quarter && item.location.quarter !== filters.quarter) {
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

    if (filters.minRating && item.rating.average < filters.minRating) {
      match = false;
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
    const text = item.searchText;

    searchTerms.forEach(term => {
      if (item.name.toLowerCase().includes(term)) {
        score += 10; // Nom du salon
      }
      if (item.location.quarter.toLowerCase().includes(term)) {
        score += 8; // Quartier
      }
      if (text.includes(term)) {
        score += 5; // Autres correspondances
      }
    });

    // Bonus pour la note
    const salon = this.salons.find(s => s.id === item.id);
    if (salon?.rating?.average) {
      score += salon.rating.average * 2;
    }

    return score;
  }

  // Suggérer des termes de recherche
  getSuggestions(query) {
    if (!query || query.length < 2) return [];

    const terms = new Set();
    
    this.index.forEach(item => {
      // Suggestions basées sur le nom
      if (item.name.toLowerCase().includes(query.toLowerCase())) {
        terms.add(item.name);
      }

      // Suggestions basées sur les services
      item.services.forEach(service => {
        if (service.name.toLowerCase().includes(query.toLowerCase())) {
          terms.add(service.name);
        }
      });

      // Suggestions basées sur le quartier
      if (item.location.quarter.toLowerCase().includes(query.toLowerCase())) {
        terms.add(item.location.quarter);
      }
    });

    return Array.from(terms).slice(0, 5);
  }
}

// Export pour utilisation globale
window.AdvancedSearch = AdvancedSearch;