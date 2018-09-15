title: Créer une API avec Node
date: 2015-03-20 14:48:01
tags:
- Node
- Express
- Mongo
---

Personnellement, j'ai toujours préféré réinventer la roue plutôt que d'utiliser un module déjà tout fait ou de copier/coller du code. L'intérêt est évidemment d'avoir quelque chose d'entièrement customisable, mais le but est aussi d'acquérir une connaissance pratique et une experience sur des systèmes qu'on sera ammené à utiliser tot ou tard (ici les apis).


Aujourd'hui, je vous propose donc d'implémenter les bases d'une api avec **node**, **express** et **mongo**. Let's go !

<img src="/images/rest_api.png" alt="">
<!-- more -->

Nous allons créer une api simple dont le but sera de gérer des pandas; parce que les pandas c'est cool. A la fin de ce tuto nous auront appris à:
* gérer des URL standardisées
* gérer un CRUD (**Create**, **Read**, **Update**, **Delete**) sur un item donné
* utiliser les verbes HTTP (**GET**, **POST**, **PUT**, **DELETE**)

Bref, du REST tout ce qu'il y'a de plus basique.

### Fondation

On commence par créer nos dépendances.

``` javascript package.json
{
    "name": "node-api",
    "main": "server.js",
    "private": true,
    "dependencies": {
        "express": "4.*",
        "mongoose": "3.*",
        "body-parser": "1.*"
    }
}
```
**Express** est un framework node dédié au web. **Mongoose** est un ORM pour mongo qui nous permettra de communiquer avec celui-ci sans se prendre la tête. **Body-parser**, quant à lui, nous permettra de décoder le contenu d'une requête.

Passons à l'installation.

``` bash
$ npm install
```

La base de notre serveur.
``` javascript server.js
var express = require('express')
	, app = express()
	, bodyParser = require('body-parser');


// Section "Panda Time"


// Section "Middleware"
// decode les requêtes de type application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// decode le contenu d'une requete de type application/json
app.use(bodyParser.json());

// on mettra notre router ici pour rester simple
// Section "Router"

// on demarre le serveur
var port = process.env.PORT || 8080;        
app.listen(port, null, null, function(){
	console.log('Demarrage du serveur sur le port', port);

});

```
Les fondations sont maintenant posées. Il est temps de passer aux choses sérieuses.

### Router

On créée une route de test histoire de s'assurer que notre serveur marche. Placez le code suivant dans **server.js** section **Router**

``` javascript
// Section "Router"
var router = express.Router();              

// Création d'une uri de test dans notre router
// Associe '/' au json {yolo: 'hey'}
router.get('/', function(req, res) {
    res.json({
    	yolo: 'Hey !'
    });   
});

// Toutes les uris présentes dans notre router seront préfixées par '/api'
app.use('/api', router);
```

Je vous invite à demarrer votre serveur avec **nodemon** si vous ne voulez pas à avoir à le redémarrer à chaque modification.

``` bash
$ nodemon server.js
```
Normalement, si tout s'est bien passé, votre [navigateur](http://localhost:8080/api) devrait afficher {"yolo":"Hey"}. Pour gagner du temps lors des tests, on utilisera **postman** ou **curl** en ligne de commande.

``` bash
$ curl http://localhost:8080/api -X GET
```

Cool ! Notre router marche. On va maintenant s'atteler à la création des données.

### Panda time

Avant de commencer, nous allons devoir nous connecter à mongo avec **mongoose**.

``` javascript
// Section "Panda Time"
var mongoose   = require('mongoose')
	, db = mongoose.connection;

// Tentative de connexion à notre bdd
mongoose.connect('mongodb://localhost:27017/api_test');
// Verifie le status de la connection
db.on('error', function(err) {
	console.error("La connection a mongo a echoue");
});
db.once('open', function (callback) {
  console.log('yay ! ')
});

```

Mongoose vient avec un model de données vraiment bien foutu mais cela sera l'objet d'un prochain article. En attendant, nous allons créer un panda basique constitué d'un unique champ nom.

Dans **app/models/panda.js**:

``` javascript app/models/panda.js
var mongoose = require('mongoose')
	, Schema = mongoose.Schema;

var PandaSchema   = new Schema({
    nom: String
});

module.exports = mongoose.model('Panda', PandaSchema);
```

On update notre serveur pour pouvoir utiliser notre panda.

``` javascript
// ...
var mongoose   = require('mongoose')
	, db = mongoose.connection
	, Panda = require('./app/models/panda');
// ...
```

Les fondations sont maintenant érigées. La prochaine étape sera de créer l'api... ce qui reste notre but principal.

### Api

Voici les routes que nous allons créer avec leurs verbes HTTP.

* /api/pandas (**GET**) Récupère tous les pandas
* /api/pandas (**POST**) Créée un panda
* /api/pandas/:panda_id (**GET**) Récupère un panda donné
* /api/pandas/:panda_id (**PUT**) Modifie un panda donné
* /api/pandas/:panda_id (**DELETE**) Supprime un panda


Ce sont les routes basiques dans une API.

Nous avons vu auparavant comment utiliser le Router d'express avec les methodes simples (comme router.post(), router.get(), ..) mais cet usage est un peu rebarbabatif dans la mesure où on sera obligé de dupliquer les uri pour chaques verbes HTTP. Pas de panique, les devs d'express ont pensé à tout: on peut catégoriser des routes.

Utilisez ce code de test dans server.js.

``` javascript
router.route('/pandas')
	.post(function(req, res, next) {
		res.json({
			result: "pandas post"
		})        
    })
    .get(function(req, res, next) {
		res.json({
			result: "pandas get"
		})        
    });
```

