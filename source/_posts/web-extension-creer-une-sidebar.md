---
title: 'Web extension, créer une sidebar'
date: 2018-09-22 17:11:11
tags:
- Javascript
- WebExtension
---

Dans l'épisode précédent, nous avons étudié l'[injection d'iframe](/2018/09/16/web-extension-injecter-une-iframe) dans une Web extension. Nous savons désormais qu'il est possible d'intégrer du contenu à un site web en limitant l'altération de son style et sa structure.

Mon envie maintenant est de me servir de ce que nous avons appris pour créer un panel ajustable et paramétrable. Comme des images sont plus parlantes que des mots, je vous présente le prototype issue de cet article.

<figure class="caption-img">
  <img src="/images/web-extension/sidebar-panel.png" alt="SidebarPanel"/>
  <figcaption>***SidebarPanel*** *Affiche un cadre (ou panel) sur le coté gauche du site visité*</figcaption>
</figure>

<figure class="caption-img">
  <img src="/images/web-extension/bottom-panel.png" alt="BottomPanel"/>
  <figcaption>***BottomPanel*** *Affiche un cadre (ou panel) en bas du site visité*</figcaption>
</figure>

Mais là vous vous dites que la deuxième image ne fait pas référence à une sidebar. Vous vous sentez flouez par l'article. C'est normal. Lancé dans mon élan, j'ai prévu l'implémentation d'un deuxième panel: une devbar. Il m'était impossible de résister à la tentation.

### Etude des besoins et problèmes à résoudre

Le projet laisse le choix à l'utilisateur de naviguer entre les panels. Il doit pouvoir passer d'un type de panel à un autre dynamiquement sans avoir à relancer un build ou de recharger la page. Ces panels devront aussi être redimensionnables.

De ce constat, je suis parti sur un système de scène qui va s'atteler à la gestion du rendu des différents panels sélectionnables. Un peu à la React, la scène ainsi que les panels seront vues comme des composants avec une méthode de rendu et de clean. La scène s'occupera d'appeler leurs méthodes réciproques au bon moment.

Les panels seront injectés en position `fixed`. Le problème principal sera donc de repositionner tous les éléments du site qui arriveront derrière ce panel.

Dans le cas d'une sidebar, l'approche qui parrait la plus évidente est d'ajouter une transformation en translateX sur `<html>` d'un montant résultant de la dimension du panel. Vous pouvez essayer... ca marche... à première vue. En faite, tous les éléments en position `fixed` seront correctement repositionnés mais leur fixation ne fonctionnera plus (ils ne suivront plus le scroll). On optera plutôt pour un `margin-left` et on parcourera le dom pour déplacer tous les éléments `fixed` à la main. Un autre étape à ne pas oublier est d'ajouter la position `relative` à `body` pour les éléments `absolute`.

Dans le cas d'une devbar, c'est plus simple. Il nous suffit d'ajouter un padding à `html` du même montant que la dimension du panel.

### Performance

Par défaut un Content-Script d'une Web extension s'exécute en mode `document_idle`. Dans notre cas, ce n'est pas acceptable car l'on veut s'assurer que la sidebar soit affiché dès lors que la page s'ouvre, avant même que son contenu soit chargé. Pour cela, on utilisera le mode `document_start` dans notre manifest. Il faudra prendre en compte qu'au moment où le script s'executera il n'aura accès qu'a `<html>` à travers `document.documentElement`. L'injection du panel se fera donc dans `<html>` et non pas dans `<body>` qui lui sera accessible qu'après avoir reçu l'event `DOMContentLoaded`.


```javascript manifest.json
//...
"content_scripts": [
    {
      "run_at": "document_start",
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"]
    }
  ],
//...
```

### Réalisation

Tout d'abord, on va s'attarder sur notre Scene. Comme dit précédemment, elle gère la création des panels, leurs rendus et leurs redimensionnements. Les commentaires sont là pour expliquer le procédé.

``` javascript PanelScene.js
import interact from 'interactjs';
import { createElement, setStyles } from '../utils/dom';
import Body from '../elements/Body';
import SidebarPanel from '../panels/SidebarPanel';
import BottomPanel from '../panels/BottomPanel';

class PanelScene {
  constructor(params = {}) {
    // La scène s'attache sur <html>
    this.root = document.documentElement;
    // document.body amélioré
    // on lui a ajouté setPosition() pour garder en
    // mémoire la position initial de <body>
    this.body = Body;

    // Notre scene (<div>)
    this.view = null;
    // Notre appli (<iframe>)
    this.appView = null;

    // Le dernier panel utilisé
    this.previousPanel = null;
    // Le panel courant
    this.selectedPanel = null,

    // Rend accessible nos panels à l'aide d'un index
    this.panels = new Map();
    this.panels.set('sidebar', new SidebarPanel(this, MIN_SIDEBAR_WIDTH));
    this.panels.set('bottom', new BottomPanel(this, MIN_BOTTOM_HEIGHT));
  }

  // Création de la scene
  create() {
    // Créée une div en bas à gauche de l'écran
    this.view = createElement('div', {
      id: `root-${APP_NAME}`,
    }, { border: '0', position: 'fixed', bottom: '0', left: '0', zIndex: '9999999', });

    // Charge le contenu du panel
    this.appView = createElement('iframe', {
      id: APP_NAME,
      src: chrome.runtime.getURL('/public/frame.csp.html?extid=' + chrome.runtime.id)
    }, {
      width: '100%', height: '100%', border: '0',
    });

    // On créée les coins draggable du redimensionnement
    this.edges = createEdges();
    Object.values(this.edges).forEach((edge) => {
      this.view.append(edge);
    });

    this.view.append(this.appView);
    this.root.append(this.view);

    // Intégre la lib pour redimensionner
    this.createResizable();

    // On refait un rendu pour déplacer tous les éléments
    // fixed et absolute lorsque le style est chargé
    window.addEventListener('load', (event) => {
      this.render();
    });
  }

  render() {
    // Créée le container si c'est pas déjà fait
    this.ensureCreate();

    // La scène précédente doit supprimer tous les
    // styles qu'elle a injecté
    if(this.previousPanel) {
      this.previousPanel.clear();
    }

    // Rendu du panel sélectionné
    this.selectedPanel.render();
  }

  createResizable() {
    interact(`#${this.view.id}`)
      .resizable({
        edges: this.edges,
        restrictEdges: {
          outer: 'parent',
          endOnly: true,
        },
        restrictSize: this.selectedPanel.restrict(),
      })
      .on('resizestart', this.resizeStart.bind(this))
      .on('resizeend', this.resizeEnd.bind(this))
      .on('resizemove', (e) => {
        this.resize(e.rect);
      });
  }

  /************************************
   ** Reponse aux redimensionnements **
   ************************************/

  resizeStart() {
    // On supprime la gestion du curseur sur l'iframe
    // pour éviter qu'il ne prenne le pas sur le redimensionnement
    this.appView.style.pointerEvents = 'none';
    this.selectedPanel.resizing = true;
  }

  resizeEnd() {
    this.appView.style.pointerEvents = 'auto';
    this.selectedPanel.resizing = false;
    // Nouveau rendu dans le but de déplacer tous les élements fixed et absolute
    this.render();
  }

  resize(rect) {
    // Change la dimension du panel
    // Provoque un nouveau rendu
    this.selectedPanel.setSize(rect);
  }

  /**************************
   ** Gestion des panels **
   **************************/

 select(panelIndex) {
   if(this.selectedPanel) {
     this.previousPanel = this.selectedPanel;
   }

   this.selectedPanel = this.getPanel(panelIndex);
   this.render();
 }

  getPanel(panelIndex) {
    return this.panels.get(panelIndex);
  }

  ensureCreate() {
    if(!this.view) {
      this.create();
    }
  }
}
```

Le changement de panel se fera donc simplement avec `select` qui s'occupera de déléguer le rendu.


``` javascript contentScript.js
const panelScene = new PanelScene();

