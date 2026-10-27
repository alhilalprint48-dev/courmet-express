# Correctif de sécurité — Gourmet Express

Base examinée : `a8c97e59291f03f4cde7ecfaaa654c07a970ad77` (branche main).

## État de livraison

Ce document décrit les changements de code et la procédure de mise en service. Il ne publie aucun état de base distante, compte utilisateur ou configuration d’hébergement. Vérifier les prérequis ci-dessous avant d’appliquer les restrictions et de déployer l’interface.

## Changements

- Suppression des codes de rôle, du code universel, de leur affichage et des drapeaux sessionStorage servant d'autorisation.
- Connexion du personnel avec e-mail et mot de passe Supabase Auth. Les droits proviennent de tables privées administrées côté base, jamais de user_metadata. Les écrans du personnel ne montent qu'après vérification de leur rôle.
- Remplacement de toutes les anciennes politiques des tables concernées, y compris les règles dont le nom serait inconnu. RLS couvre aussi les tables normalisées de suppléments et les deux anciennes tables de numéros bloqués.
- Client : lecture de ses propres commandes ; aucun INSERT/UPDATE/DELETE direct. Cuisine : lecture et statut des commandes de son restaurant. Livreur : commandes de livraison prêtes, en cours ou terminées de son restaurant, et clôture autorisée. Gérant : carte et liste noire de son restaurant, suppression des commandes. Super-admin : gestion des restaurants.
- Création de commande par `public.create_order` : authentification et numéro confirmé vérifiés en base, contrôle du restaurant actif, prix et suppléments issus de la base, appartenance des produits, choix obligatoires, quantités, frais, minimum de livraison, plafond espèces de 500 DH, liste noire et délai de 30 secondes entre commandes du même compte. Insertion de commande et lignes dans une seule transaction.
- Vrais appels Supabase Auth pour envoi et validation WhatsApp. Aucune génération ni révélation du secret dans le navigateur. Si l'envoi échoue, la commande reste bloquée. La vérification est désormais requise aussi pour les commandes à table ; le prénom reste facultatif.
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
6. Activer le fournisseur Phone Auth et configurer Twilio ou Twilio Verify avec un expéditeur WhatsApp approuvé. Le simple ajout d’un numéro WhatsApp personnel ne permet pas l’envoi automatique de codes. Garder la confirmation automatique du téléphone désactivée. Le client impose le canal whatsapp, sans retour automatique vers SMS dans le code de l’application. Dans Twilio Verify, désactiver également le canal SMS et toute sélection automatique de canal susceptible de rétablir un envoi SMS. La validation Supabase conserve le type technique sms, également utilisé pour les codes de téléphone livrés sur WhatsApp. Désactiver les numéros/codes OTP de test en production. Configurer les limites de fréquence et la protection anti-abus de Supabase Auth ; le délai SQL ne protège pas les coûts d'envoi WhatsApp. Vérifier l'envoi/réception réel sur un numéro de test autorisé, le refus d'un mauvais code et d'un code expiré.
7. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans l'environnement **de compilation**. Ces deux valeurs sont publiques. Si une clé privilégiée a été exposée ailleurs, la révoquer dans Supabase et remplacer les secrets concernés. Le retrait d'une clé du code ne la révoque pas et ne nettoie pas l'historique Git.
8. Dans le gérant, enregistrer les variantes/suppléments dans la base (`products.option_groups`) avant de rouvrir les commandes. Les anciennes variantes présentes uniquement dans localStorage ou mockData ne sont plus prises comme source de prix. Les groupes normalisés existants restent protégés par RLS ; la création de commande utilise le JSON canonique de products.option_groups.
9. Installer avec Node 22 ou ultérieur : `npm ci`, `npm run test:security`, `npx tsc --noEmit`, puis `npm run build`. Déployer `out/` sur l'hébergement statique Cloudflare. `wrangler.toml` reste une configuration de fichiers statiques ; il ne contient pas de backend de commandes. Si une ancienne API a été déployée séparément, il faut aussi la retirer de son hébergement. Le Dockerfile sert désormais le même export statique via Nginx.
10. Tester le site publié : un visiteur et un client ne doivent accéder à aucune donnée d'un tiers ; tester un personnel du restaurant A contre B ; vérifier cuisine/livreur/gérant ; envoyer une commande valide et contrôler les montants, le suivi, la liste noire et les refus d'accès. Recompiler puis remplacer les anciens fichiers et invalider les caches de l'ancien site si nécessaire.

## Validation et limites

`npm run test:security` exécute de vrais privilèges, politiques RLS et fonctions PostgreSQL dans une base isolée PGlite. Seule l'identité Auth est simulée par un stub de auth.uid() et une table auth.users minimale. Le schéma est celui du dépôt ; l'extension UUID est remplacée par gen_random_uuid() pour le moteur de test. Aucun accès aux données clients de production.

56 contrôles SQL passent. Les tests vérifient aussi la réservation initiale du propriétaire, le refus d’une adresse non confirmée, le refus d’un autre compte et la consommation unique de la réservation. Les tests couvrent la lecture anonyme, les écritures directes, la propriété des commandes, les rôles, les prix falsifiés, les options inconnues/dupliquées/obligatoires, les quantités, le plafond, les numéros non confirmés, le restaurant suspendu, les deux listes noires, le délai et le rollback intégral en cas d'échec d'une ligne.

La compilation statique et TypeScript sont vérifiés localement avec une configuration Supabase factice. Le dépôt ne contient pas ESLint ; Next signale son absence pendant la compilation. Les tests ne prouvent pas l'état de la base distante, les réglages Auth/WhatsApp, les règles Storage, les anciennes API déployées ou les autres fonctions/vues absentes du dépôt. La validation de production reste à effectuer après installation. Aucun test d'envoi WhatsApp, de fournisseur de paiement, d'imprimante physique ou d'image Docker n'est revendiqué.

Le contrôle visuel automatisé n’a pas pu être exécuté : Chromium est absent et son téléchargement a échoué. Aucun test navigateur réussi n’est revendiqué.

## Vérification par WhatsApp

Le bouton de vérification demande explicitement `options.channel: 'whatsapp'` à Supabase Auth. Un lien wa.me et un message préparé ne prouvent pas la possession du numéro. La commande reste bloquée tant qu’un code valide n’a pas été vérifié par Supabase et que la base n’a pas retrouvé le même numéro confirmé.

Configurer le fournisseur uniquement dans Supabase et Twilio ; ne jamais placer son jeton dans le dépôt ou les variables NEXT_PUBLIC_. Les éventuels frais du fournisseur doivent être validés par le propriétaire avant activation. Effectuer un test réel sur un numéro autorisé après configuration, puis vérifier un code incorrect, expiré et le changement de numéro. Aucun WhatsApp de test n’est envoyé automatiquement par ce correctif.

Documentation : https://supabase.com/docs/guides/auth/phone-login

Configuration officielle Twilio et repli de canal : https://www.twilio.com/docs/verify/whatsapp/byo et https://www.twilio.com/docs/verify/fallback-scenarios
