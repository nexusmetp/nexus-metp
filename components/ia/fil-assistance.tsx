"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { messageErreur, useIA, type MessageIA } from "@/lib/ia";
import { useConsignerEchange, useEchangesIA, useEffacerConversationIA } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { MODULE_LABELS, moduleDeRoute } from "@/lib/referentiels";
import { fmtDateHeure } from "@/lib/format";
import type { ConversationIA, EchangeIA } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Ce que l'assistant reçoit du dialogue : les derniers tours, pas tout le fil. */
const MEMOIRE = 12;

/**
 * Le fil d'assistance, ouvert depuis la barre du haut.
 *
 * Il ne lit pas la base : il sait sur quel écran se tient l'agent, rien de
 * plus. Un assistant qui prétendrait donner le chiffre d'un dossier sans
 * l'avoir lu ferait exactement ce qu'un système de gestion du personnel ne
 * doit jamais faire — avancer une valeur sans provenance.
 */
export function FilAssistance() {
  const user = useAuth((s) => s.user);
  const chemin = usePathname();
  const { prete, occupe, reglages, dialoguer } = useIA();
  const { data: tous = [] } = useEchangesIA();
  const consigner = useConsignerEchange();
  const effacer = useEffacerConversationIA();

  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [fil, setFil] = useState<string | null>(null);
  const bas = useRef<HTMLDivElement | null>(null);

  const ecran = useMemo(() => {
    const mod = moduleDeRoute(chemin ?? "");
    return mod ? MODULE_LABELS[mod] : undefined;
  }, [chemin]);

  const conversation = useMemo<ConversationIA | null>(() => (user && fil ? {
    id: fil,
    titre: `Fil du ${fmtDateHeure(new Date().toISOString())}`,
    utilisateurId: user.id,
    dateCreation: new Date().toISOString(),
    dateMaj: new Date().toISOString(),
  } : null), [fil, user]);

  const echanges = useMemo(
    () => tous.filter((e) => e.conversationId === fil),
    [tous, fil]
  );

  useEffect(() => {
    if (ouvert) bas.current?.scrollIntoView({ behavior: "smooth" });
  }, [echanges.length, ouvert, occupe]);

  if (!prete || !user) return null;

  const envoyer = async () => {
    const texte = saisie.trim();
    if (!texte || occupe) return;
    const id = fil ?? `FIL-${Date.now().toString(36).toUpperCase()}`;
    if (!fil) setFil(id);
    setSaisie("");

    const base: ConversationIA = conversation ?? {
      id, titre: texte.slice(0, 60), utilisateurId: user.id,
      dateCreation: new Date().toISOString(), dateMaj: new Date().toISOString(),
    };
    const question: EchangeIA = {
      id: `ECH-${Date.now().toString(36).toUpperCase()}-q`,
      conversationId: id, role: "utilisateur", contenu: texte,
      horodatage: new Date().toISOString(),
      contexte: reglages?.contexteAutorise ? ecran : undefined,
    };
    await consigner.mutateAsync({ echange: question, conversation: { ...base, id } });

    const memoire: MessageIA[] = [...echanges, question].slice(-MEMOIRE).map((e) => ({
      role: e.role === "utilisateur" ? "user" : "assistant",
      contenu: e.contenu,
    }));

    try {
      const reponse = await dialoguer(memoire, reglages?.contexteAutorise ? ecran : undefined);
      await consigner.mutateAsync({
        echange: {
          id: `ECH-${Date.now().toString(36).toUpperCase()}-r`,
          conversationId: id, role: "assistant", contenu: reponse,
          horodatage: new Date().toISOString(),
        },
        conversation: { ...base, id },
      });
    } catch (e) {
      await consigner.mutateAsync({
        echange: {
          id: `ECH-${Date.now().toString(36).toUpperCase()}-e`,
          conversationId: id, role: "assistant",
          contenu: messageErreur(e), echec: "1",
          horodatage: new Date().toISOString(),
        },
        conversation: { ...base, id },
      });
    }
  };

  const vider = async () => {
    if (fil) await effacer.mutateAsync(fil);
    setFil(null);
  };

  return (
    <Sheet open={ouvert} onOpenChange={setOuvert}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title="Assistant" aria-label="Ouvrir l'assistant">
          <Sparkles className="h-4 w-4 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(26rem,94vw)] flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> Assistant
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            Il aide à rédiger et à s'orienter. Il ne lit pas les dossiers et n'avance aucun
            chiffre : pour une donnée, il indique où la lire.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {!echanges.length && (
            <div className="rounded-lg border border-dashed p-4 text-[11px] leading-relaxed text-muted-foreground">
              Posez une question sur la gestion du personnel de l'État ou sur l'usage de la
              plateforme. {ecran && <>Vous êtes sur <strong>{ecran}</strong>.</>}
            </div>
          )}

          {echanges.map((e) => (
            <div
              key={e.id}
              className={cn(
                "max-w-[92%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                e.role === "utilisateur"
                  ? "ml-auto bg-primary/10 text-foreground"
                  : e.echec
                    ? "border border-destructive/40 bg-destructive/5"
                    : "bg-muted"
              )}
            >
              <div className="whitespace-pre-wrap">{e.contenu}</div>
            </div>
          ))}

          {occupe && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> l'assistant rédige…
            </div>
          )}
          <div ref={bas} />
        </div>

        <div className="space-y-2 border-t p-3">
          <Textarea
            value={saisie}
            onChange={(ev) => setSaisie(ev.target.value)}
            onKeyDown={(ev) => {
              // Entrée envoie, Maj+Entrée passe à la ligne : le geste attendu
              // dans un fil de discussion.
              if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); void envoyer(); }
            }}
            rows={2}
            placeholder="Votre question…"
            className="resize-none text-xs"
          />
          <div className="flex items-center gap-2">
            {!!echanges.length && (
              <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground" onClick={vider}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Effacer le fil
              </Button>
            )}
            <Button size="sm" className="ml-auto" disabled={!saisie.trim() || occupe} onClick={envoyer}>
              {occupe ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
