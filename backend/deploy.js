// backend/utils/deploy.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentManager {
    constructor() {
        this.config = {
            version: '2.0.0',
            frontendDir: '../frontend',
            backendDir: '.',
            buildDir: '../dist',
            environments: {
                development: {
                    apiUrl: 'http://localhost:5000',
                    frontendUrl: 'http://localhost:5500'
                },
                production: {
                    apiUrl: 'https://api.keurcoiff.sn',
                    frontendUrl: 'https://keurcoiff.sn'
                }
            }
        };
    }

    // Déploiement complet
    async deploy(environment = 'production') {
        console.log(`🚀 Déploiement KeurCoiff' ${environment.toUpperCase()}...\n`);

        try {
            // 1. Validation de l'environnement
            this.validateEnvironment(environment);

            // 2. Préparation des fichiers
            console.log('📦 Préparation des fichiers...');
            await this.prepareFiles(environment);

            // 3. Construction du frontend
            console.log('🎨 Construction du frontend...');
            await this.buildFrontend();

            // 4. Construction du backend
            console.log('⚙️  Construction du backend...');
            await this.buildBackend();

            // 5. Génération des fichiers de configuration
            console.log('📋 Génération des configurations...');
            await this.generateConfigFiles(environment);

            // 6. Optimisation des performances
            console.log '⚡ Optimisation des performances...');
            await this.optimizePerformance();

            // 7. Vérification finale
            console.log '✅ Vérification finale...');
            await this.finalCheck();

            console.log('\n🎉 Déploiement terminé avec succès !');
            console.log(`🌐 URL: ${this.config.environments[environment].frontendUrl}`);
            console.log(`🔧 Environnement: ${environment.toUpperCase()}`);
            console.log(`📊 Version: ${this.config.version}`);

        } catch (error) {
            console.error('\n❌ Erreur lors du déploiement:', error.message);
            process.exit(1);
        }
    }

    validateEnvironment(environment) {
        if (!this.config.environments[environment]) {
            throw new Error(`Environnement "${environment}" non configuré`);
        }

        // Vérifier que Node.js est installé
        try {
            execSync('node --version', { stdio: 'pipe' });
        } catch {
            throw new Error('Node.js n\'est pas installé');
        }

        console.log('✅ Environnement validé');
    }

    async prepareFiles(environment) {
        const buildPath = path.join(__dirname, this.config.buildDir);
        
        // Créer le dossier de build
        if (fs.existsSync(buildPath)) {
            fs.rmSync(buildPath, { recursive: true });
        }
        fs.mkdirSync(buildPath, { recursive: true });

        // Créer la structure de dossiers
        const dirs = ['', '/api', '/css', '/js', '/images', '/icons'];
        dirs.forEach(dir => {
            fs.mkdirSync(path.join(buildPath, dir), { recursive: true });
        });

        console.log('✅ Structure de dossiers créée');
    }

    async buildFrontend() {
        const frontendPath = path.join(__dirname, this.config.frontendDir);
        const buildPath = path.join(__dirname, this.config.buildDir);

        // Copier les fichiers HTML
        const htmlFiles = fs.readdirSync(frontendPath).filter(file => file.endsWith('.html'));
        htmlFiles.forEach(file => {
            const content = this.processHTMLFile(
                fs.readFileSync(path.join(frontendPath, file), 'utf8')
            );
            fs.writeFileSync(path.join(buildPath, file), content);
        });

        // Copier les assets
        const assets = ['css', 'js', 'images', 'icons'];
        assets.forEach(asset => {
            const assetPath = path.join(frontendPath, asset);
            if (fs.existsSync(assetPath)) {
                this.copyDirectory(assetPath, path.join(buildPath, asset));
            }
        });

        console.log(`✅ Frontend construit: ${htmlFiles.length} fichiers HTML`);
    }

    async buildBackend() {
        const backendPath = path.join(__dirname, this.config.backendDir);
        const buildPath = path.join(__dirname, this.config.buildDir, 'api');

        // Fichiers backend à copier
        const backendFiles = [
            'server.js',
            'package.json',
            'package-lock.json'
        ];

        backendFiles.forEach(file => {
            if (fs.existsSync(path.join(backendPath, file))) {
                fs.copyFileSync(
                    path.join(backendPath, file),
                    path.join(buildPath, file)
                );
            }
        });

        // Copier les dossiers
        const backendDirs = ['models', 'middleware', 'services', 'routes'];
        backendDirs.forEach(dir => {
            const dirPath = path.join(backendPath, dir);
            if (fs.existsSync(dirPath)) {
                this.copyDirectory(dirPath, path.join(buildPath, dir));
            }
        });

        console.log('✅ Backend construit');
    }

    processHTMLFile(content) {
        // Optimisations HTML pour la production
        return content
            // Supprimer les commentaires
            .replace(/<!--[\s\S]*?-->/g, '')
            // Minifier le CSS inline
            .replace(/<style>[\s\S]*?<\/style>/g, match => 
                match.replace(/\s+/g, ' ').replace(/; /g, ';')
            )
            // Minifier le JavaScript inline
            .replace(/<script>[\s\S]*?<\/script>/g, match =>
                match.replace(/\s+/g, ' ').replace(/;\s+/g, ';')
            );
    }

    copyDirectory(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }

        const files = fs.readdirSync(source);
        files.forEach(file => {
            const sourcePath = path.join(source, file);
            const targetPath = path.join(target, file);

            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, targetPath);
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        });
    }

    async generateConfigFiles(environment) {
        const buildPath = path.join(__dirname, this.config.buildDir);

        // Générer le Service Worker
        const ServiceWorkerGenerator = require('./sw');
        const swGenerator = new ServiceWorkerGenerator();
        swGenerator.saveToFile('../dist/sw.js');

        // Générer le manifest
        const manifest = {
            ...require('./manifest.json'),
            start_url: this.config.environments[environment].frontendUrl
        };
        fs.writeFileSync(
            path.join(buildPath, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );

        // Générer le fichier de configuration
        const config = {
            environment: environment,
            version: this.config.version,
            api: {
                baseUrl: this.config.environments[environment].apiUrl,
                endpoints: {
                    auth: '/api/auth',
                    salons: '/api/salons',
                    reservations: '/api/reservations',
                    payments: '/api/payments'
                }
            },
            features: {
                pwa: true,
                geolocation: true,
                mobilePayments: true,
                realTimeNotifications: true
            },
            build: {
                timestamp: new Date().toISOString(),
                environment: environment
            }
        };

        fs.writeFileSync(
            path.join(buildPath, 'config.json'),
            JSON.stringify(config, null, 2)
        );

        console.log('✅ Fichiers de configuration générés');
    }

    async optimizePerformance() {
        const buildPath = path.join(__dirname, this.config.buildDir);

        // Générer le sitemap
        const sitemap = this.generateSitemap();
        fs.writeFileSync(path.join(buildPath, 'sitemap.xml'), sitemap);

        // Générer robots.txt
        const robots = this.generateRobotsTxt();
        fs.writeFileSync(path.join(buildPath, 'robots.txt'), robots);

        console.log('✅ Optimisations de performance appliquées');
    }

    generateSitemap() {
        const baseUrl = this.config.environments.production.frontendUrl;
        const pages = [
            '', 'reservation.html', 'profile.html', 'mes-reservations.html',
            'login.html', 'register.html', 'dashboard-coiffeur.html'
        ];

        const urls = pages.map(page => `
    <url>
        <loc>${baseUrl}/${page}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>${page === '' ? 'daily' : 'weekly'}</changefreq>
        <priority>${page === '' ? '1.0' : '0.8'}</priority>
    </url>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
    }

    generateRobotsTxt() {
        const baseUrl = this.config.environments.production.frontendUrl;
        return `# Robots.txt pour KeurCoiff'
User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Pages à éviter
Disallow: /api/
Disallow: /admin/
Disallow: /private/
`;
    }

    async finalCheck() {
        const buildPath = path.join(__dirname, this.config.buildDir);

        // Vérifier que les fichiers essentiels existent
        const essentialFiles = [
            'index.html',
            'manifest.json',
            'sw.js',
            'config.json'
        ];

        essentialFiles.forEach(file => {
            if (!fs.existsSync(path.join(buildPath, file))) {
                throw new Error(`Fichier essentiel manquant: ${file}`);
            }
        });

        // Vérifier la taille du build
        const stats = fs.statSync(buildPath);
        const sizeMB = stats.size / (1024 * 1024);
        
        if (sizeMB > 50) {
            console.warn(`⚠️  Build volumineux: ${sizeMB.toFixed(2)} MB`);
        }

        console.log(`✅ Build final vérifié: ${sizeMB.toFixed(2)} MB`);
    }
}

// Interface en ligne de commande
if (require.main === module) {
    const manager = new DeploymentManager();
    const environment = process.argv[2] || 'production';
    
    manager.deploy(environment).catch(console.error);
}

module.exports = DeploymentManager;