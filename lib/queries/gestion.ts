"use client";

import { journaliser } from "./audit";
import { save } from "@/lib/db";
import type { Acte, BesoinPersonnel, CampagneRecrutement, CarteProfessionnelle, Conge, Delegation, DocumentEmis, InscriptionFormation, OffreFormation, Poste, TexteReglementaire, Utilisateur } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/* Délégations — ce qui débloque le circuit quand le signataire manque */
/* ------------------------------------------------------------------ */

export function useEnregistrerDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ delegation, utilisateur, creation }: {
      delegation: Delegation; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Delegation>("delegations", delegation);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Delegation", delegation.id, {
        nouvelleValeur: `${delegation.delegantNom} → ${delegation.delegataireNom}`,
        justification: delegation.motif,
      });
      return delegation;
    },
    onSuccess: () => {
      ["delegations", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Fonds documentaire, recrutement, formation                          */
/* ------------------------------------------------------------------ */

export function useEnregistrerTexte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ texte, utilisateur, creation }: {
      texte: TexteReglementaire; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<TexteReglementaire>("textes", texte);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Texte", texte.id, {
        nouvelleValeur: texte.reference, justification: texte.titre,
      });
      return texte;
    },
    onSuccess: () => {
      ["textes", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useEnregistrerCampagne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campagne, utilisateur, creation }: {
      campagne: CampagneRecrutement; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<CampagneRecrutement>("campagnes", campagne);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Campagne", campagne.id, {
        nouvelleValeur: campagne.statut, justification: campagne.intitule,
      });
      return campagne;
    },
    onSuccess: () => {
      ["campagnes", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useEnregistrerOffre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ offre, utilisateur, creation }: {
      offre: OffreFormation; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<OffreFormation>("offresFormation", offre);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Formation", offre.id, {
        nouvelleValeur: offre.statut, justification: offre.intitule,
      });
      return offre;
    },
    onSuccess: () => {
      ["offresFormation", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useInscrireFormation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inscription }: { inscription: InscriptionFormation }) => {
      await save<InscriptionFormation>("inscriptions", inscription);
      return inscription;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inscriptions"] }),
  });
}


/* ------------------------------------------------------------------ */
/* Cartes professionnelles                                             */
/* ------------------------------------------------------------------ */

export function useEnregistrerCarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ carte, utilisateur, creation }: {
      carte: CarteProfessionnelle; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<CarteProfessionnelle>("cartes", carte);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Carte", carte.id, {
        nouvelleValeur: carte.statut,
        justification: `Carte n° ${carte.numero}`,
      });
      return carte;
    },
    onSuccess: () => {
      ["cartes", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}


/* ------------------------------------------------------------------ */
/* Registre des documents établis                                       */
/* ------------------------------------------------------------------ */

/**
 * Consigne un document sorti de l'écran.
 *
 * Le geste est enregistré, pas le fichier : conserver le document reviendrait
 * à créer un second original à côté de l'acte, alors que c'est l'acte qui fait
 * foi. Le registre dit qui a édité quoi, quand, et sur quel dossier (§12).
 */
export function useEnregistrerDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ document: doc, utilisateur }: {
      document: DocumentEmis; utilisateur: Utilisateur;
    }) => {
      await save<DocumentEmis>("documents", doc);
      await journaliser(utilisateur, "CONSULTATION", "Document", doc.id, {
        nouvelleValeur: doc.canal,
        justification: `${doc.intitule} n° ${doc.reference} — ${doc.objet}`,
      });
      return doc;
    },
    onSuccess: () => {
      ["documents", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}


/* ------------------------------------------------------------------ */
/* Emplois, besoins et congés — les écritures des écrans de gestion     */
/* ------------------------------------------------------------------ */

export function useEnregistrerPoste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ poste, utilisateur, creation }: {
      poste: Poste; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Poste>("postes", poste);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Poste", poste.id, {
        champ: creation ? undefined : "statut",
        nouvelleValeur: poste.statut,
        justification: `${poste.code} — ${poste.intitule}`,
      });
      return poste;
    },
    onSuccess: () => {
      ["postes", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useEnregistrerBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ besoin, utilisateur, creation }: {
      besoin: BesoinPersonnel; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<BesoinPersonnel>("besoins", besoin);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Besoin", besoin.id, {
        champ: creation ? undefined : "statut",
        nouvelleValeur: besoin.statut,
        justification: `${besoin.reference} — ${besoin.discipline}`,
      });
      return besoin;
    },
    onSuccess: () => {
      ["besoins", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useEnregistrerConge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conge, utilisateur, creation }: {
      conge: Conge; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Conge>("conges", conge);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Conge", conge.id, {
        champ: creation ? undefined : "statut",
        nouvelleValeur: conge.statut,
        acteId: conge.acteId ?? undefined,
        justification: `${conge.jours} jours — ${conge.nature}`,
      });
      return conge;
    },
    onSuccess: () => {
      ["conges", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/**
 * Verse une pièce au dossier d'un acte. Une pièce n'existe pas seule :
 * elle est rattachée à l'acte qu'elle appuie (§14).
 */
export function useVerserPiece() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ acte, piece, utilisateur }: {
      acte: Acte; piece: Acte["pieces"][number]; utilisateur: Utilisateur;
    }) => {
      const maj: Acte = { ...acte, pieces: [...(acte.pieces ?? []), piece] };
      await save<Acte>("actes", maj);
      await journaliser(utilisateur, "MODIFICATION", "Acte", acte.id, {
        champ: "pieces", acteId: acte.id,
        nouvelleValeur: piece.nom,
        justification: `Pièce versée au dossier ${acte.reference}.`,
      });
      return maj;
    },
    onSuccess: () => {
      ["actes", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
