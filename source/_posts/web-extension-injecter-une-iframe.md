---
title: Web extension, injecter une iframe
date: 2018-09-16 12:11:06
tags:
- Javascript
- Tips
- WebExtension
---

L'idée est d'encapsuler une application distante à l'intérieur d'un site pour lui ajouter, par exemple, une sidebar. A noter que si l'on vise seulement Firefox, on peut utiliser `sidebar_action` en manifest de notre extension. Le seul problème c'est que cette sidebar vient avec un layout non configurable.

**L'approche naïve** est de créer une iframe avec source externe et de l'injecter grace à `document.body.append` dans notre `content_scripts`.

```javascript contentScript.js
const appExterne = document.createElement('iframe');
appExterne.id = 'encapsulateApp';
appExterne.src = 'https://mon-appli.com';
document.body.append(appExterne);
```

Seulement, certains sites comme gmail ou github ne permettent pas de charger une frame externe et émettent une erreur `Content-Security-Policy`.

**L'approche valide** est d'enregistrer l'iframe dans le manifest de l'extension.

``` javascript manifest.json
// ...
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["contentScript.js"]
  }
],
"web_accessible_resources":[
  "public/iframeAutorise.html"
]
// ...
```

Notre iframe `iframeAutorise.html` est alors packagé avec notre extension. Plus de problème de `Content-Security-Policy` se pose.

Notre code devient:

```javascript contentScript.js
const appInterne = document.createElement('iframe');
appInterne.src = chrome.runtime.getURL('/public/iframeAutorise.html');
document.body.append(appInterne);
```

Néanmoins, la mise à jour de l'application dépéndra du bon vouloir de l'utilisateur puisque l'iframe est intégré à l'extension. Pour palier à ce constat on va combiner deux iframes, l'une enregistré dans l'extension et l'autre servant de passerelle à l'application.

`iframeAutorise.html` est donc limité à un échange d'information entre les deux parties: l'extension et l'application.

``` html iframeAutorise.html
<body>
  <iframe src="%APP_URL%"></iframe>
  <script src="pipe.js"></script>
</body>
```

``` javascript pipe.js
// Réception des messages
window.addEventListener('message', (e) => {
  // Renvoi des messages à l'iframe %APP_URL%
  document.querySelector('iframe').contentWindow.postMessage(e.data, '*');
});
```

Notre application, désormais servit par `APP_URL`, devient maintenable comme tout site web.

On oublie pas de mettre à jour le manifest pour rendre accessible pipe.js et permettre à notre application d'envoyer des messages à l'extension.

```javascript manifest.json
// ...
"web_accessible_resources":[
  "public/*"
],
"externally_connectable": {
  "matches": [
    // Pour le dev
    "*://localhost/*",
    // APP_DOMAIN à remplacer
    "*://APP_DOMAIN/*",
    // exemple: "*://*.karlidev.fr/*"
    "*://*.APP_DOMAIN/*"  
  ]
}
// ...
```

Envoyer un message de l'application vers l'extension nécessite de récupérer son ID et de créer un script en background pour y répondre. Mais comment récupérer cet ID ? Tout simplement en le passant en paramètre à l'`iframeAutorise`.

``` javascript contentScript.js
// Remarque: on remplace la variable appInterne par appTunnel
appTunnel.src = chrome.runtime.getURL('/public/iframeAutorise.html?extid=' + chrome.runtime.id);
```

La création de l'iframe passerelle doit désormais se faire dynamiquement pour passer `extid` à l'application.

``` html iframeAutorise.html
<body>
  <!-- PLUS NECESSAIRE -->
  <!-- <iframe src="%APP_URL%"></iframe> -->
  <script src="pipe.js"></script>
</body>
```

C'est `pipe.js` qui s'en charge.

``` javascript pipe.js
var params = new URLSearchParams(window.location.search)
const extid = params.get('extid');

const app = document.createElement('iframe');
app.src = '%APP_URL%?extid=' + extid;
document.body.append(app);

// reste du code ...
```

L'application peut alors appeler l'extension directement.

``` javascript application.js
var params = new URLSearchParams(window.location.search)
const extid = params.get('extid');
chrome.runtime.sendMessage(extid, objetAEnvoyer, function(response) {});
```

L'extension doit alors créer un script en background pour gérer cet appel ce qui nécessite la mise à jour de notre manifest.

``` javascript manifest.json
// ...
"background": {
  "scripts":["background.js"]
}
/// ...
```

Gestion du message en arrière plan `background.js`.

``` javascript background.js
chrome.runtime.onMessageExternal.addListener(function(msg, sender, sendResponse) {
  // Reception du message

  // Envoi d'un message à l'application
  sendResponse(objetAEnvoyer);

  // Envoi d'un message à contentScript
  chrome.tabs.sendMessage(sender.tab.id, objetAEnvoyer, function(response) {});
});
```

Coté contentScript, l'envoi d'un message à l'application se fera avec `window.postMessage`:

```javascript contentScript.js
document.getElementById('encapsulateApp')
  .contentWindow
  .postMessage(JSON.stringify(objetAEnvoyer), '*');

// pipe.js s'occupera de redistribuer le message
```

#### Récapitulatif

Pour distribuer une application depuis une extension.

```
[contentScript: création d'une iframeAutorisé]
  -> [iframeAutorisé: création de l'iframeDistribué]
    -> [iframeDistribué: affiche l'app]
```

Envoi d'un message de l'extension vers l'application.

```
[contentScript: postMessage sur iframeAutorisé]
  -> [iframeAutorisé: renvoi postMessage sur iframeDistribué]
    -> [iframeDistribué: réception du message par l'app]
```

Envoi d'un message de l'application vers l'extension.

```
[app: chrome.runtime.sendMessage(extensionID)]
  -> [background: gestion du message]
    | [envoi réponse à l'app]
    | [envoi nouveau message vers contentScript]
```
