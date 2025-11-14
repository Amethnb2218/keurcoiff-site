// backend/services/paymentService.js
const axios = require('axios');

class PaymentService {
    constructor() {
        // Clés API (à mettre dans les variables d'environnement)
        this.orangeMoneyConfig = {
            baseURL: process.env.ORANGE_MONEY_URL || 'https://api.orange.com',
            merchantKey: process.env.ORANGE_MERCHANT_KEY,
            authToken: process.env.ORANGE_AUTH_TOKEN
        };

        this.waveConfig = {
            baseURL: process.env.WAVE_URL || 'https://api.wave.com',
            apiKey: process.env.WAVE_API_KEY,
            secretKey: process.env.WAVE_SECRET_KEY
        };
    }

    // Traitement paiement Orange Money
    async processOrangeMoneyPayment(paymentData) {
        try {
            const { phoneNumber, amount, pin, description } = paymentData;

            // Simulation - En production, utiliser l'API Orange Money
            console.log(`💸 Simulation paiement Orange Money: ${amount} FCFA -> ${phoneNumber}`);

            // Vérification du format du numéro
            if (!this.validatePhoneNumber(phoneNumber)) {
                throw new Error('Numéro de téléphone invalide');
            }

            // Vérification du montant
            if (amount < 100 || amount > 1000000) {
                throw new Error('Montant invalide (min: 100 FCFA, max: 1,000,000 FCFA)');
            }

            // Simulation du traitement
            await this.simulatePaymentProcessing();

            // En production, appeler l'API Orange Money réelle
            // const response = await axios.post(`${this.orangeMoneyConfig.baseURL}/payment`, {
            //     recipient: phoneNumber,
            //     amount: amount,
            //     pin: pin,
            //     description: description
            // }, {
            //     headers: {
            //         'Authorization': `Bearer ${this.orangeMoneyConfig.authToken}`,
            //         'Content-Type': 'application/json'
            //     }
            // });

            return {
                success: true,
                transactionId: this.generateTransactionId('OM'),
                amount: amount,
                method: 'orange_money',
                status: 'completed',
                timestamp: new Date(),
                message: 'Paiement Orange Money traité avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur paiement Orange Money:', error);
            return {
                success: false,
                error: error.message,
                method: 'orange_money',
                status: 'failed'
            };
        }
    }

    // Traitement paiement Wave
    async processWavePayment(paymentData) {
        try {
            const { phoneNumber, amount, pin, description } = paymentData;

            // Simulation - En production, utiliser l'API Wave
            console.log(`💸 Simulation paiement Wave: ${amount} FCFA -> ${phoneNumber}`);

            // Vérifications
            if (!this.validatePhoneNumber(phoneNumber)) {
                throw new Error('Numéro de téléphone invalide');
            }

            if (amount < 100 || amount > 1000000) {
                throw new Error('Montant invalide');
            }

            // Simulation du traitement
            await this.simulatePaymentProcessing();

            return {
                success: true,
                transactionId: this.generateTransactionId('WV'),
                amount: amount,
                method: 'wave',
                status: 'completed',
                timestamp: new Date(),
                message: 'Paiement Wave traité avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur paiement Wave:', error);
            return {
                success: false,
                error: error.message,
                method: 'wave',
                status: 'failed'
            };
        }
    }

    // Traitement paiement carte bancaire
    async processCardPayment(paymentData) {
        try {
            const { cardNumber, expiry, cvv, amount, cardholderName } = paymentData;

            console.log(`💳 Simulation paiement carte: ${amount} FCFA`);

            // Vérification des données carte
            if (!this.validateCardNumber(cardNumber)) {
                throw new Error('Numéro de carte invalide');
            }

            if (!this.validateExpiryDate(expiry)) {
                throw new Error('Date d\'expiration invalide');
            }

            if (!this.validateCVV(cvv)) {
                throw new Error('Code CVV invalide');
            }

            // Simulation traitement
            await this.simulatePaymentProcessing();

            return {
                success: true,
                transactionId: this.generateTransactionId('CB'),
                amount: amount,
                method: 'card',
                status: 'completed',
                timestamp: new Date(),
                message: 'Paiement carte traité avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur paiement carte:', error);
            return {
                success: false,
                error: error.message,
                method: 'card',
                status: 'failed'
            };
        }
    }

    // Vérifier le statut d'une transaction
    async checkTransactionStatus(transactionId) {
        // Simulation - En production, interroger l'API du processeur
        const statuses = ['pending', 'completed', 'failed', 'refunded'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        return {
            transactionId: transactionId,
            status: randomStatus,
            checkedAt: new Date()
        };
    }

    // Remboursement
    async processRefund(transactionId, amount) {
        try {
            console.log(`🔄 Traitement remboursement: ${transactionId} - ${amount} FCFA`);

            // Simulation traitement remboursement
            await new Promise(resolve => setTimeout(resolve, 2000));

            return {
                success: true,
                refundId: this.generateTransactionId('RF'),
                originalTransaction: transactionId,
                amount: amount,
                status: 'completed',
                timestamp: new Date(),
                message: 'Remboursement traité avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur remboursement:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Méthodes utilitaires
    validatePhoneNumber(phone) {
        const phoneRegex = /^(77|76|70|78)[0-9]{7}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    validateCardNumber(cardNumber) {
        const cardRegex = /^[0-9]{16}$/;
        return cardRegex.test(cardNumber.replace(/\s/g, ''));
    }

    validateExpiryDate(expiry) {
        const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        return expiryRegex.test(expiry);
    }

    validateCVV(cvv) {
        const cvvRegex = /^[0-9]{3,4}$/;
        return cvvRegex.test(cvv);
    }

    generateTransactionId(prefix) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}_${timestamp}_${random}`.toUpperCase();
    }

    async simulatePaymentProcessing() {
        // Simulation délai traitement
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Générer un rapport de transactions
    generateTransactionReport(transactions, startDate, endDate) {
        const filtered = transactions.filter(tx => {
            const txDate = new Date(tx.timestamp);
            return txDate >= new Date(startDate) && txDate <= new Date(endDate);
        });

        const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);
        const successful = filtered.filter(tx => tx.status === 'completed').length;
        const failed = filtered.filter(tx => tx.status === 'failed').length;

        return {
            period: { startDate, endDate },
            summary: {
                totalTransactions: filtered.length,
                successfulTransactions: successful,
                failedTransactions: failed,
                successRate: ((successful / filtered.length) * 100).toFixed(2) + '%',
                totalAmount: totalAmount,
                averageTransaction: totalAmount / filtered.length
            },
            byMethod: this.groupByMethod(filtered),
            transactions: filtered
        };
    }

    groupByMethod(transactions) {
        const groups = {};
        transactions.forEach(tx => {
            if (!groups[tx.method]) {
                groups[tx.method] = {
                    count: 0,
                    totalAmount: 0,
                    successCount: 0
                };
            }
            groups[tx.method].count++;
            groups[tx.method].totalAmount += tx.amount;
            if (tx.status === 'completed') {
                groups[tx.method].successCount++;
            }
        });
        return groups;
    }
}

module.exports = new PaymentService();