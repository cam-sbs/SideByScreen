"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

const OUTPUT_SIZE = 512;
const OUTPUT_MIME = "image/jpeg";
const OUTPUT_QUALITY = 0.85;

type Props = {
  sourceUrl: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

export function AvatarCropper({ sourceUrl, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  async function handleConfirm() {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await cropToBlob(sourceUrl, croppedArea);
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.95)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "28rem",
          overflow: "hidden",
          borderRadius: "0.75rem",
          backgroundColor: "#09090b",
          border: "1px solid #27272a",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #27272a",
          }}
        >
          <h2 style={{ fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
            Recadrer l&apos;avatar
          </h2>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "20rem",
            backgroundColor: "#18181b",
          }}
        >
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            padding: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#f4f4f5" }}
              aria-label="Zoom"
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                borderRadius: "0.5rem",
                border: "1px solid #3f3f46",
                backgroundColor: "transparent",
                color: "inherit",
                cursor: processing ? "not-allowed" : "pointer",
                opacity: processing ? 0.5 : 1,
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !croppedArea}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "#f4f4f5",
                color: "#18181b",
                cursor: processing || !croppedArea ? "not-allowed" : "pointer",
                opacity: processing || !croppedArea ? 0.5 : 1,
              }}
            >
              {processing ? "Traitement..." : "Valider"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function cropToBlob(sourceUrl: string, area: Area): Promise<Blob> {
  const image = await loadImage(sourceUrl);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      OUTPUT_MIME,
      OUTPUT_QUALITY,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image"));
    img.src = src;
  });
}
