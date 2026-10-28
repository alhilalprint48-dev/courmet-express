# Correctif de sécurité — Gourmet Express

Base examinée : `a8c97e59291f03f4cde7ecfaaa654c07a970ad77` (branche main).

## État de livraison

Ce document décrit les changements de code et la procédure de mise en service. Il ne publie aucun état de base distante, compte utilisateur ou configuration d’hébergement. Vérifier les prérequis ci-dessous avant d’appliquer les restrictions et de déployer l’interface.

## Changements

- Suppression des codes de rôle, du code universel, de leur affichage et des drapeaux sessionStorage servant d'autorisation.
- Connexion du personnel avec e-mail et mot de passe Supabase Auth. Les droits proviennent de tables privées administrées côté base, jamais de user_metadata. Les écrans du personnel ne montent qu'après vérification de leur rôle.
- Remplacement de toutes les anciennes politiques des tables concernées, y compris les règles dont le nom serait inconnu. RLS couvre aussi les tables normalisées de suppléments et les deux anciennes tables de numéros bloqués.
- Client : lecture de ses propres commandes ; aucun INSERT/UPDATE/DELETE direct. Cuisine : lecture et statut des commandes de son restaurant. Livreur : commandes de livraison prêtes, en cours ou terminées de son restaurant, et clôture autorisée. Gérant : carte et liste noire de son restaurant, suppression des commandes. Super-admin : gestion des restaurants.
- Création de commande par `public.create_order` : commandes invitées en attente de validation du personnel, contrôle du restaurant actif, prix et suppléments issus de la base, appartenance des produits, choix obligatoires, quantités, frais, minimum de livraison, plafond espèces de 500 DH, liste noire et délai de 30 secondes entre commandes de la même table ou du même téléphone, plafond de 60 commandes par restaurant et par minute. Insertion de commande et lignes dans une seule transaction.
- Sur place : table obligatoire, prénom facultatif, aucun téléphone ni code. Hors place : téléphone requis, confirmation manuelle WhatsApp. Aucun téléphone n'est déclaré vérifié. Le statut initial est toujours `new` ; le clic WhatsApp ne modifie jamais le statut.
- Les invités n'ont aucun accès aux tables commandes, lignes et listes noires. Le suivi utilise un secret aléatoire par commande et une RPC ne renvoyant que le statut. Les secrets restent dans une table privée avec RLS sans droits client. Une commande sur place peut être soumise à distance ; le personnel doit vérifier la table avant acceptation. La limitation SQL réduit les abus mais ne prouve pas la présence physique. En cas d'abus soutenu, ajouter une protection serveur de type CAPTCHA.

- Suppression des trois anciennes routes `/api` et du store en mémoire, des appels de secours et du simulateur de commandes. Le site utilise Supabase ; Cloudflare sert les fichiers statiques.
- Suppression des valeurs Supabase intégrées dans les sources et scripts ; configuration par variables d'environnement. Une clé publishable/anon reste nécessairement publique dans le navigateur. Elle n'est pas un mot de passe ; sa sécurité dépend des privilèges et de RLS. Une clé service_role/secret doit rester hors du navigateur.
- Le seed exige une clé privilégiée côté terminal et une autorisation explicite `ALLOW_SEED=yes`. L'ancien audit qui écrivait des données a été remplacé par un contrôle anonyme en lecture.

## Application

1. Prévoir une maintenance et sauvegarder la base. Les anciens écrans ne sont pas compatibles avec les nouvelles restrictions. Éviter de laisser l'ancien site accepter des commandes pendant l'installation.
2. Appliquer le patch au commit examiné : `git apply --check courmet-express-security.patch`, puis `git apply courmet-express-security.patch`. Si main a évolué, revoir les conflits avant application. Tous les fichiers modifiés et les tests sont inclus dans le patch.
3. Sur une installation existante, exécuter **supabase-security-rls.sql**, en entier, dans l'éditeur SQL du bon projet comme propriétaire de la base. Sur une installation neuve, exécuter d'abord **supabase_schema.sql** puis le script de sécurité. L'ancien schéma neuf active désormais RLS avant de terminer. Les anciennes commandes sans customer_user_id restent réservées au personnel autorisé : ne pas en attribuer la propriété à partir d'un numéro fourni par le navigateur.
4. Pour le premier propriétaire, une réservation privée d’adresse peut être placée dans `private.bootstrap_admin_emails` par le propriétaire de la base. Depuis l’écran de connexion, « Créer mon accès personnel » permet de choisir son mot de passe ; l’adresse doit être confirmée par e-mail. Au premier accès confirmé, la réservation est consommée et le rôle est attaché à l’UUID utilisateur. Garder la confirmation e-mail activée (mailer_autoconfirm=false). Aucun e-mail n’est envoyé par les opérations de migration.

