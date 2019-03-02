---
title: Docker sous Elastic Beanstalk 
date: 2018-11-05 20:19:10
tags:
- AWS
---

Ca y'est, c'est fini ! Notre périple autour des web extensions s'achève enfin... ou presque. Eh oui, il nous manque un petit détail: la mise en production ! Bordel, va falloir payer. Bon, tant pis, on optera pour la bonne vielle solution de secours, celle dont on ne doit jamais parler au risque de se retrouver avec le FBI au cul. Allez j'ose. mettons un brain de folie dans cette vie de dev. Recréons nous un compte AWS ! ...[quelques instants plus tard]... Hop hop, le tour est joué, nous voila fraichement pourvu du free tier graal. 

Plus de temps à perdre en parlote, le temps s'écoule vite, ils nous restent déjà plus que 8759 heures de "gratuité".

On se dépêche de pusher illico presto nos images docker sur DockerHub et on s'attaque à AWS.

```
$ docker build -t my-image . 
$ docker tag my-image $ORGANISATION/my-image
$ docker push $ORGANISATION/my-image
```

## Process de déploiement d'un conteneur unique

1. `eb init`
On sélectionne la plateforme `7) Docker`
2. `eb create $ENV_NAME`  *(exemple: api-prod)*
3. Créez un fichier `Dockerrun.aws.json` `version 1` 
On y ajoute notre configuration

``` javascript Dockerrun.aws.json
// exemple
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "karlito40/laravel"
  },
  "Ports": [
    {
      "ContainerPort": "80"
    },
    {
      "ContainerPort": "443"
    }
  ],
  "Volumes": [
    {
      "HostDirectory": "/var/app/current",
      "ContainerDirectory": "/var/www/laravel"
    },
    {
      "HostDirectory": "/var/app/current/docker/nginx/fofo-api.prod.conf",
      "ContainerDirectory": "/etc/nginx/conf.d/default.conf"
    },
    {
      "HostDirectory": "/var/app/current/docker/nginx/ssl",
      "ContainerDirectory": "/etc/nginx/ssl"
    }
  ],
  "Logging": "/var/log/nginx"
}
```

4. `eb deploy`

> tadam !


## A partir d'un emsemble de conteneurs

1. `eb init`
On sélectionne la plateforme `8) Multi-container Docker`
2. `eb create $ENV_NAME`  *(exemple: api-prod)*
3. Créez un fichier `Dockerrun.aws.json` `version 2` 
On l'implémente en fonction de  notre docker-compose.yml
   
A noter qu'il existe l'image docker `micahhausler/container-transform` pour générer automatiquement `Dockerrun.aws.json` à partir d'un docker-compose.yml

```
cat docker-compose.yml | docker run --rm -i micahhausler/container-transform > Dockerrun.aws.json
```

Helas, dans mon cas, la fichier produit était buggé: volume erroné, mauvaise version, etc...

4. `eb deploy`

> tadam !

## Débuger un conteneur

Tout d'abord on se connecte à notre instance.

```
$ eb ssh
```

Les logs sont alors accessibles sous `/var/lib/docker/containers/<container id>/<container id>-json.log`

## Ajouter un nom de domaine personnalisé à son environnement

- Du coté hébergeur de nom de domaine

  1. Placez vous sur le dashboard de votre nom de domaine. 
  2. Ajoutez lui un sous domaine. 
  3. Configurez ses DNS en lui attribuant un CNAME pointant vers l'url de l'environnement ELB.

- Du coté AWS

  1. Allez dans le service "Certificate Manager".
  2. Cliquez sur "Demander un certificat" puis renseignez comme nom de domaine `*.mon-domaine.com`
  3. Validez la demande de certificat par mail.
  4. Retournez dans le service elastic beanstalk à la section configuration. 
  5. Selectionnez le Load Balancer.
  6. Ajoutez lui un listener `HTTPS 443` pointant vers `HTTP 80` avec le certificat précédemment créée.

  > Tadam !