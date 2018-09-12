title: L'importance des streams
date: 2015-07-25 19:41:43
tags:
- node
---

L'api stream, bien que fondamentale, est souvent sous exploitée et méconnue. Pourtant c'est l'une des plus grandes forces de node, si ce n'est la plus grande.

Un **stream** est basiquement un objet tourné vers la réception, l'envoie et le traitement de données découpées en plusieurs morceaux généralement appelés **chunks**. Les méthodes et les fonctionnalités de cet objet seront déterminées par son type.
*   Ecriture (writable)
*   Lecture (readable)
*   Les deux (duplex)

L'interet d'un stream est de pouvoir traiter des données en même temps qu'on les recoit. Il y'a beaucoup d'avantages à un tel procédé. Déjà nous allons utiliser moins de mémoire puisqu'il nous est possible d'enoyer un chunk au garbage collector. De la même manière nous allons gagner en temps de traitement. 


On peut se rendre compte du problème en émulant/imaginant deux api: l'une basique, l'autre à base de stream.
``` javascript voie-normal
// Création des données
function getDatasFromApi(cb) {
  var datas = []
  , i = 0;
  // Pour l'exemple...
  var _job = function() {
    if(datas.length<5) {
      setTimeout(_job, 1000);
    } else {
      cb(datas);
    }

  }

  _job();

}

// Traitement des données
getDatasFromApi(function(datas){
  datas.forEach(function(o){
    console.log(o.line);
  });
});

```

Ce même code en simulant un stream.

``` javascript stream
// Création des données
function getDatasFromApi(stream) {
  var datas = []
  , i = 0;
  var _job = function() {
    stream.push('data', {line: "Line" + (i++)});
    if(i<5) {
      setTimeout(_job, 1000);
    } else {
      stream.push('end');
    }

  }

  _job();
}

// Stream simulation
var stream = { 
  cbs: {},
  on: function(type, cb){
    this.cbs[type] = cb;
  },
  push: function(type, chunk){
    if(this.cbs[type]) {
      this.cbs[type](chunk);
    }
  }
};

// Traitement des données au vol
stream.on('data', function(chunk){
  console.log(chunk.line);
});

getDatasFromApi(stream);
```

Lequel est le plus intéressant ? A vous de voir...



