// src/Export.js
// Handles PNG, SVG, and PDF export of QR codes

// ── PNG Export ────────────────────────────────────────────────────────────────
export function exportPNG(canvas, filename = "qraft-qr.png", scale = 2) {
  if (!canvas) throw new Error("No QR code to export.");

  // Create a scaled canvas for high-DPI export
  const scaled = document.createElement("canvas");
  scaled.width  = canvas.width  * scale;
  scaled.height = canvas.height * scale;
  const ctx = scaled.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);

  const a    = document.createElement("a");
  a.download = filename;
  a.href     = scaled.toDataURL("image/png");
  a.click();
}

// ── SVG Export ────────────────────────────────────────────────────────────────
export function exportSVG(modules, size, fg, bg, shape, filename = "qraft-qr.svg") {
  if (!modules || !modules.length) throw new Error("No QR code to export.");

  const n  = modules.length;
  const cs = size / n;
  const paths = [];

  const finderZone = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c > n - 8) || (r > n - 8 && c < 7);

  // Build path data for each module
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!modules[r][c] || finderZone(r, c)) continue;
      const x = c * cs, y = r * cs, s = cs, pad = s * 0.1;

      if (shape === "dots") {
        const cx = x + s / 2, cy = y + s / 2, radius = s / 2 - pad;
        paths.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="${fg}"/>`);
      } else if (shape === "rounded") {
        const rx2 = s * 0.25;
        paths.push(`<rect x="${(x+pad).toFixed(2)}" y="${(y+pad).toFixed(2)}" width="${(s-pad*2).toFixed(2)}" height="${(s-pad*2).toFixed(2)}" rx="${rx2.toFixed(2)}" fill="${fg}"/>`);
      } else if (shape === "diamond") {
        const cx = x + s/2, cy = y + s/2, r2 = s/2 - pad;
        paths.push(`<polygon points="${cx},${cy-r2} ${cx+r2},${cy} ${cx},${cy+r2} ${cx-r2},${cy}" fill="${fg}"/>`);
      } else if (shape === "stars") {
        const cx = x + s/2, cy = y + s/2;
        const oR = s/2 - pad, iR = s/4 - pad/2;
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const rr = i % 2 === 0 ? oR : iR;
          pts.push(`${(cx + Math.cos(angle)*rr).toFixed(2)},${(cy + Math.sin(angle)*rr).toFixed(2)}`);
        }
        paths.push(`<polygon points="${pts.join(" ")}" fill="${fg}"/>`);
      } else {
        paths.push(`<rect x="${(x+pad*0.5).toFixed(2)}" y="${(y+pad*0.5).toFixed(2)}" width="${(s-pad).toFixed(2)}" height="${(s-pad).toFixed(2)}" fill="${fg}"/>`);
      }
    }
  }

  // Draw finder patterns (always square)
  const finderSVG = (row, col) => {
    const fx = col * cs, fy = row * cs, fs = cs * 7;
    return [
      `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" fill="${fg}"/>`,
      `<rect x="${fx+cs}" y="${fy+cs}" width="${fs-cs*2}" height="${fs-cs*2}" fill="${bg}"/>`,
      `<rect x="${fx+cs*2}" y="${fy+cs*2}" width="${cs*3}" height="${cs*3}" fill="${fg}"/>`,
    ].join("\n");
  };

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  ${paths.join("\n  ")}
  ${finderSVG(0, 0)}
  ${finderSVG(0, n - 7)}
  ${finderSVG(n - 7, 0)}
</svg>`;

  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.download = filename;
  a.href     = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── PDF Export ────────────────────────────────────────────────────────────────
export function exportPDF(canvas, label = "QRaft QR Code", filename = "qraft-qr.pdf") {
  if (!canvas) throw new Error("No QR code to export.");
  const imgData = canvas.toDataURL("image/png");
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${label}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100vh; background: #fff; padding: 40px;
    }
    .card {
      border: 1px solid #e5e7eb; border-radius: 16px;
      padding: 32px; text-align: center;
      max-width: 400px; width: 100%;
    }
    img { max-width: 280px; width: 100%; border-radius: 8px; }
    h2 { margin-top: 20px; font-size: 18px; color: #111; }
    p  { margin-top: 8px; font-size: 13px; color: #6b7280; }
    .brand { margin-top: 24px; font-size: 12px; color: #9ca3af; }
    @media print {
      button { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="${imgData}" alt="QR Code"/>
    <h2>${label}</h2>
    <p>Scan with your device camera</p>
    <p class="brand">Generated by QRaft</p>
  </div>
  <button onclick="window.print()" style="margin-top:24px;padding:10px 28px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">
    Print / Save as PDF
  </button>
</body>
</html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}