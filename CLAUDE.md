# NEXUS-METP — conventions du dépôt

Plateforme de gestion du personnel de la DGARH du Ministère de l'Enseignement
Technique et Professionnel (République du Congo). Next.js 15 (App Router),
React 18, TypeScript, Tailwind, shadcn/ui.

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
- MapLibre est livré pré-assemblé, un mégaoctet sans le moindre `require` :
  `next.config.js` le met en `noParse`, et il vit dans son propre morceau,
  chargé au geste. La page nationale le paie, aucune autre.

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
- **TypeScript** partout dans le code applicatif. Les composants `components/ui/*`
  viennent de shadcn/ui en `.jsx` et ne sont pas typés — leurs erreurs `tsc`
  (`IntrinsicAttributes`, `has no properties in common`) sont préexistantes et
  ne sont pas des régressions.
- Les commentaires disent **pourquoi**, pas quoi.
- Un écran se bâtit avec `PageHeader`, `RangeeKpi`, `BarreFiltres`, `TableauModule`
  (`components/nexus/module.tsx`) : mêmes gestes d'une page à l'autre.
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
brouillons conservés dans `lib/db.ts`.

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
son état dans IndexedDB (`lib/db.ts`). Le passage à une base et une API reste le
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