Créer/inviter chaque autre membre du personnel dans Supabase Auth. Attribuer les accès par leur UUID depuis l'éditeur SQL, avec les valeurs réelles :

```sql
-- Exemple à adapter, jamais avec des valeurs publiques par défaut.
INSERT INTO private.staff_members (user_id, restaurant_id, role)
VALUES ('UUID_UTILISATEUR', 'UUID_RESTAURANT', 'admin')
ON CONFLICT (user_id, restaurant_id) DO UPDATE SET role = EXCLUDED.role;
-- Rôles restaurant : admin, kds, livreur.
-- Super-admin plateforme, à réserver au responsable :
INSERT INTO private.platform_admins (user_id) VALUES ('UUID_RESPONSABLE')
ON CONFLICT DO NOTHING;
```

5. Garder le schéma `private` hors des schémas exposés dans Data API. Ne pas donner aux clients l'accès aux tables privées. Vérifier les conseillers de sécurité Supabase après installation, ainsi que les fonctions, vues et politiques supplémentaires éventuellement présentes en production mais absentes du dépôt.
6. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans l'environnement **de compilation**. Ces deux valeurs sont publiques. Si une clé privilégiée a été exposée ailleurs, la révoquer dans Supabase et remplacer les secrets concernés. Le retrait d'une clé du code ne la révoque pas et ne nettoie pas l'historique Git.
7. Dans le gérant, enregistrer les variantes/suppléments dans la base (`products.option_groups`) avant de rouvrir les commandes. Les anciennes variantes présentes uniquement dans localStorage ou mockData ne sont plus prises comme source de prix. Les groupes normalisés existants restent protégés par RLS ; la création de commande utilise le JSON canonique de products.option_groups.
8. Installer avec Node 22 ou ultérieur : `npm ci`, `npm run test:security`, `npx tsc --noEmit`, puis `npm run build`. Déployer `out/` sur l'hébergement statique Cloudflare. `wrangler.toml` reste une configuration de fichiers statiques ; il ne contient pas de backend de commandes. Si une ancienne API a été déployée séparément, il faut aussi la retirer de son hébergement. Le Dockerfile sert désormais le même export statique via Nginx.
9. Tester le site publié : un visiteur et un client ne doivent accéder à aucune donnée d'un tiers ; tester un personnel du restaurant A contre B ; vérifier cuisine/livreur/gérant ; envoyer une commande valide et contrôler les montants, le suivi, la liste noire et les refus d'accès. Recompiler puis remplacer les anciens fichiers et invalider les caches de l'ancien site si nécessaire.

## Validation et limites

`npm run test:security` exécute de vrais privilèges, politiques RLS et fonctions PostgreSQL dans une base isolée PGlite. Seule l'identité Auth est simulée par un stub de auth.uid() et une table auth.users minimale. Le schéma est celui du dépôt ; l'extension UUID est remplacée par gen_random_uuid() pour le moteur de test. Aucun accès aux données clients de production.

101 contrôles SQL passent. Les tests vérifient aussi la réservation initiale du propriétaire, le refus d’une adresse non confirmée, le refus d’un autre compte et la consommation unique de la réservation. Les tests couvrent la lecture anonyme, les écritures directes, la propriété des commandes, les rôles, les prix falsifiés, les options inconnues/dupliquées/obligatoires, les quantités, le plafond, les téléphones invalides, les commandes sans téléphone à table et le suivi par secret, le restaurant suspendu, les deux listes noires, le délai et le rollback intégral en cas d'échec d'une ligne.

