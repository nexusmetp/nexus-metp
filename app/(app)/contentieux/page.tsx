"use client";

import { ListeActes } from "@/components/nexus/liste-actes";

export default function Page() {
  return (
    <ListeActes
      titre="Contentieux et discipline"
      description="Sanctions et dossiers contentieux, instruits par le bureau du contentieux (§04)."
      types={["SANCTION", "CONTENTIEUX"]}
    />
  );
}
