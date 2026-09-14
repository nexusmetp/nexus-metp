"use client";

import { useEffect, useState } from "react";
import type { ProfilAcces, Utilisateur } from "@/lib/types";
import {
  CODE_PROFIL_BASE, PROFILS, RANG_HIERARCHIQUE, codeDepuisLibelle,
  verdictModification, verdictRang, type ModuleKey,
} from "@/lib/referentiels";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire,
} from "@/components/nexus/module";
import { MatriceProfil, appliquer, type Niveau } from "./matrice";

/* ------------------------------------------------------------------ */
/* Créer ou régler un profil de la maison                              */
/* ------------------------------------------------------------------ */

const VIERGE = "__vierge";

/**
 * Le formulaire d'un profil — tous les profils, sans exception.
 *
 * Trois choses y sont délibérément contraintes. **Le code ne se modifie
 * jamais après la création** : les comptes le portent, et le changer les
 * priverait tous de leurs droits d'un coup. **Le rang est borné par celui de
 * l'auteur**, sans quoi l'écran devient le chemin le plus court vers
 * l'élévation de privilège. Et **on ne retire pas à son propre profil
 * l'écriture sur cet écran** : c'est le seul chemin du retour, et le fermer
 * demanderait de rouvrir la base à la main.
 *
 * La reprise d'un profil existant copie ses droits plutôt que de partir
 * d'une page blanche : personne ne reconstitue de mémoire les vingt-cinq
 * modules d'un chef de service.
 */