La compilation statique et TypeScript sont vérifiés localement avec une configuration Supabase factice. Next.js 16.4.3, React 19.3.1, ESLint 9.39.5 et eslint-config-next sont installés avec versions fixes. Le contrôle npm run lint -- --max-warnings 0 est exécuté dans la CI. Les règles de dépendances et d’ordre des hooks sont actives. La règle de performance set-state-in-effect est exclue pour la restauration des états URL/session après hydratation et la synchronisation des données externes ; cette exception est documentée dans eslint.config.mjs. Les tests ne prouvent pas l'état de la base distante, les réglages Auth/WhatsApp, les règles Storage, les anciennes API déployées ou les autres fonctions/vues absentes du dépôt. La validation de production reste à effectuer après installation. Aucun test d'envoi WhatsApp, de fournisseur de paiement, d'imprimante physique ou d'image Docker n'est revendiqué.

Le contrôle visuel automatisé n’a pas pu être exécuté : Chromium est absent et son téléchargement a échoué. Aucun test navigateur réussi n’est revendiqué.

## Confirmation gratuite par WhatsApp

Aucun fournisseur SMS, Twilio ou API WhatsApp requis. Le client envoie lui-même le message prérempli au numéro WhatsApp configuré du restaurant. Le personnel vérifie la réception et le numéro de commande avant d'accepter une livraison ou un retrait. Un lien ouvert ne constitue pas une preuve d'envoi.

Appliquer `supabase-guest-checkout.sql` sur une installation sécurisée existante avant de déployer ce parcours. Pour une nouvelle installation, `supabase-security-rls.sql` intègre déjà cette évolution. Les anciens codes OTP ne sont plus utilisés au checkout. Les comptes du personnel restent protégés par Supabase Auth et les rôles en base.

## Comptes et fidélité

Appliquer `supabase-customer-loyalty.sql` après les scripts de sécurité et de commande invitée. Le script est réexécutable et ne crédite pas les commandes historiques. La table privée conserve le crédit même si le personnel efface les commandes terminées ; une réouverture ou annulation retire le crédit. Un retour au statut terminé le restaure sans doublon. Aucun droit de modifier les points n'est accordé aux clients.

Le bouton `/compte` est commun aux clients et au personnel. L'inscription crée uniquement un utilisateur Auth ; seuls les rôles en base ouvrent les espaces administration, cuisine et livraison. Les administrateurs peuvent ouvrir ces trois espaces. Les accès limités cuisine/livraison restent limités à leur rôle. Les nouveaux comptes clients doivent confirmer leur e-mail.

Règle initiale : 1 point par tranche entière de 10 DH de produits, hors livraison, pour une commande terminée associée à un compte dont l'e-mail est confirmé. Aucun crédit invité ou rétroactif, aucune remise automatique ni conversion monétaire. Les points sont calculés par un trigger sur le sous-total canonique en base.

Configurer Supabase Auth : Site URL = URL du site publié ; autoriser exactement l'URL `/compte` du site dans Redirect URLs. Le client fournit `emailRedirectTo` à l'inscription et au renvoi du lien. Configurer un SMTP permettant les inscriptions publiques : le service e-mail intégré Supabase peut limiter les destinataires aux membres de l'organisation. Ne pas désactiver la confirmation e-mail pour contourner un problème d'envoi. Les tests n'envoient aucun e-mail et ne créent aucun utilisateur réel.

La vitrine `/saas` et ses liens sont retirés de l'export ; la gestion protégée des établissements reste disponible pour le responsable depuis Mon compte.

## En-têtes et HTTPS

`public/_headers` configure les réponses statiques Cloudflare Pages : anti-cadrage (X-Frame-Options DENY et CSP frame-ancestors none), nosniff, politique de référent, Permissions-Policy et HSTS. `nginx.conf` applique les mêmes en-têtes avec always, y compris pour les erreurs. La CSP autorise les scripts inline nécessaires à l'export Next.js ; elle ne constitue pas une protection XSS stricte.

Le site Pages utilise le HTTPS de Cloudflare. Pour Docker, le port HTTP Nginx est publié uniquement sur 127.0.0.1. Pour un serveur public avec un domaine dont le DNS pointe vers le serveur : définir SITE_DOMAIN, puis lancer docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build. Caddy termine TLS, renouvelle les certificats et redirige HTTP vers HTTPS ; Nginx reste sur le réseau interne. Les ports 80/443 doivent être accessibles et les volumes Caddy conservés. Ce scénario TLS Docker n'a pas été exécuté dans cet environnement, où Docker est absent. La CI vérifie l'image Nginx et ses en-têtes.

