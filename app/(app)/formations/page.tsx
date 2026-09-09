"use client";

import { ListeActes } from "@/components/nexus/liste-actes";

export default function Page() {
  return (
    <ListeActes
      titre="Formation continue"
      description="Stages, formations diplômantes et autorisations, instruits par le service de la formation (§04)."
      types={["FORMATION"]}
    />
  );
}
