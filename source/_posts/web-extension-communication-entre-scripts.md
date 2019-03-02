---
title: 'Web extension, communication entre process'
date: 2018-09-29 16:29:53
tags:
- Javascript
- WebExtension
---

Dans l'épisode précédent, nous avons vu comment "hacker" un site web pour y intégrer notre petite application. Nous nous sommes alors quittés sans même avoir évoqué le point crucial de toute extension: la communication entre process. 

Une WebExtension est composé de deux process majeurs.

- **content_scripts** qui s'occupe de communiquer avec la page courante.
- **background** qui, lui, est en charge de dispatcher les évenements du navigateur à l'extension.

Ces process communiquent entre eux par le biais de deux fonctions.

- `chrome.tabs.sendMessage` qui permet d'appeler **content_script** depuis **background**.
- `chrome.runtime.sendMessage` qui permet l'effet inverse.

La réception des messages se fait à l'aide de `chrome.runtime.onMessage`.

Ce système peut vite devenir un merdier sans nom si on ne fait pas attention. Pour palier à ce problème, j'ai pensé à une idée simple, une idée forte, une idée qui va révolutionner le monde de l'informatique. Et comme je suis pas chien, je vous la partage avec ma plus grande bonté ! 

Mon idée, aussi valable dans d'autres circonstances (dialogue entre microservices, api, electron...), est de permettre à un process d'exposer ses fonctions aux autres de façon invisible. 

Bref, trêve de bavardage et passons aux choses sérieuses.

---

Partons d'un export de fonctions lambda dans un process tout aussi lambda.

``` javascript background.js
export function maFonction(p1, p2) {
  return { done: 'yes' };
}

export function uneFonctionAsync() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ toto: 'yes' }), 200);
  })
}
// ... + d'autres fonctions ...
```

Ici, **background.js** expose ses fonctions, puis le process distant les consomment à l'aide de la même signature auto générée. 

``` javascript content-script.js
const res1 = await background.maFonction('lorem', 'ipsum');
const res2 = await background.uneFonctionAsync();
```

Bien sûr **background.js** pourra lui aussi appeler des fonctions exposées dans d'autre process.

---

Pour arriver à ce résultat, nous devons créer un système de route à l'instar d'une api pour établir une relation entre **l'appelant** et **l'appelé**. 

On se basera sur le nom de la fonction utilisé par **l'appelant** pour déclencher **l'appelé**.  L'idée à l'air bonne. C'est parti pour le dev ! Je dirais même plus, c'est parti pour le POCito ! *(un POCito est un petit POC)*


``` javascript message.js
// L'envoie d'un message se fait à partir d'un format particulier
// "cmd" équivaut au nom de la fonction à appeler sur le process distant
// "args" sont les arguments à passer à la fonction appelé
function createAction(cmd, ...args) {
  return { cmd, args };
}

// ... puis un envoie de message se fera comme ca
const action = createAction('maFonction', ['lorem', 'ipsum']);
// "chrome.runtime" ou "chrome.tabs" en fonction du process
chrome.runtime.sendMessage(action, function(response) {})  
```
 
On profite d'`import *` pour générer automatiquement la HashMap associée à notre table de routage.

``` javascript message.js
// Récupère la table de routage
import * as commands from './fonctions-a-exposer';
// Ecoute les messages en provenances des autres sources
chrome.runtime.onMessage.addListener(listener({commands}));

function listener(options = {}) {
  const commands = options.commands || {};
  // Attention les extensions ne supportent pas await dans ce callback,
  // du coup on utilisera le bon vieux then
  return function onMessage(request, sender, sendResponse) {

    let response = null;
    // request contient l'action "maFonction" de tout à l'heure
    // avec comme args ['lorem', 'ipsum']

    // commands contient la table de routage
    // si commands.maFonction existe, on l'execute.
    if(request.cmd && commands[request.cmd]) {
      response = commands[request.cmd](...request.args, sender);
      // On en profite pour gérer les reponses asynchrones
      if(response instanceof Promise) {
        response.then(sendResponse);
        // Dans le cas d'une réponse asynchrone
        // on doit retourner true
        return true;
      }
    }

    sendResponse(response);
  }
}

```

On est dorénavant capable d'éxécuter une fonction à distance. Par contre, le format ne convient pas à notre idée de départ. On doit toujours passer par `createAction` ce qui rend l'utilisation pénible.

Pour remédier à cela, on va créer une facade qui s'occupera d'exécuter `sendMessage` à notre place. ES2015 intègre une nouvelle classe, `Proxy`, qui répond parfaitement à notre demande. Elle nous permet de placer des "écouteurs" sur un objet donné. Ces écouteurs seront appelés dès lors qu'une propriété est demandé ou modifié.

Tout d'abord, amusons nous à créer le Proxy d'appel au background.

``` javascript message.js
// Tous les accès aux propriétés de serviceBackground
// renverrons vers sendMessage avec comme commande le nom
// de la propriété appeler
const serviceBackground = new Proxy({}, {
  get(obj, cmd) {
    return (...args) => sendMessage(createAction(cmd, ...args));
  }
});

// on peut désormais appeler sendMessage comme suit
// serviceBackground.maFonction('lorem', 'ipsum')
```

Un peu plus compliqué, l'envoie d'un message à content_script nécessite de récupérer l'identifiant de l'onglet dans lequel celui ci évolue. Notre objectif est de chainer cette récupération avec l'envoie du message de sorte à avoir une API stylé.

``` javascript message.js
const serviceContent = {
  // Pour envoyer sur l'onglet courant
  current() {
    return new Proxy({}, {
      get(obj, cmd) {
        return async (...args) => {
          const tab = await getCurrentTab();
          return sendMessage(tabId, createAction(cmd, ...args));
        }
      }
    });
  },
  // Pour envoyer sur un onglet spécifique
  get(tabId) {
    // Similaire à serviceBackground
    return new Proxy({}, {
      get(obj, cmd) {
        return (...args) => sendMessage(tabId, createAction(cmd, ...args));
      }
    });
  }  
};
```

On oublie pas d'exporter nos services.

``` javascript message.js
export const service = {
  content: serviceContent,
  background: serviceBackground,
};
```

Et voila ! Nos scripts peuvent désormais communiquer facilement entre eux.

``` javascript exemple.js
import { service } from 'message';

// Pour appeler content_script
const res = await service.content.get(tabId).uneCommandeExpose('lorem', 'ipsum');
const res2 = await service.content.current().uneCommandeExpose('lorem', 'ipsum');

// Pour appeler background
const res3 = await service.background.uneCommandeExpose('lorem', 'ipsum');
```

Vous n'avez pas tout suivi ? Il vous manque une partie de l'implémentation ? N'ayez crainte, le code est disponible [ici](https://github.com/karlito40/fofo/blob/8c9ddac1b15539496669052887f599ae454ac71f/fofo-web-ext/src/shared/ipc.js). Vous y retrouverez notamment l'implémentation de `sendMessage`et de `getCurrentTab`.
