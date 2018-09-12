title: Hexo, un blog en markdown
date: 2015-02-22 18:29:50
tags:
- Hexo
---

Si comme moi vous êtes rebuté par les back offices et les usines à gaz facon wordpress alors [Hexo](http://hexo.io/) est fait pour vous. Ici, pas de base de données, seulement du json et du markdown simple. Plus besoin de se connecter ou de lancer un serveur pour rédiger et formater son article. Le bloc note sera notre seul et unique outil. Besoin d'un exemple ? C'est partit.

``` mardown mon-article
title: Hexo, un blog en markdown
date: 2015-02-22 18:29:50
tags:
- Hexo
---

Si vous êtes rebuté par les back offices et les ..
```

Génial non ? L'entête de notre article est délimité par les trois "-" et le reste du contenu utilisera du mardown simple. Nous allons maintenant voir comment créer entièrement un blog sous hexo en moins de 5 minutes.
<!-- more -->

### Utilisation de base

C'est le moment d'installer node si vous l'avez pas déjà fait sinon vous pouvez dès à présent récupérer hexo comme ci-dessous:

``` bash install-hexo
$ npm install -g hexo
```

Installer hexo globalement vous permet d'avoir accès à sa ligne de commande. Il est ainsi aisé de créer un blog à partir de zéro.

``` bash init-blog
$ hexo init project-test
$ cd project-test
$ npm install
```

Tadam, vous avez maintenant un blog prêt à être utilisé. Elle est pas belle la vie ? Vous ne me croyez pas ? Alors lancez cette commande.

``` bash
$ hexo server
```

Et observez le résultat dans votre navigateur préféré [check](http://localhost:4000).

<img src="/images/screen1.png" alt="">

Un blog sans article est un peu... fade. Il est temps de passer à l'action è.é

``` bash
$ hexo new post "un super post"
```

Votre article est alors créée dans /source/_posts/un-super-post.md et enregistré dans le fichier /db.json. Toutes modifications faites dans un-super-post.md seront néanmoins prises en compte. Les tags et les catégories sont automatiquement gérés dans l'entête de ce dernier.

### Image

Pour uploader vos propres images, le plus simple reste de les intégrer au dossier /themes/(theme_courant)/source/images. Actuellement votre theme courant est sans doute "landscape". Votre contenu aura ainsi accès à vos images sans avoir à passer par un prestataire externe (imgur, etc..).

``` markdown utilisation-image.md
Et observez le résultat dans votre navigateur préféré [check](http://localhost:4000).

<img class="full-image" src="/images/screen1.png" alt="">
```

A noter, j'utilise ici la balise img au lieu du markdown prévu à cet effet pour spécifier un attribut class. Si jamais vous en avez besoin, voici comment on intègre une image en markdown.

``` markdown
![alt_text](/images/screen1.png)
```

### Gestion des thèmes

Hexo vient avec un gestionnaire de thème assez simple à utiliser. La liste des thèmes est accessible [ici](https://github.com/hexojs/hexo/wiki/themes). Si nous prenons par exemple le cas d'[Aiki](http://foreachsam.github.io/blog-framework-semantic-ui/article/) il nous suffit de dézipper ou de cloner son [repo](https://github.com/foreachsam/hexo-theme-aiki) dans /themes/

``` bash
$ git clone https://github.com/foreachsam/hexo-theme-aiki.git themes/aiki
```

La deuxième partie de commande themes/aiki dépend évidemment de votre chemin courant.

Il ne vous reste plus qu'à spécifier ce thème dans /_config.yml

``` bash yaml _config.yml
theme: aiki
```
Petite précision, le nom du thème correspond à son nom de dossier.

Voila, c'est finit pour aujourd'hui ! Le but du prochain post sera de déployer ce blog pour 0€ :D

<img src="/images/screen2.png" alt="">
