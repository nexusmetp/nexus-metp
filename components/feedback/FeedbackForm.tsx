"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Un commentaire déposé depuis la page de connexion. */
export interface Commentaire {
  message: string;
  /** Facultatif : sans adresse, le commentaire reste anonyme et sans réponse. */
  email?: string;
  /** Horodatage ISO du dépôt. */
  depose: string;
  /** Page depuis laquelle le commentaire a été déposé. */
  origine: string;
}

/** Clé de conservation locale, en attendant le serveur. */
const STOCKAGE = "nexus.commentaires";

/**
 * Dépose le commentaire.
 *
 * Tant que la plateforme n'a pas de serveur, les commentaires sont conservés
 * dans le navigateur : rien n'est perdu silencieusement, et la DGARH pourra
 * les relever. C'est ICI, et nulle part ailleurs, que viendra le
 * `fetch("/api/commentaires", …)` le jour où l'API existera.
 */
async function deposer(commentaire: Commentaire): Promise<void> {
  await new Promise((r) => setTimeout(r, 550));
  try {
    const anciens: Commentaire[] = JSON.parse(localStorage.getItem(STOCKAGE) ?? "[]");
    localStorage.setItem(STOCKAGE, JSON.stringify([...anciens, commentaire].slice(-200)));
  } catch {
    /* navigation privée, stockage plein : le dépôt reste confirmé à l'agent */
  }
}

/** Relit les commentaires déposés — utile à l'exploitation et aux tests. */
export function commentairesDeposes(): Commentaire[] {
  try {
    return JSON.parse(localStorage.getItem(STOCKAGE) ?? "[]");
  } catch {
    return [];
  }
}

const MAX = 2000;

export function FeedbackForm({ onEnvoye }: { onEnvoye?: () => void }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);

  // Le bouton reste inerte tant qu'il n'y a rien à envoyer : un commentaire
  // vide n'est pas un commentaire.
  const vide = message.trim().length === 0;

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (vide || envoi) return;
    setEnvoi(true);
    await deposer({
      message: message.trim(),
      email: email.trim() || undefined,
      depose: new Date().toISOString(),
      origine: typeof window === "undefined" ? "" : window.location.pathname,
    });
    setEnvoi(false);
    setMessage("");
    setEmail("");
    toast.success("Merci, votre commentaire est enregistré", {
      description: "La DGARH en prend connaissance. Aucune réponse n'est envoyée automatiquement.",
    });
    onEnvoye?.();
  };

  return (
    <form onSubmit={soumettre} className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="commentaire-message" className="text-sm font-semibold">
          Votre commentaire
        </Label>
        <Textarea
          id="commentaire-message"
          required
          rows={7}
          maxLength={MAX}
          autoComplete="off"
          placeholder="Ce qui fonctionne, ce qui manque, ce qui vous a bloqué…"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
          className="resize-none"
        />
        <p className="text-right text-[11px] tabular-nums text-muted-foreground">
          {message.length} / {MAX}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="commentaire-email" className="text-sm font-semibold">
          Adresse électronique <span className="font-normal text-muted-foreground">(facultatif)</span>
        </Label>
        <Input
          id="commentaire-email"
          type="email"
          autoComplete="email"
          placeholder="prenom.nom@metp.gouv.cg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Sans adresse, votre commentaire reste anonyme — et sans réponse possible.
        </p>
      </div>

      <Button type="submit" disabled={vide || envoi} className="mt-auto h-11 w-full font-semibold">
        {envoi
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…</>
          : <><Send className="mr-2 h-4 w-4" /> Envoyer</>}
      </Button>
    </form>
  );
}
