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

### Plafond espèces par restaurant
Installer `supabase-cash-limit.sql` après les migrations de sécurité et Turnstile. Le défaut reste 500 DH ; Admin → Anti-fraude → Enregistrer le plafond permet de le régler par restaurant (0,01 à 100 000 DH). Le serveur contrôle le total, livraison comprise, pour toute commande en espèces. Seuls l'admin du restaurant et le super-admin peuvent le modifier. Le script conserve la fermeture des anciennes RPC. Le CAPTCHA ne prouve pas l'intention d'achat : les commandes hors salle restent à confirmer manuellement par WhatsApp avant acceptation.

### Paramètres et chiffre d’affaires admin
Installer `supabase-admin-settings-analytics.sql` après les migrations existantes. Les paramètres de livraison et le numéro WhatsApp sont sauvegardés atomiquement par une RPC réservée à l’admin du restaurant ; zéro est accepté pour frais et minimum. Les statistiques sont agrégées en base sous RLS : commandes `delivered` uniquement, classées par encaissement (ou création pour les anciennes commandes sans encaissement tracé) selon `Africa/Casablanca`, jour/semaine depuis lundi/mois en cours, total avec livraison, nombres clôturés/annulés/en cours, ticket moyen et dix produits les plus vendus du mois. Le bouton Actualiser recharge les données. Les commandes archivées restent comptées. Les suppressions définitives et les modifications directes de statut sont interdites aux comptes applicatifs après `supabase-operations-enforce.sql` ; il ne s’agit pas d’un rapprochement bancaire. Aucun chiffre de démonstration ni comparaison fictive n’est affiché.

### Ouverture et fiche restaurant
Installer `supabase-restaurant-profile.sql` après les migrations précédentes. Admin → Paramètres permet de modifier nom, adresse, téléphone, horaires affichés et message de fermeture, et d’ouvrir/fermer immédiatement la réception des commandes. `is_open` est distinct de la suspension `is_active` : le menu et le suivi restent accessibles pendant une fermeture, la base bloque toute nouvelle commande même depuis une page déjà ouverte. Le site actualise ces informations toutes les 30 secondes et au retour sur l’onglet. En mode manuel, les horaires textuels sont informatifs. Pour activer un planning hebdomadaire contrôlé par la base, installer `supabase-opening-schedule.sql` puis configurer les plages dans Admin → Paramètres. L’interrupteur manuel reste prioritaire pour suspendre les commandes. Le défaut reste ouvert pour les restaurants existants ; aucune fermeture de production n’est effectuée par la migration. Les privilèges Turnstile restent inchangés.

### Récompense fidélité : 100 points = 10 DH
Installer `supabase-loyalty-rewards.sql` en dernier. Le client connecté avec e-mail confirmé peut cocher une récompense par commande dès 10 DH de produits, dans le restaurant où les points ont été gagnés. Le serveur calcule la remise de 10 DH, réserve 100 points sous verrou et enregistre le tout dans la transaction de commande ; aucun montant de remise fourni par le navigateur n’est accepté. Les frais de livraison restent dus et le minimum de livraison s’applique au sous-total avant remise. Un panier de 10 DH peut être intégralement couvert, sans paiement si la livraison est gratuite ou non requise.
Les points sont rendus une seule fois en cas d’annulation ou de suppression d’une commande non terminée. Une commande annulée avec récompense doit être recréée plutôt que rouverte. La suppression d’une commande terminée conserve les gains et les points consommés. Les nouveaux gains sont calculés sur les produits après remise, hors livraison. Si des gains déjà dépensés sont ensuite annulés, le solde peut devenir négatif et aucune nouvelle récompense n’est utilisable avant reconstitution du solde. Les anciens points sont conservés sans attribution rétroactive. La remise apparaît au checkout, dans l’historique, sur le reçu, le message WhatsApp et le ticket livreur. Le CA utilise déjà le total net ; les montants par produit sont indiqués avant remises.


### Mise à jour catalogue, horaires et compte

Après les scripts de sécurité et d’exploitation existants : appliquer `supabase-opening-schedule.sql`, puis `supabase-catalog-price-check.sql`, avant le déploiement de l’interface correspondante. Le premier ajoute deux colonnes, des RPC réservées aux gérants et un contrôle d’ouverture à l’insertion. Les horaires automatiques sont désactivés par défaut : aucune heure d’ouverture n’est inventée ni activée pour les restaurants existants.

