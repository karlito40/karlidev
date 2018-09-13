---
title: Github Pages, déploiement d'hexo
date: 2018-09-13 16:10:52
tags:
- Hexo
---

Eh non je ne suis pas encore mort ! Pour feter la fin de l'été je me suis dit qu'il était
temps de reprendre en main ce bon vieux blog. Bon, ça ce n'est pas fait sans malheur.

Tout d'abord il m'a fallut batailler pour mettre à jour Hexo. Plus rien ne marchait. J'ai donc
opté pour la solution radicale: repartir de zéro et corriger le thème à la main. Ca a été long et fastidieux mais voila c'est fait.

Bref, attelons nous au sujet principal: Github Pages.

Github différencie deux types de sites. L'un tourné autour de l'**organisatation** détenant un ensemble de repositories. L'autre, **projet**, décrit un repository donné.

Une page Github d'**organisatation** aura pour lien **https://`organisation`.github.io**. Elle ne peut être créée qu'à partir d'un repository nommé **`organisation`.github.io** comme je l'ai fait avec le mien [repository:karlito40.github.io](https://github.com/karlito40/karlito40.github.io) accessible sous [https://karlito40.github.io](https://karlito40.github.io). Le site ne peut être placé que sur la branche `master` du repo.

Une page **projet** est accessible sous l'adresse suivante **https://`organisation`.github.io/`nom-du-repository-cible`**. Le site doit être placé dans le dosser `/` ou `/docs` sur la branche `master`. Github se servira de la branche `gh-pages` à défaut.

Ne reste plus qu'à définir un nom de domaine personnalisé. Pour cela, il suffit d'aller dans le repository en question sous la rubrique **settings** puis remplir la section **Custom domain** avec par exemple blog.karlidev.fr. Ensuite, rendez vous sur votre hebergeur de nom de domaine. Ajoutez un paramètre CNAME pointant vers **`organisation`.github.io**.

### Etapes à suivre pour hexo

Installez le plugin de déploiement Github page

``` bash
$ npm i hexo-deployer-git --save
```

Configuration du site

``` yml
url: https://blog.karlidev.fr # votre nom de domaine customisé


deploy:
  type: git
  repo: https://github.com/karlito40/karlito40.github.io.git # à remplacer par le votre
  branch: master # ou gh-pages dans le cas d'une page projet
```

Créer un fichier CNAME dans `/source` pour garder le nom de domaine personnnalisé.

``` bash
$ echo blog.karlidev.fr > source/CNAME
```

Déploiement

``` bash
$ hexo clean && hexo generate && hexo deploy
```
