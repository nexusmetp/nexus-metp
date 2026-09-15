# NEXUS-METP — conventions du dépôt

Plateforme de gestion du personnel de la DGARH du Ministère de l'Enseignement
Technique et Professionnel (République du Congo). **Next.js 16** (App Router,
**Turbopack** par défaut), React 18, TypeScript, Tailwind, shadcn/ui.

Next 16 rompt avec les versions précédentes : conventions, API et arborescence
ont bougé. La documentation de la version installée est dans
`node_modules/next/dist/docs/` — s'y reporter plutôt qu'à ce dont on croit se
souvenir. `next dev` ajoutait de lui-même un avertissement à ce sujet à la fin
de ce fichier ; `agentRules: false` l'en empêche, et la phrase est ici, en
français, dans le document qui appartient au dépôt.

## Règle de taille : 500 lignes

**Aucun fichier de code ne dépasse 500 lignes.** C'est une règle, pas une
préférence : elle est vérifiée par une machine.

```bash
npm run taille      # échoue si un fichier est en infraction
npm run verifier    # idem, et signale ceux qui approchent (> 450 lignes)
```

Le hook de pré-commit refuse le commit en cas d'infraction :

```bash
git config core.hooksPath .githooks   # à faire une fois par clone
```

Un fichier qu'on ne peut pas lire d'un bout à l'autre ne se relit pas : on n'y
corrige plus qu'à l'aveugle, et chaque correction en ajoute une autre.

**Comment découper sans casser les appelants** — le motif utilisé partout dans
ce dépôt : remplacer `lib/queries.ts` par un dossier `lib/queries/` dont
l'`index.ts` réexporte les morceaux. Les imports existants (`@/lib/queries`)
continuent de fonctionner, aucun site d'appel ne bouge.

```
lib/types.ts   ->  lib/types/{organisation,agent,acte,archives,…}.ts + index.ts
lib/queries.ts ->  lib/queries/{base,actes,audit,organisation,archives,…}.ts + index.ts
lib/seed.ts    ->  lib/seed/{aleatoire,collaboration,gestion,archives}.ts + index.ts
lib/db.ts      ->  lib/db/{schema,migrations,connexion,semis,acces}.ts + index.ts
```

Les dérogations sont déclarées **avec leur motif** dans
`scripts/verifier-taille.mjs`. Une dérogation sans motif écrit n'en est pas une.

## La marque de l'État

Le blason, le drapeau et le bloc-marque vivent dans `/public`, et **nulle part
ailleurs**. Voir `public/LISEZMOI.md` pour les noms de fichiers acceptés : le
code cherche une **cascade** de noms et sert le premier présent, si bien qu'un
fichier officiel se dépose *tel quel*, sans être renommé ni converti. Le fichier fourni pour les armoiries est le **tracé officiel** des armoiries
de l'État, remis à l'échelle et optimisé ; il est le dernier de la cascade,
donc un fichier maître déposé par la DGARH prime automatiquement.

Les armoiries d'un ministère ne doivent dépendre d'aucun domaine que la DGARH
ne contrôle pas, et la plateforme doit s'afficher entièrement hors ligne : rien
n'est chargé depuis un hébergeur tiers. Le bundle de l'artefact incorpore les
fichiers en data URI (`bundle/build.mjs`).

Le timbre se porte partout : écran d'ouverture, connexion, barre latérale, et
barre du haut sur téléphone — là où la barre latérale est repliée. Le filet
tricolore court sans interruption en haut de l'application.

## Next 16 : trois réglages qui ne se devinent pas

Le passage à Next 16 a fermé les deux dernières alertes de sécurité
(`npm audit` : **aucune**). Il impose aussi **Turbopack** comme assembleur par
défaut, et trois réglages dans `next.config.js` sans lesquels rien ne marche
comme avant :

