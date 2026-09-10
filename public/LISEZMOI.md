# Fichiers de marque à déposer ici

Déposez les fichiers officiels du ministère dans ce dossier, **tels quels** —
sans les renommer autrement, sans les convertir. L'application prend le premier
qu'elle trouve, et rien d'autre n'est à modifier dans le code.

## Armoiries de la République

Cherchées dans cet ordre :

1. `amoirie.png`
2. `armoiries-congo.png`
3. `armoiries-congo.svg`  ← **fourni** : le tracé vectoriel officiel des
   armoiries de l'État (couronne de palmes, écu d'or au lion de gueules
   tenant une torche, bande ondée de sinople, deux éléphants pour supports,
   listel « UNITE TRAVAIL PROGRES »), inscrit dans le rond du ministère.

Ce fichier n'est plus un dépannage : c'est le vrai emblème. Il n'y a donc
rien à déposer, sauf si la DGARH possède son propre fichier maître — auquel
cas il prime, et il suffit de le poser sous l'un des deux premiers noms.

Elles servent partout : écran d'ouverture, page de connexion, barre latérale,
filigrane, en-têtes des documents imprimés.

## Bloc-marque du ministère

Blason + filet tricolore + libellé, en une seule image. Cherché dans cet ordre :

1. `metplogo.webp`
2. `metplogo.png`
3. `logo-metp.svg`

S'il n'y en a aucun, `<LogoMETP />` compose le bloc lui-même : le blason reste
une image, le libellé reste du texte — il se lit au lecteur d'écran, se
sélectionne, et ne pixellise à aucune taille.

## Drapeau

`drapeau-congo.svg` — tracé exact (parti en bande, de sinople, d'or et de
gueules), il n'a pas besoin d'être remplacé.

## Comment déposer

Poussez les fichiers sur la branche de travail :

```bash
git checkout claude/project-analysis-bac46g
cp ~/Téléchargements/amoirie.png public/
cp ~/Téléchargements/metplogo.webp public/
git add public/ && git commit -m "Poser les fichiers de marque du ministère"
git push
```

Ou, sans ligne de commande : sur GitHub, ouvrir le dossier `public/` de la
branche, **Add file → Upload files**, glisser les deux fichiers, valider.