export function DialogueProfil({
  ouvert, profil, auteur, surFermeture, surValidation,
}: {
  ouvert: boolean;
  /** `null` = création. */
  profil: ProfilAcces | null;
  auteur: Utilisateur;
  surFermeture: () => void;
  surValidation: (profil: ProfilAcces, creation: boolean) => void;
}) {
  const creation = !profil;
  const [libelle, setLibelle] = useState("");
  const [description, setDescription] = useState("");
  const [rang, setRang] = useState("10");
  const [base, setBase] = useState(VIERGE);
  const [reserve, setReserve] = useState(false);
  const [technique, setTechnique] = useState(false);
  const [portee, setPortee] = useState<"PERIMETRE" | "MINISTERE">("PERIMETRE");
  const [administre, setAdministre] = useState<"PERIMETRE" | "MINISTERE">("PERIMETRE");
  const [droits, setDroits] = useState<Record<string, "R" | "W">>({});

  useEffect(() => {
    if (!ouvert) return;
    setLibelle(profil?.libelle ?? "");
    setDescription(profil?.description ?? "");
    setRang(String(profil?.rang ?? 10));
    setBase(profil?.deriveDe ?? VIERGE);
    setReserve(profil?.reserveAdmin ?? false);
    setTechnique(profil?.technique ?? false);
    setPortee(profil?.portee ?? "PERIMETRE");
    setAdministre(profil?.administre ?? "PERIMETRE");
    setDroits({ ...(profil?.droits ?? {}) });
  }, [ouvert, profil]);

  /* Reprendre un profil livré recopie ses droits et son rang. On ne le fait
     qu'à la création : écraser la matrice d'un profil déjà réglé et déjà
     porté effacerait sans prévenir le travail de quelqu'un. */
  const reprendre = (code: string) => {
    setBase(code);
    if (!creation || code === VIERGE) return;
    const source = PROFILS.find((p) => p.code === code);
    if (!source) return;
    setDroits({ ...source.droits });
    setRang(String(source.rang));
    if (!libelle.trim()) setLibelle(`${source.libelle} — variante`);
  };

  /* Le socle d'agent, que ce profil ne peut pas retrancher — sauf s'il **est**
     le socle : l'administrateur doit pouvoir le corriger quelque part. */
  const estLeSocle = profil?.code === CODE_PROFIL_BASE;
  const socle = estLeSocle || technique
    ? {}
    : (PROFILS.find((p) => p.code === CODE_PROFIL_BASE)?.droits ?? {});

  const rangNum = Number(rang);
  const verdict = Number.isFinite(rangNum) ? verdictRang(auteur, rangNum) : { ok: false };
  /* La garde d'auto-verrouillage se vérifie pendant la saisie, pas seulement
     à l'enregistrement : voir le motif en décochant vaut mieux que de le
     découvrir après avoir réglé trente-neuf modules. */
  const garde = profil
    ? verdictModification(profil, auteur, droits, profil.actif)
    : { ok: true as const };
  const codesPris = new Set(PROFILS.map((p) => p.code));
  const valide = libelle.trim().length >= 3
    && Number.isFinite(rangNum) && rangNum >= 0 && rangNum <= 100
    && verdict.ok && garde.ok;

  const valider = () => {
    surValidation({
      id: profil?.id ?? "",
      /* Le code est figé à la création. Une correction du libellé ne le
         touche pas : le lien avec les comptes qui le portent doit tenir. */
      code: profil?.code ?? codeDepuisLibelle(libelle, codesPris),
      libelle: libelle.trim(),
      description: description.trim(),
      rang: rangNum,
      droits,
      /* La provenance ne se réécrit pas : un profil livré à l'installation
         reste marqué comme tel même après réglage. C'est une information
         d'origine, pas une permission. */
      origine: profil?.origine ?? "MAISON",
      deriveDe: base === VIERGE ? null : base,
      reserveAdmin: reserve,
      technique,
      portee,
      administre,
      actif: profil?.actif ?? true,
      creePar: profil?.creePar,
      dateCreation: profil?.dateCreation,
    }, creation);
  };

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre={creation ? "Créer un profil d'accès" : `Régler « ${profil?.libelle} »`}
      description={
        creation
          ? "Les droits d'un profil valent pour tout le ministère : deux secrétaires de deux directions font le même métier."
          : `Code ${profil?.code} — il ne change pas, les comptes le portent.`
      }
      surValidation={valider}
      libelleValidation={creation ? "Créer le profil" : "Enregistrer"}
      validationPossible={valide}
      large
    >
      {creation && (
        <ChampSelect
          label="Reprendre un profil existant" valeur={base} surChangement={reprendre}
          options={[
            { valeur: VIERGE, libelle: "Partir d'une feuille blanche" },
            ...PROFILS.map((p) => ({ valeur: p.code, libelle: `${p.libelle} · rang ${p.rang}` })),
          ]}
          aide="La reprise copie les droits et le rang du profil choisi ; l'original reste intact."
        />
      )}

      <ChampTexte
        label="Nom du profil" valeur={libelle} surChangement={setLibelle} obligatoire
        placeholder="Secrétaire de direction, chargé du courrier…"
        aide={creation ? "Le code technique en sera dérivé, une fois pour toutes." : undefined}
      />
      <ChampZone
        label="À quoi il sert" valeur={description} surChangement={setDescription} lignes={2}
        aide="Cette phrase s'affiche au chef au moment où il attribue le profil. Elle lui évite de choisir au jugé."
      />
      <ChampTexte
        label="Rang hiérarchique" valeur={rang} surChangement={setRang} type="number" obligatoire
        aide={
          auteur.role === "ADMIN_SYSTEME"
            ? "Le rang décide qui peut attribuer ce profil : on n'accorde qu'un rang strictement inférieur au sien. 0 = n'administre personne. Administrateur système, vous n'êtes pas borné."
            : `Le rang décide qui peut attribuer ce profil : on n'accorde qu'un rang strictement inférieur au sien. 0 = n'administre personne. Le vôtre est ${RANG_HIERARCHIQUE[auteur.role] ?? 0}.`
        }
      />
      {!verdict.ok && verdict.motif && (
        <p className="text-[11px] text-destructive">{verdict.motif}</p>
      )}

      <ChampSelect
        label="Jusqu'où il voit"
        valeur={portee}
        surChangement={(v) => setPortee(v as "PERIMETRE" | "MINISTERE")}
        options={[
          { valeur: "PERIMETRE", libelle: "Son entité et ce qu'elle contient" },
          { valeur: "MINISTERE", libelle: "Le ministère entier" },
        ]}
        aide="Les droits disent ce qu'on peut lire ; ceci dit de qui. Un chef de service n'a pas à ouvrir le dossier d'un agent dont il ne répond pas. Réservez la vue ministérielle à ceux qui décident ou contrôlent à cette échelle."
      />

      <ChampSelect
        label="Jusqu'où il administre"
        valeur={administre}
        surChangement={(v) => setAdministre(v as "PERIMETRE" | "MINISTERE")}
        options={[
          { valeur: "PERIMETRE", libelle: "Son entité et ce qu'elle contient" },
          { valeur: "MINISTERE", libelle: "Le ministère entier" },
        ]}
        aide="Lire et administrer ne vont pas ensemble. Le ministre voit tout et ne crée rien ; l'inspecteur voit tout et ne commande rien. La DGARH, elle, administre le personnel de toutes les structures — cabinet compris — depuis une seule direction : c'est le cas que cette portée décrit, et il devrait rester rare."
      />

      <ChampSelect
        label="Qui le porte"
        valeur={technique ? "technique" : "agent"}
        surChangement={(v) => setTechnique(v === "technique")}
        options={[
          { valeur: "agent", libelle: "Un agent du ministère — il hérite du socle" },
          { valeur: "technique", libelle: "Un profil technique — aucun socle, que ce qui est coché" },
        ]}
        aide="Un profil technique est porté par quelqu'un qui n'est pas agent : il n'a ni dossier, ni carrière, ni congés. C'est le cas de l'administrateur système, et ce devrait rester l'exception."
      />

      <ChampSelect
        label="Qui peut attribuer ce profil" valeur={reserve ? "admin" : "chefs"}
        surChangement={(v) => setReserve(v === "admin")}
        options={[
          { valeur: "chefs", libelle: "Tout chef d'un rang supérieur, dans son périmètre" },
          { valeur: "admin", libelle: "L'administrateur système seul" },
        ]}
        aide="Réservez à l'administrateur les fonctions qui procèdent d'un acte de nomination — ministre, secrétaire général, directeur général : leur titulaire est désigné hors de la plateforme."
      />

      {!garde.ok && garde.motif && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive">
          {garde.motif}
        </p>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Les droits, module par module. L'écriture emporte la lecture ; « aucun » retire le
          module de la barre latérale et refuse l'adresse tapée à la main.
          {!estLeSocle && !technique && " Les modules marqués « socle agent » sont ceux que toute personne du ministère possède déjà : ce profil s'y ajoute, il ne les retire pas."}
          {technique && " Ce profil est technique : il n'hérite de rien. Ce qui n'est pas coché ici n'est pas ouvert."}
        </p>
        {estLeSocle && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
            Ce profil est le socle : chacun le porte, et tous les autres profils s'y ajoutent.
            Ce que vous retirez ici, vous le retirez à tout le ministère — y compris aux
            directeurs. Ce que vous y ajoutez, vous l'ajoutez à tous.
          </p>
        )}
        <MatriceProfil
          droits={droits}
          socle={socle}
          surChangement={(m: ModuleKey, n: Niveau) => setDroits((d) => appliquer(d, m, n, socle))}
        />
      </div>
    </DialogueFormulaire>
  );
}

