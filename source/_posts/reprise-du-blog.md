---
title: Hexo et Github Pages
date: 2018-09-13 16:10:52
tags:
- Hexo
---

Eh non je ne suis pas encore mort ! Pour feter la fin de l'été je me suis dit qu'il était
temps de reprendre en main ce bon vieux blog. Bon, ça ce n'est pas fait sans malheur.

Tout d'abord il m'a fallut batailler pour mettre à jour Hexo. Plus rien ne marchait. J'ai donc
opté pour la solution radicale: repartir de zéro et corriger le thème à la main. Après quelques péripéties, j'ai décidé de ne pas m'étendre sur le jeu. Je vais plutôt aborder le déploiement sous Github Pages avec nom de domaine personnalisé.

Il existe deux types de sites disponibles selon les besoins: **utilisateur** ou dédié à un **projet**.

Une page Github **utilisateur** aura pour lien **https://`pseudo-github`.github.io**. Elle ne peut être créée qu'avec un repository nommé **`pseudo-github`.github.io** comme je l'ai fait avec le mien [repository:karlito40.github.io](https://github.com/karlito40/karlito40.github.io) accessible sous [https://karlito40.github.io](https://karlito40.github.io). Le site ne sera lu qu'à partir de la branche `master`.

Une page **projet** sera accessible sous **https://`pseudo-github`.github.io/`nom-du-repository-cible`**. Le site ira chercher le repository donné dans l'url puis analysera la branche `master` ou son dossier `/docs`. Dans le cas ou ces conditions ne sont pas remplis, Github consultera la branche `gh-pages` du projet.

Ne reste plus qu'à définir un nom de domaine personnalisé. Pour cela, il suffit d'aller dans le repository en question sous la rubrique **settings** puis remplir la section **Custom domain** avec par exemple blog.karlidev.fr. Ensuite, rendez vous sur votre hebergeur de nom de domaine. Ajoutez un paramètre CNAME pointant vers **`pseudo-github`.github.io** tout en oubliant pas d'activer un certificat SSL sur votre domaine.

### Etapes à suivre pour hexo

Installez le plugin de déploiement Github page

``` bash
$ npm i hexo-deployer-git --save
```

Configuration du site

``` yml
url: https://blog.karlidev.fr # votre nom de domaine customisé
                              # ou https://pseudo-github.github.io/


deploy:
  type: git
  repo: https://github.com/karlito40/karlito40.github.io.git # à remplacer par le votre
  branch: master # ou gh-pages dans le cas d'une page projet
```

Lancement du déploiement

``` bash
$ hexo clean && hexo generate && hexo deploy
```