- **`allowedDevOrigins`**. Next 16 refuse de servir ses ressources de
  développement à une origine autre que la sienne. Le serveur écoute sur
  `0.0.0.0` pour être joignable depuis un autre poste ; sans cette liste, la
  page de connexion **arrive et reste figée** — React ne s'y attache jamais,
  aucun bouton ne répond, et rien dans la console ne le dit. Seul le journal
  du serveur le signale, en passant. C'est le piège le plus coûteux de la
  montée de version.
- **`agentRules: false`**. Sinon `next dev` ajoute à chaque lancement un bloc
  en anglais à la fin de `CLAUDE.md` et d'`AGENTS.md`. Ce fichier appartient au
  dépôt, pas à l'outillage.
- **plus de configuration `webpack`**. Elle ne servait qu'à remplacer la
  surveillance des fichiers par une scrutation ; le surveillant natif de
  Turbopack la rend inutile, et Next refuse désormais une configuration
  webpack sans configuration Turbopack en regard. `npm run dev:webpack` garde
  l'ancien assembleur sous la main.

`tsconfig.json` est réécrit par Next au premier lancement : `jsx` passe à
`react-jsx`, obligatoire en 16. Ne pas le remettre à `preserve`.

## La marque, résolue avant la construction

`public/LISEZMOI.md` promet qu'on dépose un fichier officiel dans `/public` et
que **la première présente gagne**. La promesse tient toujours, mais elle se
tient désormais à la **construction** et non à l'exécution
(`scripts/resoudre-marque.mjs` → `lib/referentiels/marque.ts`, engendré et
versionné). Déposez un fichier, reconstruisez : il prend sa place.

Le faire à l'exécution coûtait cher, et personne ne le voyait :

- les armoiries et le bloc-marque étaient cherchés par une cascade de `<img>`
  qui essayait chaque nom et **attendait l'erreur** — six requêtes perdues par
  ouverture de page, et un journal serveur constellé de 404 qui donnaient à
  croire à une panne ;
- le fond était pire. `background-image` avec plusieurs `url()` n'est **pas**
  une cascade : CSS les empile. Le navigateur téléchargeait les cinq fonds
  présents — 2,4 Mo — pour n'en afficher qu'un de 122 Ko. Sur l'écran
  d'ouverture, c'est-à-dire au pire endroit, et sur les connexions où cela
  compte le plus.

La page de connexion sert aujourd'hui **267 Ko d'images et aucun 404**.

Deux préalables tournent donc avant `dev` et `build` (`predev`, `prebuild`) :
la résolution de la marque, et la recopie du travailleur de MapLibre. Ils sont
idempotents — relancés sans changement, ils n'écrivent rien.

## Rien ne vient d'un tiers, la police comprise

La promesse d'afficher la plateforme hors ligne et sans hébergeur tiers était
démentie par deux balises dans l'en-tête : l'Inter arrivait de
`fonts.googleapis.com`. Une feuille de style distante **bloque le rendu** — la
page attendait Google avant de peindre un caractère — un poste sans accès
sortant n'avait jamais la police annoncée, et chaque ouverture disait l'adresse
du ministère à un tiers.

Le sous-ensemble **latin** de l'Inter variable vit désormais dans
`app/polices/` : **47 Ko**, une seule ressource pour toute la plage de graisses
là où l'appel distant en tirait cinq. Le latin couvre le français en entier ;
un glyphe hors de ce jeu retombe sur la pile système, comme avant. Licence SIL
Open Font, texte intégral à côté du fichier — elle autorise cette
redistribution. La variable `--police-interface` est posée sur `<body>` et non
sur `<html>`, où next-themes écrit déjà la classe du thème.

## Installable, et rien de plus pour l'instant

`app/manifest.ts` décrit la plateforme au navigateur — nom, icônes, cadre — de
sorte qu'un agent puisse l'inscrire à son bureau ou à son écran d'accueil. Les
icônes sont les armoiries rendues en matriciel, dans `/public` avec le reste de
la marque (voir `public/LISEZMOI.md` : cinq fichiers, 137 Ko, et leur commande
de régénération — elles ne suivent pas la cascade toutes seules).

