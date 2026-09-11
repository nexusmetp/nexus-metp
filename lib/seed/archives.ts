/**
 * Fonds d'archives de démonstration.
 *
 * Les articles sont tirés des actes déjà semés plutôt qu'inventés : un fonds
 * d'archives qui ne renverrait à aucun dossier vivant ne permettrait pas de
 * vérifier la seule chose qui compte — qu'on retrouve une pièce à partir du
 * dossier, et le dossier à partir de la pièce.
 */

import { PLAN_CLASSEMENT, echeanceDua } from "@/lib/referentiels";
import type {
  Acte, Agent, ArticleArchive, CommunicationArchive, Entite, Utilisateur, Versement,
} from "@/lib/types";
import { chance, int, pad, pick, plusJours } from "./aleatoire";

export interface FondsArchives {
  versements: Versement[];
  articles: ArticleArchive[];
  communications: CommunicationArchive[];
}

/** Magasin, travée, tablette : la cote dit ce qu'on cherche, l'emplacement où le prendre. */
const emplacement = () =>
  `Magasin ${pick(["A", "B"])} · travée ${int(1, 12)} · tablette ${int(1, 6)}`;

export function construireArchives(
  { actes, agents, utilisateurs, entites }:
  { actes: Acte[]; agents: Agent[]; utilisateurs: Utilisateur[]; entites: Entite[] }
): FondsArchives {
  const services = entites.filter((e) => e.niveau === "BUREAU" || e.niveau === "SERVICE").slice(0, 14);
  const archiviste = utilisateurs.find((u) => u.role === "CHEF_BUREAU") ?? utilisateurs[0];

  const versements: Versement[] = [];
  const articles: ArticleArchive[] = [];
  let nArticle = 0;

  services.forEach((service, i) => {
    const nb = int(1, 2);
    for (let k = 0; k < nb; k++) {
      const annee = 2018 + int(0, 6);
      const id = `VER-${pad(versements.length + 1, 4)}`;
      const statut = pick<Versement["statut"]>(["VERSE", "VERSE", "VERSE", "RECOLE", "PREPARE", "REFUSE"]);
      const dateVersement = `${annee + 2}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`;

      const lignes = int(2, 5);
      const cotes: ArticleArchive[] = [];
      for (let j = 0; j < lignes; j++) {
        nArticle++;
        const serie = PLAN_CLASSEMENT[(i + j) % PLAN_CLASSEMENT.length];
        const dateFin = `${annee}-12-31`;
        // Un article sur trois porte le dossier d'un agent : c'est ce qui permet
        // de retrouver l'archive depuis la fiche, et la fiche depuis l'archive.
        const acte = chance(0.34) ? pick(actes) : null;
        const agent = acte ? agents.find((a) => a.id === acte.agentId) : null;
        cotes.push({
          id: `ART-${pad(nArticle, 5)}`,
          cote: `METP/DGARH/${serie.code.replace(/\s/g, "")}/${annee}/${pad(j + 1, 3)}`,
          intitule: agent
            ? `${serie.intitule} — ${agent.nom} ${agent.prenom}`
            : `${serie.intitule} — exercice ${annee}`,
          versementId: id,
          serieCode: serie.code,
          dateDebut: `${annee}-01-01`,
          dateFin,
          dua: serie.dua,
          echeanceDua: echeanceDua(dateFin, serie.dua),
          sortFinal: serie.sortFinal,
          communicabilite: serie.communicabilite,
          support: pick(["PAPIER", "PAPIER", "PAPIER", "MIXTE", "NUMERIQUE"]),
          acteId: acte?.id ?? null,
          agentId: agent?.id ?? null,
          statut: statut === "PREPARE" ? "EN_RAYON" : pick(["EN_RAYON", "EN_RAYON", "EN_RAYON", "COMMUNIQUE"]),
          emplacement: statut === "PREPARE" ? undefined : emplacement(),
        });
      }
      articles.push(...cotes);

      versements.push({
        id,
        reference: `VER-${annee + 2}-${pad(versements.length + 1, 3)}`,
        intitule: `Archives ${annee} — ${service.sigle}`,
        entiteId: service.id,
        dateVersement,
        dateDebut: `${annee}-01-01`,
        dateFin: `${annee}-12-31`,
        metrage: Math.round(cotes.length * (0.6 + Math.random() * 0.5) * 10) / 10,
        statut,
        verseParId: archiviste.id,
        recuParId: statut === "PREPARE" ? null : archiviste.id,
        observations: statut === "REFUSE"
          ? "Versement refusé : bordereau incomplet, dates extrêmes non renseignées."
          : undefined,
      });
    }
  });

  /* Communications : sortir un article du rayon laisse une trace nominative. */
  const communications: CommunicationArchive[] = [];
  articles.filter((a) => a.statut === "COMMUNIQUE").forEach((a, i) => {
    const u = pick(utilisateurs);
    const dateDemande = plusJours("2026-01-01", int(0, 240));
    const rendu = chance(0.6);
    communications.push({
      id: `COM-${pad(i + 1, 4)}`,
      articleId: a.id,
      demandeurId: u.id,
      dateDemande,
      dateRetour: rendu ? plusJours(dateDemande, int(3, 40)) : null,
      motif: pick([
        "Instruction d'un recours gracieux",
        "Reconstitution de carrière",
        "Vérification d'ancienneté pour avancement",
        "Constitution d'un dossier de pension",
        "Contrôle de régularité d'un acte",
      ]),
      statut: rendu ? "RESTITUEE" : "ACCORDEE",
    });
  });

  return { versements, articles, communications };
}