/** La fermeture ou la réouverture d'un profil — motif obligatoire. */
export function DialogueBascule({
  ouvert, profil, porteurs, surFermeture, surValidation,
}: {
  ouvert: boolean;
  profil: ProfilAcces | null;
  porteurs: number;
  surFermeture: () => void;
  surValidation: (motif: string) => void;
}) {
  const [motif, setMotif] = useState("");
  useEffect(() => { if (ouvert) setMotif(""); }, [ouvert]);

  if (!profil) return null;
  const fermeture = profil.actif;

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre={fermeture ? "Fermer ce profil" : "Rouvrir ce profil"}
      description={`${profil.libelle} — ${porteurs} compte(s) le portent aujourd'hui.`}
      surValidation={() => surValidation(motif.trim())}
      libelleValidation={fermeture ? "Fermer le profil" : "Rouvrir le profil"}
      validationPossible={motif.trim().length >= 10}
    >
      <ChampZone
        label="Motif" valeur={motif} surChangement={setMotif} lignes={3} obligatoire
        placeholder="Profil remplacé par…, réorganisation de la direction…"
      />
      {fermeture && porteurs > 0 && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
          {porteurs} compte(s) perdront leurs droits dès la fermeture. Ils ne seront ni
          supprimés ni désactivés : ils garderont le nom du profil et n'ouvriront plus rien,
          jusqu'à ce qu'un autre profil leur soit attribué.
        </p>
      )}
    </DialogueFormulaire>
  );
}
