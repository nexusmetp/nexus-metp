# Fichiers de marque à déposer ici

Déposez les fichiers officiels du ministère dans ce dossier, **tels quels** —
sans les renommer autrement, sans les convertir. L'application prend le premier
qu'elle trouve, et rien d'autre n'est à modifier dans le code.

## Armoiries de la République

Cherchées dans cet ordre :

1. `amoirie.png`
2. `armoiries-congo.png`
3. `armoiries-congo.svg`  ← tracé vectoriel de dépannage, fourni

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
