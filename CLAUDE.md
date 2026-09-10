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

## Ce qui reste à faire

Le **serveur** : la plateforme est aujourd'hui une maquette complète qui garde
son état dans IndexedDB (`lib/db.ts`). Le passage à une base et une API reste le
seul chantier structurel, différé volontairement.
