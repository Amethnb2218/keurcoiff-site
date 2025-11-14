const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Déploiement KeurCoiff\'...');

// Configuration
const config = {
  version: '2.0.0',
  buildDir: './dist',
  assets: [
    './*.html',
    './css/*.css',
    './js/*.js',
    './images/*.{png,jpg,svg}',
    './icons/*.png',
    './manifest.json',
    './sw.js'
  ]
};

// Fonction pour exécuter des commandes
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Processus de déploiement
async function deploy() {
  try {
    console.log('📦 Préparation des fichiers...');
    
    // Créer le dossier de build
    if (!fs.existsSync(config.buildDir)) {
      fs.mkdirSync(config.buildDir, { recursive: true });
    }
    
    // Minifier les fichiers HTML
    console.log('🔨 Minification HTML...');
    await runCommand('html-minifier --input-dir . --output-dir ./dist --file-ext html --collapse-whitespace');
    
    // Optimiser les images
    console.log('🖼️  Optimisation des images...');
    await runCommand('imagemin images/* --out-dir=dist/images');
    
    // Minifier le CSS
    console.log('🎨 Minification CSS...');
    await runCommand('cleancss -o dist/css/styles.min.css css/styles.css');
    
    // Minifier le JavaScript
    console.log('⚡ Minification JS...');
    await runCommand('uglifyjs js/*.js -o dist/js/app.min.js');
    
    // Copier les autres fichiers
    console.log('📋 Copie des fichiers statiques...');
    fs.copyFileSync('./manifest.json', './dist/manifest.json');
    fs.copyFileSync('./sw.js', './dist/sw.js');
    
    // Générer le sitemap
    console.log('🗺️  Génération du sitemap...');
    generateSitemap();
    
    console.log('✅ Déploiement terminé !');
    console.log('🌐 Fichiers disponibles dans: ./dist/');
    
  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error);
  }
}

function generateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://keurcoiff.sn/</loc>
    <lastmod>2024-12-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://keurcoiff.sn/reservation.html</loc>
    <lastmod>2024-12-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://keurcoiff.sn/profile.html</loc>
    <lastmod>2024-12-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  
  fs.writeFileSync('./dist/sitemap.xml', sitemap);
}

// Lancer le déploiement
deploy();