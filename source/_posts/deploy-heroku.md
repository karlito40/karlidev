title: Heroku, déploiement d'Hexo
date: 2015-03-18 16:07:51
tags:
- Heroku
- Git
---

Heroku est connu pour faciliter le déploiement d'application. On peut désormais se concenter uniquement sur les choses qui nous intéressent au lieu d'avoir à configurer nos serveurs et d'en prévoir la scalabilité.

Aujourd'hui, nous allons voir comment déployer notre blog sans le moindre frais et de manière scalable en quelques secondes.

<img src="/images/heroku-logo.jpg" >
<!-- more -->


### Bien commencer

Tout d'abord allez sur [Heroku](https://www.heroku.com) et ouvrez votre compte gratuit. Avant d'aller plus loin, assurez vous d'avoir **node**, **npm**, **git** et **l'utilitaire heroku** sur votre machine.

Sous debian, l'utilitaire heroku se récupère ainsi:

``` bash install heroku
$ wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh | sh
```

Vous devriez maintenant être capable d'accéder à la ligne de commande d'heroku.

``` bash
$ heroku
```
<img src="/images/heroku-cmd.png" >

Il ne vous reste plus qu'à vous authentifier pour la première et dernière fois.

``` bash
$ heroku login
```

### Git & Heroku

L'un des points forts d'Heroku est d'être parfaitement intégré à git ce qui va nous faciliter la vie. Un push et nos changement sont en prod !

Nous allons maintenant essayer de déployer notre blog fraichement créée. Placez vous à la racine de votre blog et executez la ligne suivante:

``` bash init-repo
$ git init
```

Profitez en pour ajouter un repo externe.

``` base add-remote
$ git remote add origin https://github.com/karlito40/hexo-tuto.git
```

Dans le même temps, on va créer un autre repo externe appelé "heroku". Tout ça est généré automatiquement par heroku grace à la commande suivante:

``` bash
$ heroku create hexo-tuto
```

L'appli hexo-tuto devrait alors apparaitre dans votre administration heroku et un nouveau repo externe a du être ajouté à votre code.

``` bash check-remote
$ git remote -v
```

### Particularité d'hexo

Je vous déconseille fortement d'utiliser la fonctionnalité d'hexo censé faciliter le déploiement (hexo deploy) celle ci étant particulièrement buggé lorsqu'il s'agit de faire des mises à jours. Le plus simple reste d'instancier soit-même le serveur. Pour cela, nous allons créer un nouveau fichier **app.js** et profiter de **connect** pour démarrer le serveur.

``` javascript app.js
var connect = require('connect'),
  app = connect.createServer(),
  port = process.env.PORT || 4000;

app.use(connect.static(__dirname + '/public'));
app.use(connect.compress());

app.listen(port, function(){
  console.log('Hexo is running on port %d', port);
});
```

On pense à ajouter **"connect":"2.x"** dans les dépendances de notre **package.json** et à générer le contenu static d'hexo avant de pusher sur heroku.

``` bash generate-static-files
$ hexo generate
```

Le **gitignore** doit également être modifié puisqu'on ne se sert pas du built-in deploy.

``` text .gitignore
.DS_Store
Thumbs.db
debug.log
node_modules/
.deploy/
```

### Déployer votre app

Par defaut, heroku ira chercher la commande d'instanciation de notre application dans **package.json** section **scripts** index **start**. On peut également définir cette commande particulière dans un fichier **Procfile** spécialement dédié à heroku. De ce fait, si vous n'avez pas d'index **start** vous pouvez tout à fait définir un Procfile chargé d'executer notre app:

``` bash Procfile
web: node app
```

Voila, notre déploiement est enfin prêt ! Il nous reste plus qu'à pusher notre app sur le repository d'heroku:

``` bash deploy-to-heroku
$ git add .
$ git commit -m "Deploy"
$ git push heroku master
```

Admirez le travail: [https://hexo-tuto2.herokuapp.com/](https://hexo-tuto2.herokuapp.com/).

## Eviter l'endormissement des instances gratuites

Vous avez peut être remarqué que votre site met un certains temps avant de démarrer. Pas de panique, c'est normal. Heroku a tendance à endormir les instances gratuites au bout d'une dizaine de minutes si trop peu de requêtes sont enregistrées. Par ailleurs, ce système peut facilement être contourné à l'aide de [Kaffeine](http://kaffeine.herokuapp.com/) qui va se charger de pinger votre instance toutes les X minutes :)
