---
title: Supprimer les doublons d'un tableau
date: 2018-09-15 12:00:45
tags:
---


L'approche classique est de disposer d'un objet tampon dans lequel on va stocker l'identifiant de l'élément d'un tableau. Ainsi, à mesure que l'on parcourt le tableau, on va s'assurer que cet identifiant ne soit pas déjà présent dans l'objet en question. Si il existe, ca signifie que l'élément courant est un doublon.

Une première méthode est d'utiliser `reduce` ou une boucle `for` classique.

``` javascript
function enleverDoublon(tab, recupererIdentifiant) {
  const dejaVue = {};
  return tab.reduce((acc, val) => {
    const identifiant = recupererIdentifiant(val);
    if(!(identifiant in dejaVue)) {
      acc.push(val);
      dejaVue[identifiant] = true;
    }

    return acc;
  }, []);
}

enleverDoublon([
  {id: 1},
  {id: 2},
  {id: 1},
  {id: 3}
], o => o.id);
// retourne: [ { id: 1 }, { id: 2 }, { id: 3 } ]
```

Une autre méthode plus propre mais moins performante car nécessitant la construction d'un tableau intermediaire.

``` javascript
function enleverDoublon(tab, recupererIdentifiant) {
  const map = new Map(tab.map(v => [recupererIdentifiant(v), v]));
  return [...map.values()];
}

enleverDoublon([
  {id: 1, domain: 'google.com'},
  {id: 2, domain: 'gmail.com'},
  {id: 4, domain: 'wikipedia.com'},
  {id: 5, domain: 'gmail.com'}
], o => o.domain);
// retourne: [{id: 1, domain: "google.com"}, {id: 2, domain: "gmail.com"}, {id: 4, domain: "wikipedia.com"}]
```

Je vous laisse vous référer à la doc de [Map](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Map) dans la section sur la fusion de tableau.

Par contre, si on veut supprimer les vrais doublons il faudra construire un identifiant réprésentant d'avantage l'élément en question. Dans le dernier exemple on se rend compte que l'objet 'gmail.com' est supprimé alors qu'il n'est pas tout à fait un doublon. Pour palier à ce problème on pourrait utiliser l'identifiant suivant `o => o.domain + '-' + o.id` ou, plus barbare, `o => JSON.stringify(o)`.
