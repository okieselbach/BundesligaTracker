"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { Season } from "@/lib/db";
import { createSeason, deleteSeason } from "@/lib/seed";

interface SeasonManagerProps {
  seasons: Season[];
  currentSeason: Season | null;
  onRefresh: () => void;
}

export function SeasonManager({ seasons, currentSeason, onRefresh }: SeasonManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<"default" | "copy">("copy");
  const [copyFromId, setCopyFromId] = useState<string>("");
  const [scheduleMode, setScheduleMode] = useState<"random" | "manual">("random");
  const [creating, setCreating] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Suggest next season name based on current
      if (currentSeason) {
        const match = currentSeason.name.match(/^(\d{4})\/(\d{2})$/);
        if (match) {
          const startYear = parseInt(match[1]) + 1;
          const endYear = parseInt(match[2]) + 1;
          setName(`${startYear}/${endYear.toString().padStart(2, "0")}`);
        } else {
          setName("");
        }
        setCopyFromId(currentSeason.id);
      } else {
        setName("2025/26");
      }
      setSource(currentSeason ? "copy" : "default");
    }
    setOpen(isOpen);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createSeason({
        name: name.trim(),
        makeCurrent: true,
        copyFromSeasonId: source === "copy" ? copyFromId : undefined,
        manual: scheduleMode === "manual",
      });
      setOpen(false);
      onRefresh();
    } catch (err) {
      alert("Fehler beim Erstellen der Saison: " + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (season: Season) => {
    if (season.isCurrent) {
      alert("Die aktuelle Saison kann nicht geloescht werden. Wechsle zuerst zu einer anderen Saison.");
      return;
    }
    if (!confirm(`Saison "${season.name}" und alle zugehoerigen Daten (Spielplaene, Ergebnisse) unwiderruflich loeschen?`)) return;
    await deleteSeason(season.id);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Saisons
        </h3>
        <Dialog open={open} onOpenChange={handleOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Neue Saison
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Saison erstellen</DialogTitle>
              <DialogDescription>
                Erstellt eine neue Saison mit Spielplaenen fuer alle Ligen.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="season-name">Saison-Name</Label>
                <Input
                  id="season-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. 2026/27"
                />
              </div>

              <div className="space-y-2">
                <Label>Club-Zusammensetzung</Label>
                <Select value={source} onValueChange={(v) => setSource(v as "default" | "copy")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copy">Von bestehender Saison uebernehmen</SelectItem>
                    <SelectItem value="default">Standard-Clubs (Seed 2025/26)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {source === "copy" && seasons.length > 0 && (
                <div className="space-y-2">
                  <Label>Clubs uebernehmen von</Label>
                  <Select value={copyFromId} onValueChange={setCopyFromId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.isCurrent ? " (aktuell)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Spielplan-Modus</Label>
                <Select value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "random" | "manual")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Zufall (automatisch generiert)</SelectItem>
                    <SelectItem value="manual">Manuell (Begegnungen selbst eintragen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                Die neue Saison wird als aktuelle Saison gesetzt. {scheduleMode === "manual" ? "Leere Spieltage werden erstellt - Begegnungen muessen manuell eingetragen werden." : "Spielplaene werden automatisch generiert."} DFB-Pokal muss separat ausgelost werden.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                {creating ? "Erstelle..." : "Saison erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Season list */}
      <div className="space-y-1.5">
        {seasons.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2 text-sm"
          >
            <span className={s.isCurrent ? "font-bold" : ""}>
              {s.name}
              {s.isCurrent && (
                <span className="ml-2 text-xs text-primary">(aktuell)</span>
              )}
            </span>
            {!s.isCurrent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={() => handleDelete(s)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