Le planning utilise l’heure `Africa/Casablanca`, de zéro à quatre plages par jour. Une plage 19:00–02:00 continue le lendemain. La fermeture manuelle ou la suspension de l’établissement bloque toujours les nouvelles commandes ; les commandes existantes restent traitables. L’interface se met à jour toutes les 30 secondes, la base contrôle chaque commande immédiatement. Une page ancienne ne peut pas contourner les horaires. Les retraits sont demandés au plus vite avec délai à confirmer ; les anciens créneaux fixes ne constituent plus une réservation et sont remplacés côté serveur.

Admin → Catalogue → **Modifier le plat** enregistre les noms, descriptions, prix, catégorie et adresse de photo dans le restaurant sélectionné, sous RLS. Les anciennes lignes de commande conservent leur prix et libellé. Si le prix du panier a changé, le nouveau checkout reçoit une erreur et demande une actualisation plutôt que de confirmer silencieusement le nouveau prix. Les clients anciens sans prix attendu restent soumis au calcul canonique du serveur.

Mon compte distingue une panne de session, un historique indisponible et un historique vide. Les points indisponibles restent signalés. La récupération et la confirmation d’adresse dépendent de l’envoi SMTP réel ; leur présence dans l’interface ne prouve pas la livraison des e-mails.

### Validation d’exploitation encore nécessaire

- Configurer un fournisseur SMTP et un domaine d’expédition vérifié, puis tester inscription, confirmation et récupération depuis une vraie boîte. Aucun secret SMTP ne doit être placé dans Git ou dans une variable `NEXT_PUBLIC_`.
- Vérifier la politique de sauvegarde du projet, effectuer une restauration sur un environnement séparé et contrôler commandes, lignes, membres et fidélité. Ne jamais tester une restauration en écrasant le restaurant de production.
- Effectuer un service pilote sur les vrais appareils : son après activation, écran réveillé, perte/reprise du réseau, impression et parcours du livreur. Le site n’exécute pas un service de commande hors connexion et ne garantit pas les alertes d’un onglet suspendu.


### Vérification gratuite des nouveaux mots de passe dans les formulaires

L’inscription et la réinitialisation via `/compte` vérifient les mots de passe dans Pwned Passwords (Have I Been Pwned), après soumission complète uniquement. Le navigateur calcule SHA-1 localement et ne transmet que ses cinq premiers caractères hexadécimaux, sans adresse e-mail, mot de passe, empreinte complète, cookie ni jeton Supabase. Les résultats sont comparés localement ; le remplissage de réponse est demandé avec `Add-Padding`. Aucune donnée de mot de passe n’est journalisée ou persistée par cette vérification.

Un mot de passe trouvé dans les fuites est refusé avant l’appel d’inscription ou de modification. Une panne, un délai dépassé ou une réponse invalide bloque cette opération et affiche un message de nouvelle tentative ; la connexion avec un compte existant reste disponible.

**Portée :** cette couche protège les formulaires du site. Elle peut être contournée par un appel direct à l’API Auth publique et ne remplace pas la protection serveur native de Supabase. L’avertissement Security Advisor reste donc légitime tant que la protection native n’est pas activée sur une offre compatible. Aucun abonnement payant n’est souscrit par cette modification. Un résultat absent du corpus ne prouve pas qu’un mot de passe est sûr.

Vérification locale : `npm run test:passwords` (réponses et pannes simulées, aucun secret réel ni création de compte).


### Erreurs de chargement et vérification des accès

Les espaces du personnel distinguent un compte sans autorisation d’une vérification impossible (Auth, initialisation du rôle ou RPC indisponible). Une panne masque l’espace et propose une nouvelle vérification ; elle ne reste pas sur un chargement sans fin. La base conserve ses propres contrôles d’accès, indépendamment de cet affichage.

Mon compte attend le chargement du restaurant avant d’affirmer que l’historique est vide. Si le restaurant ne charge pas, un message et un bouton de rechargement remplacent cette affirmation. Les erreurs de consultation de commandes restent également signalées.

Tests : `npm run test:access`. Les scénarios réseau et rôles utilisent des fournisseurs simulés, sans création de compte ni changement de permissions.
