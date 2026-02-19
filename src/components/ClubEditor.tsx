"use client";

import { useState } from "react";
import type { Club, Id } from "@/lib/db";
import { db, newId } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image } from "lucide-react";

interface ClubEditorProps {
  clubs: Club[];
  seasonCompetitionId?: Id;
  competitionSlug?: string;
  onRefresh: () => void;
}

interface ClubFormData {
  name: string;
  shortName: string;
  slug: string;
  logoUrl: string;
  clubUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

const emptyForm: ClubFormData = {
  name: "",
  shortName: "",
  slug: "",
  logoUrl: "",
  clubUrl: "",
  primaryColor: "#E30613",
  secondaryColor: "#FFFFFF",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ClubEditor({ clubs, seasonCompetitionId, competitionSlug, onRefresh }: ClubEditorProps) {
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<ClubFormData>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState(false);

  const openNew = () => {
    setForm(emptyForm);
    setEditingClub(null);
    setIsNew(true);
    setDialogOpen(true);
  };

  const openEdit = (club: Club) => {
    setForm({
      name: club.name,
      shortName: club.shortName,
      slug: club.slug,
      logoUrl: club.logoUrl ?? "",
      clubUrl: club.clubUrl ?? "",
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
    });
    setEditingClub(club);
    setIsNew(false);
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: isNew ? slugify(name) : f.slug,
      shortName: isNew && !f.shortName ? name.slice(0, 3).toUpperCase() : f.shortName,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.shortName.trim()) return;

    if (isNew) {
      const id = newId("club");
      const club: Club = {
        id,
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        slug: form.slug || slugify(form.name),
        logoUrl: form.logoUrl.trim() || undefined,
        clubUrl: form.clubUrl.trim() || undefined,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      };
      await db.clubs.add(club);

      // Add to season-competition if provided
      if (seasonCompetitionId) {
        const sc = await db.seasonCompetitions.get(seasonCompetitionId);
        if (sc) {
          await db.seasonCompetitions.update(seasonCompetitionId, {
            clubIds: [...sc.clubIds, id],
          });
        }
      }
    } else if (editingClub) {
      await db.clubs.update(editingClub.id, {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        slug: form.slug || slugify(form.name),
        logoUrl: form.logoUrl.trim() || undefined,
        clubUrl: form.clubUrl.trim() || undefined,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      });
    }

    setDialogOpen(false);
    onRefresh();
  };

  const handleDelete = async (club: Club) => {
    if (!confirm(`"${club.name}" wirklich entfernen?`)) return;

    // Remove from season-competition
    if (seasonCompetitionId) {
      const sc = await db.seasonCompetitions.get(seasonCompetitionId);
      if (sc) {
        await db.seasonCompetitions.update(seasonCompetitionId, {
          clubIds: sc.clubIds.filter((id) => id !== club.id),
        });
      }
    }
    onRefresh();
  };

  return (
    <>
      <Card className="border-border bg-card mt-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Club-Editor</CardTitle>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Neuer Club
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center gap-3 rounded-md bg-secondary/30 px-3 py-2 group"
              >
                <ClubLogo
                  logoUrl={club.logoUrl}
                  name={club.name}
                  shortName={club.shortName}
                  primaryColor={club.primaryColor}
                  size="sm"
                />
                <span className="flex-1 text-sm truncate">{club.name}</span>
                <span className="text-xs text-muted-foreground">{club.shortName}</span>
                {club.logoUrl ? (
                  <Image className="h-3 w-3 text-green-400" />
                ) : (
                  <Image className="h-3 w-3 text-muted-foreground/30" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => openEdit(club)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => handleDelete(club)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Neuer Club" : `${editingClub?.name} bearbeiten`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="club-name">Vereinsname</Label>
              <Input
                id="club-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="z.B. 1. FC Köln"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="club-short">Kurzname</Label>
                <Input
                  id="club-short"
                  value={form.shortName}
                  onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
                  placeholder="z.B. KOE"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-slug">Slug (URL)</Label>
                <Input
                  id="club-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="z.B. fc-koeln"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="club-logo">Logo-URL (SVG/PNG)</Label>
              <div className="flex gap-2">
                <Input
                  id="club-logo"
                  value={form.logoUrl}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, logoUrl: e.target.value }));
                    setLogoPreview(false);
                  }}
                  placeholder="https://upload.wikimedia.org/..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogoPreview(true)}
                  disabled={!form.logoUrl}
                >
                  Test
                </Button>
              </div>
              {logoPreview && form.logoUrl && (
                <div className="flex items-center gap-3 rounded-md bg-secondary/30 p-3">
                  <ClubLogo
                    logoUrl={form.logoUrl}
                    name={form.name || "Test"}
                    shortName={form.shortName || "TST"}
                    primaryColor={form.primaryColor}
                    size="lg"
                  />
                  <span className="text-xs text-muted-foreground">Logo-Vorschau</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Tipp: Auf Wikipedia Vereinsseite -&gt; Wappen anklicken -&gt; &quot;Originaldatei&quot; -&gt; URL kopieren
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="club-url">Club-Link (optional)</Label>
              <Input
                id="club-url"
                value={form.clubUrl}
                onChange={(e) => setForm((f) => ({ ...f, clubUrl: e.target.value }))}
                placeholder="https://www.bundesliga.com/de/bundesliga/clubs/..."
              />
              <p className="text-[10px] text-muted-foreground">
                Eigener Link zur Club-Seite. Ueberschreibt den automatisch generierten bundesliga.com Link.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="club-primary">Primaerfarbe</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="club-primary"
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    className="h-9 w-12 rounded border border-border bg-background cursor-pointer"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="club-secondary">Sekundaerfarbe</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="club-secondary"
                    value={form.secondaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    className="h-9 w-12 rounded border border-border bg-background cursor-pointer"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-md bg-secondary/30 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Vorschau:</p>
              <div className="flex items-center gap-3">
                <ClubLogo
                  logoUrl={form.logoUrl || undefined}
                  name={form.name || "Neuer Club"}
                  shortName={form.shortName || "NEW"}
                  primaryColor={form.primaryColor}
                  size="lg"
                />
                <div>
                  <p className="font-semibold">{form.name || "Neuer Club"}</p>
                  <p className="text-xs text-muted-foreground">{form.shortName || "NEW"}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.shortName.trim()}>
              {isNew ? "Hinzufuegen" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
