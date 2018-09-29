---
title: 'Web extension, communication entre scripts'
date: 2018-09-29 16:29:53
tags:
- Javascript
- WebExtension
---

Précédemment, nous avons vu comment "hacker" un site web pour y intégrer notre petite application. Maintenant, il nous reste plus qu'à implémenter la communication entre les différents scripts que contiennent une WebExtension.

Une WebExtension se compose de deux scripts.

- **content_scripts** qui s'occupe de la page consultée.
- **background** qui écoute en tache de fond du navigateur.

Deux méthodes différentes existent pour dialoguer avec eux.

- `chrome.tabs.sendMessage` appelle content_script.
- `chrome.runtime.sendMessage` appelle background.

Les scripts répondent à ces messages à l'aide de `chrome.runtime.onMessage`.

Ajourd'hui nous cherchons à simplifier le système de routing des messages. Mon idée, aussi valable dans d'autres circonstances (dialogue entre microservices, api, ...), est de permettre à un script d'exposer ses fonctions aux  autres. Les différents scripts devront être capable d'appeler directement ces fonctions en utilisant leurs signatures.

Bon ok, je suis pas clair. Ce que je veux faire, c'est ca:

``` javascript background.js
export function maFonction(p1, p2) {
  return {done: yes};
}

export function uneFonctionAsync() {
  return new Promise(resolve => {
    setTimeout(() => resolve({done: yes}), 200);
  })
}

// ... + d'autres fonctions ...
```

Le script en background expose ses fonctions, puis le content-script les consomment sans avoir à s'occuper de `sendMessage`.

``` javascript content-script.js
const res1 = await background.maFonction('lorem', 'ipsum');
const res2 = await background.uneFonctionAsync();

```

Bien sûr background.js pourra lui aussi appeler des fonctions de content-script.js s'il en expose.

Avant de pouvoir implémenter ca, on doit d'abord se poser la question du routing. J'ai opté pour l'utilisation d'un objet contenant le nom de la commande/fonction à utiliser ainsi que son tableau d'arguments à rattacher.

``` javascript message.js
function createAction(cmd, ...args) {
  return { cmd, args };
}

// Envoie du message
const action = createAction('maFonction', ['lorem', 'ipsum']);
chrome.runtime.sendMessage(action, function(response) {})  
```

La table de routage se fait à l'aide d'une "HashMap" comprenant en clé le nom de la fonction exposée. On profite d'`import * as commands from './fonctions-a-exposer'` pour générer automatiquement l'objet.

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

Pour remédier à cela, on va créer une facade qui s'occupera d'exécuter `sendMessage` à notre place. ES2015 intègre une nouvelle classe, `Proxy`, qui convient parfaitement à cette description. Elle nous permet de placer des "écouteurs" sur un objet donné. Ces écouteurs seront appelés dès lors qu'une propriété est demandé ou modifié.

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

Un peu plus compliqué, l'envoie d'un message à content_script nécessite de récupérer l'identifiant de l'onglet dans lequel celui ci évolue. Notre objectif est de coupler cette récupération à l'envoie du message de sorte à pouvoir faire  `service.content.get(tabId).maFonction()`

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
import {service} from 'message';

// Pour appeler content_script
const res = await service.content.get(tabId).uneCommandeExpose('lorem', 'ipsum');
const res2 = await service.content.current().uneCommandeExpose('lorem', 'ipsum');

// Pour appeler background
const res3 = await service.background.uneCommandeExpose('lorem', 'ipsum');
```
Vous n'avez pas tout suivi ? Il vous manque une partie de l'implémentation ? N'ayez crainte, le code est disponible [ici](https://github.com/karlito40/fofo/blob/8c9ddac1b15539496669052887f599ae454ac71f/fofo-web-ext/src/shared/ipc.js). Vous y retrouverez notamment l'implémentation de `sendMessage`et de `getCurrentTab`.
