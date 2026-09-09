"use client";

import { ListeActes } from "@/components/nexus/liste-actes";

export default function Page() {
  return (
    <ListeActes
      titre="Congés et positions"
      description="Congés et changements de position administrative — disponibilité, détachement, mise à disposition, suspension (§06)."
      types={["CONGE", "POSITION"]}
    />
  );
}
