---
title: Déployer docker avec Elastic Beanstalk 
date: 2018-11-05 20:19:10
tags:
- AWS
---

Avant le déploiement, nos images images docker doivent être publié pour qu'Elastic Beanstalk puisse y accéder. Pour ce faire, on utilisera les commandes suivantes.

```
$ docker build -t my-image . 
$ docker tag my-image $ORGANISATION/my-image
$ docker push $ORGANISATION/my-image
```

## A partir d'un container simple

1. `eb init`

  Selectionner la plateforme `7) Docker`

2. `eb create $ENV_NAME`  *(exemple: api-prod)*

3. Créez un fichier `Dockerrun.aws.json` `version 1` pour expliciter la configuration de docker

   
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


## A partir d'une composition

1. `eb init`

   Selectionner la plateforme `8) Multi-container Docker`

2. `eb create $ENV_NAME`  *(exemple: api-prod)*

3. Créez un fichier `Dockerrun.aws.json` `version 2` pour expliciter la configuration de docker
   
   Le procédé peut être simplifié à l'aide de l'image docker micahhausler/container-transform.

   ```
    cat docker-compose.yml | docker run --rm -i micahhausler/container-transform > Dockerrun.aws.json
   ```

   Il faudra cependant veiller à corriger le contenu généré. L'id de version (ici 2) doit être rajouté et, dans certains cas, certaines erreurs devront être résolues.


4. `eb deploy`

## Inspection du container

1. `eb ssh`

- Les logs sont accessibles sous `/var/lib/docker/containers/<container id>/<container id>-json.log`

- La connexion au container se fait à l'aide de `docker exec -it <mycontainer> bash` (quand bash est installé)


## Custom domain

- Coté nom de domaine

  1. Allez sur le dashboard de votre nom de domaine. 
  2. Ajoutez lui un sous domaine. 
  3. Configurez ses DNS en lui attribuant un CNAME pointant vers l'url de l'environnement ELB.

- Coté AWS

  1. Allez dans le service "Certificate Manager".
  2. Cliquez sur "Demander un certificat" puis renseignez comme nom de domaine `*.mon-domaine.com`
  3. Validez la demande de certificat par mail.
  4. Retournez dans le service elastic beanstalk à la section configuration. 
  5. Selectionnez le Load Balancer.
  6. Ajoutez lui un listener `HTTPS 443` pointant vers `HTTP 80` avec le certificat précédemment créée.