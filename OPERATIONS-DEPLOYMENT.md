# Mise à jour du service cuisine et livraison

Ordre d'installation sur un projet déjà sécurisé avec les scripts existants :

1. `supabase-operations.sql` : champs d'archivage et d'encaissement, affectation livreur, journal privé, actions contrôlées et files par restaurant.
2. `supabase-order-gps.sql` : conserver les coordonnées validées au passage de commande sans rouvrir l'ancien RPC public.
3. `supabase-operations-analytics.sql` : date d'encaissement pour les nouvelles ventes, date de création pour l'historique sans trace d'encaissement. Les archives restent comptées.
4. Déployer et vérifier la nouvelle interface cuisine, livraison et administration.
5. **En dernier**, `supabase-operations-enforce.sql` : retirer les modifications directes de statut et les suppressions destructrices. Une ancienne interface doit être rechargée après cette étape.

Les scripts sont rejouables. L'activation finale exige les nouvelles interfaces : ne pas revenir à une ancienne interface sans préparer sa compatibilité avec les RPC.

Les commandes historiques ne reçoivent aucun faux encaissement ni faux livreur. Les anciennes livraisons « en route » sans affectation peuvent être prises par un livreur. Un ancien statut terminé est signalé comme historique sans trace d'encaissement.

Les commandes actives sont toutes renvoyées, de la plus ancienne à la plus récente ; l'historique est séparé et limité à 50. Les archives sont consultables et restaurables par le gérant. Elles préservent commandes, lignes, fidélité et statistiques. Le journal de l'admin montre les 100 derniers événements depuis son activation, avec identifiant personnel de l'acteur.

La clôture constitue une déclaration d'encaissement par le personnel, pas une preuve de paiement bancaire. Une annulation après encaissement est signalée pour rapprochement ; aucun remboursement externe n'est déclenché.

Contrôles locaux : `npm run lint`, `npm run test:security`, `npm run test:checkout`, `npm run test:operations`, `npm run build` avec les variables publiques configurées.

Contrôles sur la vraie base : exécuter `tests/remote-operations.sql` et `tests/remote-isolation.sql` comme propriétaire. Ces transactions utilisent leurs propres établissements/comptes fictifs et annulent toutes leurs données. Elles ne vérifient pas les signatures JWT, les e-mails, le CAPTCHA réel, le matériel ni la qualité du réseau du restaurant.

La récupération du mot de passe utilise Supabase Auth et la redirection autorisée `/compte`. La réception effective des e-mails dépend de la configuration SMTP et du domaine d'envoi.