**Aucun travailleur de service n'est posé**, et l'installation n'en réclame
pas. La plateforme installée se comporte exactement comme dans un onglet : il
lui faut le réseau pour se recharger. Le vrai hors-ligne est un chantier à
part, à instruire avec ses propres pièges — le cache périmé devant une base
migrée (`DB_VERSION`), les deux routes `[id]` rendues à la demande, et les
tuiles de la carte, que les conditions d'usage des serveurs cités interdisent
de recopier.

## Responsive : aucune page ne part de travers

Le défilement horizontal appartient au tableau ou au ruban qui déborde, jamais
à la page. Vérifié sur **31 routes × 3 largeurs** (390 / 768 / 1440).

Le piège, rencontré trois fois : un enfant de flex ou de grille garde
`min-width: auto`, donc **refuse de descendre sous la largeur de son contenu**
— et un `overflow-x: auto` posé à l'intérieur ne sert alors à rien. Le remède
est `min-w-0` sur l'enfant, pas sur le conteneur défilant.

## La carte

`/dgarh/national` porte la carte du déploiement. Le moteur est **MapLibre GL JS**
(BSD-3) : c'est lui qui lira les tuiles vectorielles du jour où le ministère
servira ses propres données depuis PostGIS, ce qu'aucune bibliothèque en images
matricielles ne sait faire.

**Trois signes, trois informations, et jamais deux fois la même** : la *forme*
dit la nature du site, la *taille* dit l'effectif, la *couleur du halo* dit
l'état. Un lecteur qui apprend ces trois règles une fois lit la carte entière
sans légende. Les états (`lib/carte/symboles.ts`) remontent d'abord ce qui
appelle une décision — postes vacants avant absences, absences avant mouvements
— parce qu'une carte qui peint tout en vert ne sert à rien. La couleur ne
remplace aucun chiffre : la fiche les donne tous.

**Huit fonds, et leurs conditions d'usage écrites à côté du bouton**
(`lib/carte/fonds.ts`). Les serveurs de tuiles cités sont tenus par des
associations et interdisent tous l'usage massif : un ministère de plusieurs
milliers d'agents sort de leur cadre en une semaine. La règle est affichée pour
qu'on ne l'apprenne pas le jour du blocage. L'imagerie satellite n'est **pas**
OpenStreetMap : ce sont des conditions Esri, à couvrir par une convention.

**Aucune police, aucun lutin, aucun hébergeur tiers.** Un style MapLibre va
normalement chercher ses glyphes et ses images chez quelqu'un ; ici les symboles
sont fabriqués en SVG dans la page et aucune couche ne porte de texte. C'est
pourquoi les amas — les seuls objets qui affichent des chiffres — sont des
éléments HTML et non des couches. Tout le reste part sur le processeur
graphique : le pays comptera des milliers d'implantations.

**Trois pièges rencontrés, et leur remède :**

- `setStyle` emporte sources, couches et images. Il faut les reposer sur
  **`style.load`** — pas sur `styledata`, qui se déclenche aussi pendant le
  chargement des tuiles, ni derrière `isStyleLoaded()`, qui ne repasse jamais à
  vrai quand une tuile n'arrive pas. S'en remettre à lui laissait la carte
  muette derrière des amas figés, ce que rien à l'écran ne trahissait.
- Le halo ne descend jamais sous le symbole qu'il entoure, sinon une petite
  implantation cache son propre anneau d'état — la seule chose qui dise où
  regarder.
- MapLibre charge son **travailleur** par une adresse calculée depuis
  `import.meta.url`. Une fois le paquet assemblé, cette adresse pointe sur le
  morceau produit, où le fichier n'existe pas, et la carte échoue à l'ouverture
  sans rien dire. `scripts/vendorer-carte.mjs` recopie le travailleur dans
  `public/maplibre/` avant chaque `dev` et chaque `build`, et `moteur.ts`
  l'annonce par `setWorkerUrl`. Même origine, donc pas de `blob:` : rien qui
  heurte une politique de sécurité de contenu stricte. Les fichiers recopiés ne
  sont pas versionnés — le verrou de dépendances fait foi.