panelScene.select('sidebar');
// ou ... panelScene.select('bottom');

```

Nous avons plusieurs panels qui partagent tous des méthodes identiques. Déjà, ils doivent avoir un `render` pour styliser la scène et la page visitée, puis un `clear` pour effacer ces modifications. L'héritage semble donc tout indiqué dans notre cas.

``` javascript BasePanel.js
// Tout Panel créée devra hériter de cette classe
class BasePanel {
  constructor(scene, minSize) {
    ensureAbstractMethods(this, [
      'restrict',
      'clear',
      'render',
    ]);

    this.scene = scene;
    this.resizing = false;
    this.minSize = minSize;
    this.currentSize = minSize;
    // Dimension minimal (utile pour le redimensionnement)
    this.restrictSize = this.restrict();  
  }
}
```

Je n'évoquerai pas le BottomPanel puisque pratiquement identique à notre Sidebar.

``` javascript SidebarPanel.js
import BasePanel from './BasePanel';
import { setStyles, getFixedNode } from '../utils/dom';

class SidebarPanel extends BasePanel {
  // Restriction du dimensionnement par rapport à sa largeur
  restrict() {
    return { width: this.minSize };
  }

  render() {
    // Dimensionnement && styling de la scène
    // Egalement appelé lors du redimensionnement
    setStyles(this.scene.view, {
      width: `${this.currentSize}px`,
      top: '0',
      height: 'auto',
      border: 'O',
      borderRight: '1px solid rgba(0, 0, 0, 0.04)',
    });

    // <body> doit être mis en relative pour les éléments absolutes
    this.scene.body.setPosition('relative');

    this.scene.root.style.marginLeft = `${this.currentSize}px`;

    // Déplace les élements fixed seulement lorsque
    // l'on ne redimensionne pas pour des raisons de perf
    if(!this.resizing) {
      this.moveFixedNode();
    }
  }

  // Efface les modifications
  clear() {
    this.scene.root.style.marginLeft = '0';

    this.moveFixedNode(0);
    this.scene.body.restorePosition();
  }

  // Déplace tous les éléments fixed
  moveFixedNode(forceSize) {
    const size = (typeof forceSize === 'undefined') ? this.currentSize : forceSize;
    const nodes = getFixedNode((node, style) => node !== this.scene.view);

    nodes.forEach(node => {
      if(!node.getAttribute('data-ori-x')) {
        const style = window.getComputedStyle(node);
        node.setAttribute('data-ori-x', parseInt(style.left, 10) || 0);
      }

      const oriX = parseInt(node.getAttribute('data-ori-x'), 10);
      node.style.left = `${oriX + size}px`;
    });
  }

  // Determine currentSize à partir du rectangle récupéré
  // de l'event de redimensionnement
  setSize(rect) {
    this.currentSize = parseInt(rect.width, 10);
    this.render();
  }

}
```

### Conclusion

L'intégralité du code peut être retrouvé [ici](https://github.com/karlito40/fofo/tree/0b9c77f5bdee16607fbbfcdbd2579146e59ef227/fofo-web-ext). Ce lien faisant référence à un commit en particulier, pensez à regarder la branche master pour voir si j'ai pas trouvé une meilleur façon de faire entre temps.
