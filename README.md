# 🍽️ LE GOURMET EXPRESS - Système Complet de Commande & KDS

Système de commande en ligne pour restaurant, Click & Collect et livraison à domicile avec règlement à la réception (Espèces / TPE), écran cuisine en direct (KDS), application mobile pour coursiers et back-office avec mesures anti-fraude.

---

## 🚀 Les 4 Modules de l'Écosystème

| Module | URL | Description |
| :--- | :--- | :--- |
| **Menu Client PWA** | `http://localhost:3000/` | Carte interactive multilingue (FR / Arabe avec RTL direct), variantes, suppléments, géolocalisation GPS, panier, confirmation et WhatsApp en 1 clic. |
| **KDS Cuisine & Caisse** | `http://localhost:3000/kds` | Écran de production en direct, alerte sonore Web Audio, avancement des statuts, double impression tickets thermiques 80 mm. |
| **Module Coursier / Livreur** | `http://localhost:3000/livreur` | Ergonomie smartphone, appel client en 1 clic (`tel:...`), navigation GPS Waze / Google Maps, rappel de monnaie et clôture d'encaissement obligatoire. |
| **Back-Office Restaurant** | `http://localhost:3000/admin` | Rupture immédiate de plats en 1 clic, ajout de plats avec upload local ou lien URL, gestion des zones, sécurité anti-fraude (Blacklist) et générateur de QR Codes. |

---

## 🛠️ Stack Technique

- **Front-End & PWA** : Next.js 14 (App Router) + React 18 + Tailwind CSS.
- **Multilingue** : Français & Arabe (support natif LTR / RTL `dir="rtl"`).
- **Temps Réel & Données** : Supabase avec RLS, Supabase Auth et création transactionnelle de commande en base.
- **Impression Tickets** : ESC/POS 80 mm avec découpe papier automatique (`GS V 0`) et sonnerie imprimante (`ESC B`).
- **Génération QR Code** : Moteur vectoriel pour tables et vitrine avec export PNG et impression de chevalet.

---

## 💻 Démarrage Rapide

Voir [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md) avant toute mise en production : installation SQL, comptes du personnel et règles des commandes invitées.

### 1. Installation
```bash
npm ci
```

### 2. Lancement en Développement
```bash
npm run dev
```
Accédez à l'application sur [http://localhost:3000](http://localhost:3000).

### 3. Build de Production
```bash
npm run build
# Publier le dossier out/ sur un hébergement statique.
```

---

## 🖨️ Configuration de l'Imprimante Thermique 80 mm (ESC/POS)

L'impression est disponible sous deux formats :

1. **Impression Directe Navigateur (KDS)** :
   - Depuis l'écran `/kds`, cliquez sur **« Ticket Cuisine »** ou **« Ticket Livreur »**.
   - Le style `@media print` formate automatiquement le ticket au format rouleau 80 mm.

2. **Passerelle Réseau Directe (LAN / Wi-Fi)** :
   - Un script dédié est inclus dans `src/scripts/escpos-printer.js`.
   - Il envoie directement les octets binaires ESC/POS sur le port `9100` de l'imprimante (Epson, Xprinter, Bixolon) avec commande de découpe papier automatique et ouverture du tiroir-caisse :
   ```bash
   node src/scripts/escpos-printer.js --ip 192.168.1.200
   ```

---

## 🛡️ Mesures Anti-Fraude & Sécurisation COD

Pour réduire les risques de fausses commandes en paiement à la livraison :
- **Blacklist Automatique** : Blocage immédiat des numéros de téléphone ayant fait l'objet d'un refus de livraison abusif (géré dans `/admin`).
- **Confirmation adaptée au mode** : sur place, table obligatoire sans téléphone ni code ; livraison et retrait, téléphone requis et message WhatsApp envoyé manuellement, puis acceptation par le restaurant.
- **Plafonnement des montants** : Limite fixée par défaut à 500 DH pour toute commande sans acompte préalable.

---

## 🐳 Déploiement Cloud & Docker

Pour déployer sur un serveur VPS (Ubuntu / Debian / Cloudflare) :

```bash
docker compose up -d --build
```
L'application démarre automatiquement sur le port `3000` avec redémarrage automatique en cas de panne (`restart: always`).

### Mon compte et fidélité

Le bouton **Mon compte** permet aux clients de s'inscrire et de consulter leurs points et commandes. Les membres du personnel se connectent au même endroit et voient uniquement les accès permis par leur rôle en base. L'administration donne accès à la cuisine, aux livreurs et à la gestion du restaurant.

Installer `supabase-customer-loyalty.sql` après les scripts de sécurité. Un client connecté avec e-mail confirmé gagne 1 point par tranche de 10 DH de produits après clôture de la commande. Les frais de livraison sont exclus. Aucun point invité ou rétroactif ; aucune remise automatique. Vérifier le SMTP, la Site URL et les Redirect URLs Supabase avant d'ouvrir l'inscription publique. La vitrine SaaS est retirée pour le moment.

### Validation anti-robot des commandes

Le checkout passe par la fonction serveur Supabase `create-order` et Turnstile. Voir SECURITY_DEPLOYMENT.md pour installer le secret dans Vault, les fonctions serveur, la clé publique de compilation et le script de fermeture des anciennes RPC. Le CAPTCHA n'est complet qu'après cette fermeture. Les commandes sur place restent sans téléphone ni code ; la validation anti-robot est commune aux trois modes.

Contrôles : `npm run lint -- --max-warnings 0`, `npm run test:security`, `npm run test:checkout`, `npm audit`, `npm run build`.