- Le moteur pèse un mégaoctet et vit dans son propre morceau, chargé au geste.
  La page nationale le paie, aucune autre.

**La carte à plat** (`components/nexus/carte/plate.tsx`) sert deux cas réels :
le poste dont le pilote graphique est bloqué — il en reste dans les services —
et la maquette autonome, où le moteur est remplacé par un talon
(`bundle/build.mjs`). Ce n'est pas un message d'erreur déguisé : mêmes
positions, mêmes tailles, mêmes couleurs, et un clic ouvre la même fiche.

Les contours départementaux sont ceux des **douze** départements antérieurs à
2024 (`lib/geo-congo.ts`) : les trois créés depuis ne figurent dans aucune
source ouverte et sont situés par leur chef-lieu.

## Architecture du domaine

- **Événementiel** : l'état d'un agent est *projeté* depuis ses actes historisés
  (`dateEffet` / `dateFin` / `acteId`), jamais stocké. Ne jamais écrire un état
  courant en dur.
- **Centré sur l'acte** : un effet ne s'applique qu'à la **notification** de
  l'acte, jamais à sa signature.
- **Provenance** : toute donnée affichée porte son marqueur — `TEXTE`,
  `A_VERIFIER`, `RECOMMANDATION`. Ne jamais afficher un chiffre sans dire d'où
  il vient.
- **Habilitations** : rôle × périmètre, le périmètre étant dérivé de l'arbre des
  entités. Instruction et validation restent séparées.
- Un droit = un geste. Deux gestes de gravité différente (verser / éliminer) ne
  partagent jamais le même droit.

## Conventions de code

- Le code est écrit en **français** : identifiants, commentaires, libellés.
- **TypeScript partout, sans exception.** `npx tsc --noEmit` et `npm run build`
  passent tous les deux sans une erreur. Toute erreur de types est donc une
  régression, à corriger et non à contourner.

  Les 48 composants `components/ui/*` viennent de shadcn/ui et sont repris
  **au caractère près** de la source amont (style *new-york*), rechemin des
  imports mis à part. Ils étaient arrivés en `.jsx` types effacés, ce qui
  faisait échouer `next build` à la vérification des types : les props d'un
  `forwardRef` non typé se réduisent à `RefAttributes`, et chaque appelant
  qui passait `children` ou `className` était en faute — neuf cent cinquante-neuf
  erreurs pour une seule cause. Les reprendre d'amont a rendu les types sans
  rien changer au rendu.

  **Beaucoup ne servent à rien.** `calendar`, `chart`, `form`, `menubar` et
  `sidebar` ont été supprimés — avec eux la dernière dérogation à la règle des
  500 lignes, et quatre dépendances devenues sans objet
  (`react-day-picker`, `react-hook-form`, `@hookform/resolvers`,
  `@radix-ui/react-menubar`). Dix-sept autres ne sont toujours importés nulle
  part : `alert`, `alert-dialog`, `aspect-ratio`, `breadcrumb`, `carousel`,
  `collapsible`, `context-menu`, `drawer`, `hover-card`, `input-otp`,
  `navigation-menu`, `pagination`, `radio-group`, `resizable`, `slider`,
  `toaster`, `toggle-group`. Ils viennent de la commande d'installation, pas
  d'un besoin. Les garder se défend — ce sont des pièces disponibles — mais
  personne ne devrait croire qu'ils sont en service.

  **La règle qui suit de là : on ne modifie pas un fichier de `components/ui/`.**
  Ce qu'il faut adapter se fait par les classes passées de l'extérieur, ou dans
  un composant de `components/nexus/`. Neuf fichiers portent malgré tout une
  correction locale, reportée telle quelle lors de la reprise et notée ici pour
  qu'elle survive à la prochaine régénération :
  `hover-card`, `popover`, `tooltip` et `navigation-menu` ajoutent une
  `origin-[--radix-…-transform-origin]`, `select` remplace
  `placeholder:` par `data-[placeholder]:`, `context-menu` et `dropdown-menu`
  bornent leur hauteur à l'espace disponible, `form` affiche un message vide
  plutôt que « undefined », et `chart` garde ses `?? []`.
