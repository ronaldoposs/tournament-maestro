import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  position: number;
  points: number;
  wins: number;
  losses: number;
  tournamentName?: string;
  avatarUrl?: string | null;
}

type Theme = {
  bg: [string, string, string];
  accent: string;
  ring: string;
  textShadow: string;
  label: string;
  emoji: string;
};

function themeFor(pos: number): Theme {
  if (pos === 1)
    return {
      bg: ["#7a5b00", "#b8860b", "#fff2a8"],
      accent: "#fff7c2",
      ring: "#ffd700",
      textShadow: "rgba(120,80,0,0.6)",
      label: "CAMPEÃO",
      emoji: "🥇",
    };
  if (pos === 2)
    return {
      bg: ["#4a4a4a", "#9a9a9a", "#e8e8e8"],
      accent: "#f5f5f5",
      ring: "#d6d6d6",
      textShadow: "rgba(60,60,60,0.6)",
      label: "VICE-CAMPEÃO",
      emoji: "🥈",
    };
  if (pos === 3)
    return {
      bg: ["#5a2e0a", "#a0522d", "#e8a87c"],
      accent: "#ffd9b3",
      ring: "#cd7f32",
      textShadow: "rgba(80,40,15,0.6)",
      label: "TERCEIRO LUGAR",
      emoji: "🥉",
    };
  return {
    bg: ["#0f1729", "#1f3a8a", "#10b981"],
    accent: "#a7f3d0",
    ring: "#10b981",
    textShadow: "rgba(0,0,0,0.55)",
    label: `${pos}º LUGAR`,
    emoji: "🏆",
  };
}

const W = 1080;
const H = 1920;

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function ShareCard({ open, onOpenChange, name, position, points, wins, losses, tournamentName, avatarUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const theme = themeFor(position);

  useEffect(() => {
    if (!open) return;
    setDataUrl(null);
    setRendering(true);
    // Wait for portal/dialog to mount canvas before drawing
    let cancelled = false;
    const tryRender = (attempt = 0) => {
      if (cancelled) return;
      if (canvasRef.current) {
        render().catch((e) => {
          console.error("ShareCard render error", e);
          setRendering(false);
        });
      } else if (attempt < 20) {
        requestAnimationFrame(() => tryRender(attempt + 1));
      } else {
        console.error("ShareCard: canvas ref never attached");
        setRendering(false);
      }
    };
    requestAnimationFrame(() => tryRender());
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name, position]);

  async function render() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.bg[0]);
    grad.addColorStop(0.55, theme.bg[1]);
    grad.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative diagonal sheen
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#ffffff";
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillRect(-W, -120, W * 2, 220);
    ctx.fillRect(-W, 200, W * 2, 60);
    ctx.restore();

    // Concentric rings around center
    ctx.save();
    ctx.strokeStyle = theme.ring;
    ctx.globalAlpha = 0.18;
    for (let r = 200; r < 900; r += 60) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, 820, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Top brand bar
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    roundedRect(ctx, 60, 60, W - 120, 110, 24);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px 'Outfit', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🏆 TorneiosPro", 100, 132);
    if (tournamentName) {
      ctx.font = "500 32px 'Outfit', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const tn = tournamentName.length > 26 ? tournamentName.slice(0, 26) + "…" : tournamentName;
      ctx.fillText(tn, W - 100, 132);
    }

    // Position medallion
    const cx = W / 2;
    const cy = 720;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 60;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(cx, cy, 280, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outer ring
    ctx.lineWidth = 14;
    ctx.strokeStyle = theme.ring;
    ctx.beginPath();
    ctx.arc(cx, cy, 270, 0, Math.PI * 2);
    ctx.stroke();

    // Inner medallion fill
    const mGrad = ctx.createRadialGradient(cx - 60, cy - 80, 30, cx, cy, 260);
    mGrad.addColorStop(0, "rgba(255,255,255,0.35)");
    mGrad.addColorStop(0.5, theme.bg[1]);
    mGrad.addColorStop(1, theme.bg[0]);
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 256, 0, Math.PI * 2);
    ctx.fill();

    // Avatar (if provided) or position number
    if (avatarUrl) {
      try {
        const img = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 220, 0, Math.PI * 2);
        ctx.clip();
        const size = 440;
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
        ctx.restore();
        // overlay big position
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.arc(cx + 160, cy + 160, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.font = "900 110px 'Outfit', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${position}`, cx + 160, cy + 175);
      } catch {
        drawPositionNumber();
      }
    } else {
      drawPositionNumber();
    }

    function drawPositionNumber() {
      ctx.fillStyle = theme.accent;
      ctx.font = "900 360px 'Outfit', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = theme.textShadow;
      ctx.shadowBlur = 20;
      ctx.fillText(`${position}º`, cx, cy + 20);
      ctx.shadowBlur = 0;
    }

    // Emoji floating
    ctx.font = "180px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(theme.emoji, cx, cy - 380);

    // Position label
    ctx.fillStyle = theme.accent;
    ctx.font = "800 64px 'Outfit', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = theme.textShadow;
    ctx.shadowBlur = 12;
    ctx.fillText(theme.label, cx, 1110);
    ctx.shadowBlur = 0;

    // Participant name
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 96px 'Outfit', system-ui, sans-serif";
    const displayName = name.length > 18 ? name.slice(0, 18) + "…" : name;
    ctx.shadowColor = theme.textShadow;
    ctx.shadowBlur = 18;
    ctx.fillText(displayName, cx, 1230);
    ctx.shadowBlur = 0;

    // Stats card
    const cardY = 1340;
    const cardH = 360;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundedRect(ctx, 90, cardY, W - 180, cardH, 36);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const stats = [
      { label: "PONTOS", value: points },
      { label: "VITÓRIAS", value: wins },
      { label: "DERROTAS", value: losses },
    ];
    const colW = (W - 180) / 3;
    stats.forEach((s, i) => {
      const x = 90 + colW * i + colW / 2;
      ctx.fillStyle = theme.accent;
      ctx.font = "900 110px 'Outfit', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${s.value}`, x, cardY + 170);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "600 34px 'Outfit', system-ui, sans-serif";
      ctx.fillText(s.label, x, cardY + 250);
    });

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 30px 'Outfit', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Compartilhado via TorneiosPro", cx, H - 80);

    setDataUrl(canvas.toDataURL("image/png"));
    setRendering(false);
  }

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${name.replace(/\s+/g, "_")}_${position}_lugar.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${name}-${position}.png`, { type: "image/png" });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          title: `${theme.label} – ${name}`,
          text: `${theme.emoji} ${name} ficou em ${position}º lugar${tournamentName ? ` no ${tournamentName}` : ""}!`,
          files: [file],
        });
      } else {
        handleDownload();
        toast.info("Compartilhamento direto não suportado neste navegador. Imagem baixada.");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error(e.message || "Erro ao compartilhar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar classificação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-[9/16] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {rendering || !dataUrl ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
              <img src={dataUrl} alt="card" className="w-full h-full object-contain" />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={!dataUrl}>
              <Download className="w-4 h-4" /> Baixar
            </Button>
            <Button className="gap-2" onClick={handleShare} disabled={!dataUrl}>
              <Share2 className="w-4 h-4" /> Compartilhar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