## Vérifications sur la base distante

`tests/remote-isolation.sql` est un scénario transactionnel à exécuter comme propriétaire : identités et restaurants de test, commande, prix canonique, cycle de préparation, suivi, fidélité et isolation des données de A et B, puis ROLLBACK. Il n'installe aucun stub auth.uid. La validation cryptographique des JWT, la connexion navigateur et l'envoi e-mail restent hors de ce test SQL. Son exécution doit être validée séparément par le responsable du projet ; ne pas confondre les contrôles PGlite avec le test distant.

## Éléments restant à finaliser

L'historique examiné contient une ancienne clé publishable publique, pas de clé service_role, sb_secret ou JWT privilégié détecté. Une clé publishable et l'URL Supabase sont des informations publiques du client. Ne pas recréer un projet uniquement pour cette raison. Pour révoquer une ancienne clé publishable, créer une clé de remplacement dans Settings / API Keys, mettre à jour les variables de compilation de tous les clients, recompiler et vérifier avant de supprimer l'ancienne. Ne pas annoncer une révocation si elle n'a pas été effectuée.

Le checkout utilise désormais la fonction Supabase `create-order`. Elle valide le jeton Turnstile côté serveur, exige l'action checkout et le hostname exact de l'origine HTTPS autorisée (site Pages ou ses previews), refuse les jetons absents/invalides et échoue fermé si Siteverify est indisponible. Le compte associé vient d'Auth getUser, jamais du JSON client. La taille du corps est limitée à 128 Kio. Le secret Turnstile est lu depuis Vault, via une RPC réservée exclusivement au rôle serveur ; aucune valeur secrète n'est incluse dans les sources ou variables NEXT_PUBLIC_.

Installation et basculement :
1. Créer un widget Turnstile managed pour le domaine du site ; les domaines locaux peuvent être enregistrés pour le développement, mais ne sont pas admis par le handler de production.
2. Enregistrer son secret dans Vault sous le nom courmet_turnstile_checkout, sans le copier dans le dépôt. Appliquer supabase-turnstile-server.sql : nouvelles fonctions serveur uniquement ; le checkout existant reste disponible pendant cette préparation.
3. Déployer supabase/functions/create-order avec verify_jwt=false : le handler effectue lui-même la validation CAPTCHA et, pour un client connecté, celle du JWT via Auth. Les clés modernes par défaut sont lues dans l'environnement sécurisé de la fonction ; le repli legacy sert uniquement aux projets encore sans nouvelles clés.
4. Définir NEXT_PUBLIC_TURNSTILE_SITE_KEY à la compilation (Cloudflare et/ou Docker). Déployer et vérifier le nouveau checkout avec un jeton réel.
5. Appliquer supabase-turnstile-enforce.sql après déploiement : il retire la création directe via les anciennes RPC anon/authenticated. Sans ce dernier script, le CAPTCHA est contournable.
6. Vérifier un succès, un jeton absent, un mauvais hostname/action et la réutilisation d'un même jeton. Après chaque tentative, le widget est réinitialisé. Ne pas annoncer une protection de production complète tant que le basculement, les révocations et ces vérifications ne sont pas terminés.

Les domaines personnalisés et un déploiement Docker public exigent aussi l'adaptation explicite de la liste d'origines du handler et des domaines du widget. Pour un rollback du frontend, rétablir ses droits de création uniquement avec décision explicite du responsable ; ne pas rouvrir silencieusement l'accès public.

npm run test:checkout vérifie le handler avec fournisseurs simulés : origine/action/hostname, absence de jeton, réutilisation, taille, refus de session falsifiée et propriété du compte. Les 101 contrôles SQL couvrent aussi l'impossibilité de contourner le serveur par les anciennes RPC après enforcement. Aucun compte réel ni e-mail n'est créé par ces tests locaux.

Les réglages SMTP, Site URL et Redirect URLs demeurent à vérifier dans Supabase. Le connecteur disponible ne propose pas leur modification. Garder la confirmation e-mail activée. Aucun e-mail réel n'a été envoyé par ce correctif.
