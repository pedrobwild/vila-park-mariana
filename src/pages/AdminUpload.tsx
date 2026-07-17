import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, XCircle, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { tipologias, getProjetosFolder } from "@/data/tipologias";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
}

type DestType = "plantas" | "projetos3d";

const BUCKET = "images";
const MAX_SIZE = 500 * 1024 * 1024;

// Build upload targets: each tipologia + its variants as separate targets
interface UploadTarget {
  id: string;
  label: string;
  sublabel: string;
  folder: string;
}

function buildUploadTargets() {
  const targets: UploadTarget[] = [];
  for (const t of tipologias) {
    if (t.variants && t.variants.length > 0) {
      for (const v of t.variants) {
        targets.push({
          id: v.variantId,
          label: `${t.name} — ${v.label}`,
          sublabel: t.area,
          folder: v.projetosFolder,
        });
      }
    } else {
      targets.push({
        id: t.id,
        label: t.name,
        sublabel: t.area,
        folder: getProjetosFolder(t.id),
      });
    }
  }
  return targets;
}

const uploadTargets = buildUploadTargets();

export default function AdminUpload() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [destType, setDestType] = useState<DestType>("projetos3d");
  const [selectedTarget, setSelectedTarget] = useState(uploadTargets[0].id);
  const [isDragging, setIsDragging] = useState(false);

  const currentTarget = uploadTargets.find((t) => t.id === selectedTarget) ?? uploadTargets[0];
  const folder = destType === "plantas" ? "plantas" : currentTarget.folder;

  const addFiles = useCallback((files: FileList | File[]) => {
    const items: UploadItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploads((prev) => [...prev, ...items]);
  }, []);

  const uploadFile = async (item: UploadItem) => {
    if (item.file.size > MAX_SIZE) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: "error", error: "Arquivo excede 500MB" } : u
        )
      );
      return;
    }

    setUploads((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, status: "uploading", progress: 0 } : u))
    );

    const sanitizedName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${Date.now()}_${sanitizedName}`;

    const progressInterval = setInterval(() => {
      setUploads((prev) =>
        prev.map((u) => {
          if (u.id === item.id && u.status === "uploading" && u.progress < 90) {
            return { ...u, progress: u.progress + Math.random() * 15 };
          }
          return u;
        })
      );
    }, 300);

    const { error } = await supabase.storage.from(BUCKET).upload(path, item.file, {
      cacheControl: "3600",
      upsert: false,
    });

    clearInterval(progressInterval);

    if (error) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: "error", progress: 0, error: error.message } : u
        )
      );
      toast.error(`Falha: ${sanitizedName}`);
    } else {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: "done", progress: 100, url: data.publicUrl } : u
        )
      );
      toast.success(`Enviado: ${sanitizedName}`);
    }
  };

  const uploadAll = async () => {
    const pending = uploads.filter((u) => u.status === "pending");
    for (const item of pending) {
      await uploadFile(item);
    }
  };

  const removeItem = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  const pendingCount = uploads.filter((u) => u.status === "pending").length;
  const doneCount = uploads.filter((u) => u.status === "done").length;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Upload de Imagens</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Envie imagens diretamente para o armazenamento na nuvem (máx. 500MB por arquivo).
      </p>

      {/* Destination selector */}
      <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Tipo de conteúdo</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDestType("projetos3d")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                destType === "projetos3d"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Projetos 3D (Galeria)
            </button>
            <button
              onClick={() => setDestType("plantas")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                destType === "plantas"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Plantas (Tipologia)
            </button>
          </div>
        </div>

        {destType === "projetos3d" && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Destino do projeto</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {uploadTargets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTarget(t.id)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    selectedTarget === t.id
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="font-medium block">{t.label}</span>
                  <span className="text-xs opacity-70">{t.sublabel}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              As imagens enviadas aparecerão na galeria de <strong>{currentTarget.label}</strong>.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Pasta de destino: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{folder}/</code>
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer
          ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
        `}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Arraste arquivos aqui ou <span className="text-primary font-medium">clique para selecionar</span>
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Actions */}
      {uploads.length > 0 && (
        <div className="flex items-center gap-3 mt-6 mb-4">
          <Button onClick={uploadAll} disabled={pendingCount === 0} size="sm">
            Enviar {pendingCount > 0 ? `(${pendingCount})` : "tudo"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {doneCount}/{uploads.length} concluídos
          </span>
        </div>
      )}

      {/* File list */}
      <div className="space-y-3 mt-4">
        {uploads.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="h-12 w-12 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {item.file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(item.file)}
                  alt={item.file.name}
                  className="h-full w-full object-cover"
                  onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(item.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
              {item.status === "uploading" && (
                <Progress value={Math.min(item.progress, 100)} className="mt-1 h-1.5" />
              )}
              {item.status === "error" && (
                <p className="text-xs text-destructive mt-0.5">{item.error}</p>
              )}
              {item.status === "done" && item.url && (
                <button
                  onClick={() => copyUrl(item.url!)}
                  className="text-xs text-primary hover:underline mt-0.5 text-left truncate block max-w-full"
                >
                  {item.url}
                </button>
              )}
            </div>

            <div className="shrink-0">
              {item.status === "done" && <CheckCircle className="h-5 w-5 text-primary" />}
              {item.status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
            </div>

            <button
              onClick={() => removeItem(item.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