Et constatez le résultat avec les commandes suivantes
``` bash test-get-pandas
$ curl http://localhost:8080/api/pandas -X GET
```

``` bash test-post-pandas
$ curl http://localhost:8080/api/pandas -X POST -d '{"nom":"Super panda"}' -H "Content-Type: application/json"
```

Tout marche niquel ! On va pouvoir implémenter l'insertion et la récupération.

``` javascript
router.route('/pandas')
	// Ajoute un panda avec le nom renseigné en POST
	.post(function(req, res, next) {
		var panda = new Panda();
        panda.nom = req.body.nom;  
        panda.save(function(err) {
            res.json({success: (err) ? false : true});
        });       
    })
    // Récupère tous les pandas
    .get(function(req, res, next) {
		Panda.find(function(err, pandas) {
            if (err) res.send(err);
            res.json(pandas);
        });        
    });
```

Renvoyez les commandes de test, utilisez le verbe POST pour ajouter un panda et constatez l'ajout celui-ci en utilisant GET.

Il nous reste maintenant à créer un nouveau groupe de route pour gérer un panda donné.

Commencons par récupérer un panda.

``` javascript
router.route('/pandas/:panda_id')
    // Récupère un panda donné
    .get(function(req, res, next) {
        Panda.findById(req.params.panda_id, function(err, panda) {
            if (err) res.send(err);
            res.json(panda);
        });
    });

```

Et la méthode pour tester (changez l'id du panda en fonction de votre base de données).

``` bash
$ curl http://localhost:8080/api/pandas/550c689a1d61a6904e3315fe -X GET
```

La modification d'un panda se fait de la même façon que lors de sa création.

``` javascript
// A ajouter au groupe précédent
// Modifie le nom d'un panda
.put(function(req, res, next) {
    Panda.findById(req.params.panda_id, function(err, panda) {
        if (err) res.send(err);

        panda.nom = req.body.nom;  
        panda.save(function(err) {
           res.json({success: (err) ? false : true});
        });

    });
});
```

Testons maintenant.

``` bash test-put-panda
$ curl http://localhost:8080/api/pandas/550c689a1d61a6904e3315fe -X PUT -d '{"nom":"Mechant panda"}' -H "Content-Type: application/json"
```


Ajoutons la suppression d'un panda avec le verbe DELETE (toujours dans le me groupe du router).

``` javascript
// Supprime un panda
.delete(function(req, res, next) {
    Panda.remove({ _id: req.params.panda_id }, function(err, panda) {
		res.json({success: (err) ? false : true});
    });
});
```

Un dernier test pour la route.

``` bash test-delete-panda
$ curl http://localhost:8080/api/pandas/550c689a1d61a6904e3315fe -X DELETE
```

Voila ! Vous en avez finit avec les bases d'une api. On a maintenant tous les moyens pour gérer un CRUD sur un item spécifique avec notre propre API. Ces techniques devraient être un bon démarrage pour construire quelque chose de plus grand.

Je rajouterai dans une prochain article une authentification en OAuth2 afin de pouvoir distribuer notre super api. En attendance, je vous laisse avec l'intégralité du server.js

``` javascript server.js

var express = require('express')
	, app = express()
	, bodyParser = require('body-parser');

// Section "Panda Time"
var mongoose   = require('mongoose')
	, db = mongoose.connection
	, Panda = require('./app/models/panda');

// Tentative de connexion à notre bdd
mongoose.connect('mongodb://localhost:27017/api_test');
// Verifie le status de la connection
db.on('error', function(err) {
	console.error("La connection a mongo a echoue");
});
db.once('open', function (callback) {
  console.log('yay ! ')
});

// Section "Middleware"
// decode le contenu d'une requete de type application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// decode le contenu d'une requete de type application/json
app.use(bodyParser.json());

// on mettra notre router ici pour rester simple
// Section "Router"
var router = express.Router();              

// Création d'une uri de test dans notre router
// Associe '/' au json {yolo: 'hey'}
router.get('/', function(req, res) {
    res.json({
    	yolo: 'Hey'
    });   
});

router.route('/pandas')
	// Ajoute un panda avec le nom renseigné en POST
	.post(function(req, res, next) {
		var panda = new Panda();
        panda.nom = req.body.nom;  
        panda.save(function(err) {
            res.json({success: (err) ? false : true});
        });       
    })
    // Récupère tous les pandas
    .get(function(req, res, next) {
		Panda.find(function(err, pandas) {
            if (err) res.send(err);
            res.json(pandas);
        });        
    });

router.route('/pandas/:panda_id')
    // Récupère un panda donné
    .get(function(req, res, next) {
        Panda.findById(req.params.panda_id, function(err, panda) {
            if (err) res.send(err);
            res.json(panda);
        });
    })
    // Modifie le nom d'un panda
    .put(function(req, res) {
        Panda.findById(req.params.panda_id, function(err, panda) {
            if (err) res.send(err);

            panda.nom = req.body.nom;  
            panda.save(function(err) {
               res.json({success: (err) ? false : true});
            });

        });
    })
    // Supprime un panda
   .delete(function(req, res, next) {
        Panda.remove({ _id: req.params.panda_id }, function(err, panda) {
			res.json({success: (err) ? false : true});
        });
    });


// Toutes les uris présentes dans notre router seront préfixées par '/api'
app.use('/api', router);


// on demarre le serveur
var port = process.env.PORT || 8080;        
app.listen(port, null, null, function(){
	console.log('Demarrage du serveur sur le port', port);
});
```
