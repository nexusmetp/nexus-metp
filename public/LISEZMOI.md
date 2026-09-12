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

## Icônes d'application

Ce sont les armoiries **rendues en image matricielle**, aux tailles que
réclament les systèmes pour inscrire la plateforme au bureau ou à l'écran
d'accueil d'un agent. Elles sont déclarées dans `app/manifest.ts` et dans
l'en-tête (`app/layout.tsx`) : rien n'est cherché par tâtonnement.

| Fichier | Taille | Emploi |
|---|---|---|
| `favicon.ico` | 48, 32, 16 | onglet du navigateur |
| `icone-192.png` | 192×192 | manifeste, `purpose: any` |
| `icone-512.png` | 512×512 | manifeste, `purpose: any` |
| `icone-masquable-512.png` | 512×512 | manifeste, `purpose: maskable` |
| `apple-touch-icon.png` | 180×180 | écran d'accueil iOS |

Deux d'entre elles ont un **fond blanc plein**, et ce n'est pas une
décoration : le lanceur Android rogne l'icône masquable à sa propre forme
— ronde, écusson, goutte — jusqu'à 20 % du bord, et iOS compose sur du noir
tout ce qui est transparent. Le tracé y est donc ramené à 75 % du carré, à
l'intérieur de la zone sûre.

**Elles ne se régénèrent pas toutes seules.** La cascade des armoiries est
résolue à la construction, mais un fichier maître déposé par la DGARH sous
`amoirie.png` ne redessine pas ces cinq images : ce sont des dérivés
versionnés, comme `bureau-ministre.webp` l'est de `bkImage.png`. Après avoir
remplacé les armoiries, relancer, depuis `public/` :

```bash
S=armoiries-congo.svg   # ou le nom du fichier maître déposé
convert -background none -density 1200 "$S" -resize 512x512 -strip -colors 256 PNG8:icone-512.png
convert -background none -density 1200 "$S" -resize 192x192 -strip -colors 256 PNG8:icone-192.png
convert -background none -density 1200 "$S" -resize 384x384 -gravity center -background white \
        -extent 512x512 -flatten -strip -colors 256 PNG8:icone-masquable-512.png
convert -background none -density 1200 "$S" -resize 170x170 -gravity center -background white \
        -extent 180x180 -flatten -strip -colors 256 PNG8:apple-touch-icon.png
convert -background none -density 1200 "$S" -define icon:auto-resize=48,32,16 favicon.ico
```

Les cinq pèsent 137 Ko en tout. Le `-colors 256` n'est pas un détail : sans
lui, la seule icône de 512 en pèse 198.

## Bloc-marque du ministère

Blason + filet tricolore + libellé, en une seule image. Cherché dans cet ordre :

1. `metplogo.webp`
2. `metplogo.png`
3. `logo-metp.svg`

S'il n'y en a aucun, `<LogoMETP />` compose le bloc lui-même : le blason reste
une image, le libellé reste du texte — il se lit au lecteur d'écran, se
sélectionne, et ne pixellise à aucune taille.

## Fond de l'ouverture et de la connexion

La photographie du **bâtiment du ministère**, façade et enseigne. Cherchée dans
cet ordre, et **la première présente gagne** :

1. `batiment-metp.webp`  ← **servi** : 194 Ko
2. `batiment-metp.jpg`   ← repli si le navigateur ignore le WebP : 251 Ko
3. `batiment-metp.png`   ← **le master déposé**, 2,5 Mo, 1983×793

Les deux premiers sont **fabriqués depuis le master**. Pour les régénérer après
avoir remplacé `batiment-metp.png` :

```bash
node -e "const s=require('sharp');
  s('public/batiment-metp.png').resize({width:1920,withoutEnlargement:true})
   .jpeg({quality:80,mozjpeg:true,progressive:true}).toFile('public/batiment-metp.jpg');
  s('public/batiment-metp.png').resize({width:1920,withoutEnlargement:true})
   .webp({quality:76}).toFile('public/batiment-metp.webp');"
```

`sharp` n'est pas une dépendance du projet : on l'installe le temps de la
conversion, hors du dépôt. L'encodeur WebP d'ImageMagick, lui, **ignore la
qualité demandée** — il rend le même fichier quoi qu'on lui passe.

La photo sert **à deux écrans** : l'ouverture et la connexion, avec deux voiles
différents (`.voile-ouverture` et `.voile-connexion` dans `app/globals.css`).
À l'ouverture le texte est posé à même la photo : il faut un voile plus dense
et une clairière au centre. Si vous voulez régler l'assombrissement, ce sont
les deux seules règles à toucher.

**Le cadrage compte.** Celle-ci fait 2,5:1 — bien plus large que haute. Posée
en `cover`, elle est rognée sur les côtés : sur un écran de bureau on perd les
pelouses, sur un téléphone en portrait on ne garde que la partie centrale. Ce
n'est supportable que parce que la composition est **symétrique**, l'entrée et
l'enseigne tombant au centre exact. Une photo dont le sujet serait décentré
demanderait, elle, un recadrage.

Format conseillé : **JPEG ou WebP, 1920 px de large environ, sous 400 Ko**, et
un sujet centré.

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
