"use client";

import { ListeActes } from "@/components/nexus/liste-actes";

export default function Page() {
  return (
    <ListeActes
      titre="Carrières et actes"
      description="Recrutements, titularisations, affectations, mutations, avancements et promotions — la ligne de vie administrative des agents (§07)."
      types={["RECRUTEMENT", "PRISE_DE_SERVICE", "TITULARISATION", "AFFECTATION", "MUTATION", "AVANCEMENT", "PROMOTION", "FIN_CARRIERE"]}
    />
  );
}