- Les commentaires disent **pourquoi**, pas quoi.
- Un écran se bâtit avec `PageHeader`, `RangeeKpi`, `BarreFiltres`, `TableauModule`
  (`components/nexus/module/`) : mêmes gestes d'une page à l'autre.
- Les tuiles de KPI portent un **ton** (`components/nexus/tons.ts`) — la couleur
  dit la nature du chiffre, pas la décoration.

## Langue de l'interface

`lib/langues/` — français (référence) et anglais. Portée : les écrans
d'accueil (ouverture, connexion, confirmation, commentaires). L'intérieur de
l'application reste en français, délibérément : « arrêté », « corps »,
« échelon », « position statutaire » désignent des catégories du droit
congolais, et les traduire donnerait à lire un texte sans valeur juridique.

`fr.ts` fait foi. `Dictionnaire = typeof fr` : toute langue ajoutée doit
remplir chaque clé, sans quoi la compilation échoue.

## Écran de connexion

Il tient dans la fenêtre et **ne défile jamais**. Les paliers de compacité sont
dans `globals.css`, sur la **hauteur** de la fenêtre et non sa largeur — c'est
la hauteur qui manque sur un portable de service ou un téléphone en paysage.
Vérifié à neuf tailles, de 1920×1080 à 844×390.

La connexion se fait **en deux temps** : vérification de l'identité, puis un
écran de confirmation qui porte les conditions d'usage avant que la moindre
donnée personnelle ne s'affiche. Tout ce qui pousse la page vers le bas — la
liste des comptes de démonstration — s'ouvre en panneau flottant.

## Rédaction et assistance

`/redaction` est le traitement de texte de la maison : une feuille A4 au
format administratif, un ruban rangé comme les suites bureautiques que les
agents connaissent (Accueil, Insertion, Mise en page, Révision), et les
brouillons conservés dans `lib/db/`.

**Trois étages de modèles, et l'ordre compte :**

1. **Les modèles livrés** (`lib/documents/`) sont du **code** et ne se
   modifient jamais depuis l'écran. Ils portent la forme réglementaire —
   timbre, visas, formule exécutoire, ampliations, « Article premier ». Une
   correction maladroite s'y répandrait sur toutes les pièces établies après
   elle, sans relecture.
2. **Les modèles de la maison** (`modelesMaison`) sont la reprise d'un modèle
   livré, ou une feuille blanche, déposée par un rédacteur. Ils se distinguent
   à l'œil dans la bibliothèque : un modèle écrit par un service n'a pas été
   relu par un juriste. Ils portent leur propre historique.
3. **Les brouillons** : employer un modèle n'y touche pas, il en fait une
   copie. Les **champs de fusion** (`{{agent.matricule}}`, `lib/redaction/jetons.ts`)
   se remplissent au dossier ouvert ; un champ resté vide devient une ligne de
   pointillés, comme sur un imprimé.

**On rédige *pour* un dossier, jamais à côté.** Le contexte du document
(`components/nexus/contexte-exemple.ts`) accepte un sujet — agent, acte,
entité — porté dans l'adresse (`/redaction?agent=…&modele=…`). « Éditer un
document » et la visionneuse mènent tous deux à l'éditeur en emportant le
dossier ouvert. Sans sujet, on sert un exemple.

