/**
 * Le gabarit d'un module, réexporté d'un seul point.
 *
 * Les pièces vivent chacune dans son fichier ; les écrans continuent
 * d'écrire `@/components/nexus/module`, comme avant le découpage.
 */

export { Fragment } from "react";
export { Badge } from "@/components/ui/badge";
export { RangeeKpi, type Tuile } from "./kpi";
export { TableauModule, type Colonne, type Filtre } from "./tableau";
export { PanneauDetail, Section, LigneInfo } from "./panneau";
export {
  DialogueFormulaire, Champ, ChampTexte, ChampZone, ChampSelect, ChampPhoto,
} from "./formulaire";
export { Jauge } from "./jauge";