**Les fichiers Word entrent et sortent** (`lib/redaction/docx.ts`,
`import.ts`) : `.docx` véritable en sortie, `.docx` reçu de l'extérieur en
entrée — dont on ne garde que la structure, jamais la maquette de
l'expéditeur. Les deux moteurs pèsent un mégaoctet et plus : ils sont
chargés au geste, jamais à l'ouverture d'une page, et remplacés par un
talon dans la maquette autonome (`bundle/build.mjs`), où l'interface
cesse alors d'offrir les deux formats.

**Assainissement — la porte se ferme des deux côtés.** `assainir()` s'applique
avant d'enregistrer *et* avant de poser un corps dans le DOM. Nettoyer
seulement à l'écriture ne protégerait que l'auteur : un modèle de la maison se
partage, et un corps piégé s'exécuterait chez le collègue qui l'ouvre.

**L'assistant est éteint par défaut et l'application n'en dépend jamais.** La
clé se pose dans Système → Assistant. Deux montages : le relais serveur
(`ASSISTANT_CLE` dans l'environnement, la clé ne descend pas au navigateur —
à retenir en production) et l'appel direct depuis le navigateur, qui fait
marcher la maquette sans serveur au prix d'une clé lisible sur le poste. La
bascule est automatique, et l'espace Système dit lequel est en vigueur.
Aucun nom de modèle n'est écrit en dur : la liste est demandée au fournisseur
avec la clé du ministère, et ne vieillit donc pas.

Un texte passé par l'assistant porte la mention au document et le brouillon
est marqué `assiste`. L'assistant rédige, il ne décide pas : rien de ce qu'il
produit n'a de portée avant relecture, signature et notification.

**Les données de l'utilisateur ne se réinitialisent pas avec le semis.**
`STORES_UTILISATEUR` (brouillons, modèles, échanges) est exclu du nettoyage :
le reste de la base est un décor qu'on refait à volonté, un brouillon a été
écrit par quelqu'un.

## Ce qui reste à faire

Le **serveur** : la plateforme est aujourd'hui une maquette complète qui garde
son état dans IndexedDB (`lib/db/`). Le passage à une base et une API reste le
seul chantier structurel, différé volontairement. C'est lui, et non l'éditeur,
qui borne le passage à l'échelle : deux postes valent aujourd'hui deux jeux de
brouillons.

Deux reprises attendent ce serveur, dans cet ordre :

- **l'éditeur sur Tiptap** (MIT, ProseMirror) plutôt que sur
  `document.execCommand`, que la spécification a déclaré obsolète et que chaque
  navigateur interprète à sa façon — et qui n'ouvre pas la co-édition ;
- **le `.docx` réel** (`docx`, MIT ; `docxtemplater`, MIT ; `mammoth`, BSD-2)
  à la place du HTML compatible Word.

Pour éditer un fichier Word quelconque avec fidélité, la voie est d'embarquer
une suite auto-hébergée **à côté** de la plateforme (Collabora Online, MPL-2.0),
jamais dedans.

Le serveur commande aussi la carte, dans cet ordre :

- **les tuiles du ministère** — un rendu servi depuis une machine de la DGARH
  plutôt que depuis les serveurs bénévoles cités dans `lib/carte/fonds.ts`, dont
  les conditions d'usage excluent l'échelle visée. Le moteur est déjà celui qui
  lit les tuiles vectorielles, il n'y a rien à réécrire côté écran ;
- **PostGIS**, pour que les coordonnées d'une implantation vivent dans la base
  et non dans un référentiel de code ;
- **Nominatim auto-hébergé**, pour la recherche d'adresses. La recherche
  actuelle est locale et porte sur les implantations du ministère — c'est
  d'ailleurs celle qui répond à la vraie question. L'instance publique de
  Nominatim interdit l'usage massif : la brancher telle quelle ferait bloquer
  l'adresse du ministère.

Le calcul d'itinéraires (OSRM, Valhalla) vient après, et seulement si un besoin
le réclame : une tournée d'inspection se prépare aujourd'hui sans la plateforme.
