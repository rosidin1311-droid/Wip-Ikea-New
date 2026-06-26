import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON payloads up to 15MB for base64 camera images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy init GoogleGenAI helper
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Parse handwritten production log image via Gemini
app.post("/api/parse-photo", async (req, res) => {
  try {
    const { image, items, customers } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image payload found" });
    }

    // Initialize Gemini safely
    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      if (err.message === "GEMINI_API_KEY_MISSING") {
        return res.status(400).json({
          error: "API_KEY_MISSING",
          message: "API Key Gemini belum diatur di menu Settings > Secrets.",
        });
      }
      throw err;
    }

    // Clean base64 image data
    let mimeType = "image/jpeg";
    let base64Data = image;

    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    // Format current master data as helper context for the model
    const itemsContext = Array.isArray(items)
      ? items.map(i => ({
          id: i.id,
          model: i.model,
          partNumber: i.part_number,
          processes: i.alur_proses,
          customerName: i.customer_name || customers?.find((c: any) => c.id === i.customer_id)?.name || ""
        }))
      : [];

    const promptText = `
Anda adalah asisten AI pembaca catatan produksi (WIP Tracker) di pabrik.
Tugas Anda adalah membaca gambar/foto kertas coretan catatan harian kerja, tabel produksi, atau catatan palet yang ditulis tangan di lantai produksi, lalu mengekstraknya menjadi daftar transaksi WIP yang terstruktur.

Berikut adalah daftar ITEM/PART yang terdaftar resmi di sistem (Master Data):
${JSON.stringify(itemsContext, null, 2)}

Petunjuk Analisis & Pencocokan:
1. Bacalah tulisan tangan pada foto dengan sangat hati-hati. Cari tulisan yang mirip dengan:
   - Nama Model (misal: CONS BOX, MBOX, IKEA-TABLE, dll.) atau Part Number (nomor part).
   - Nama proses / tahapan kerja (misal: POTONG, TEKUK, BOR, STITCHING, PACKING, RAKIT, dll).
   - Jumlah (Qty) barang jadi (Good / OK) dan jumlah cacat (NG / No Good) jika ada.
   - Nama operator atau inisial nama pekerja.
   - Angka shift kerja (Shift 1, 2, atau 3).
   - Catatan tambahan (misal: "Bahan penyok", "Selesai pagi", dll).

2. Lakukan pencocokan cerdas:
   - Jika tulisan tangan menulis singkatan atau salah eja (misal "CONS" atau "CON BOX"), cocokkan dengan item resmi terdaftar yang paling mendekati (misal ID item dengan model "CONS BOX").
   - Jika proses tertulis "PTG" atau "Cut", cocokkan dengan proses yang ada pada daftar "processes" item tersebut (misal "POTONG" atau "PREPARASI").
   - Tentukan jenis aksi ("action"): 'WIP_UPDATE' (default untuk produksi harian/proses internal), 'IN' (jika tercatat material masuk/awal), atau 'OUT' (jika tercatat barang keluar/kirim).

3. Jika ada beberapa baris atau kolom catatan dalam foto satu kertas tersebut, ekstrak semuanya sebagai item transaksi yang terpisah.

Kembalikan hasilnya dalam format JSON murni sesuai dengan schema yang ditentukan.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["transactions"],
          properties: {
            transactions: {
              type: Type.ARRAY,
              description: "Daftar transaksi yang berhasil diekstrak dari catatan foto",
              items: {
                type: Type.OBJECT,
                required: ["itemId", "proses", "action", "qty"],
                properties: {
                  itemId: {
                    type: Type.STRING,
                    description: "ID Item yang cocok dari daftar Master Data. Kosongkan atau tebak yang paling mirip jika tidak ada kecocokan pasti.",
                  },
                  modelName: {
                    type: Type.STRING,
                    description: "Nama model yang tertulis di kertas (untuk konfirmasi visual user).",
                  },
                  partNumber: {
                    type: Type.STRING,
                    description: "Nomor part yang tertulis di kertas (untuk konfirmasi visual user).",
                  },
                  proses: {
                    type: Type.STRING,
                    description: "Nama proses produksi yang cocok (harus disesuaikan dengan alur proses resmi item tersebut, misal: POTONG).",
                  },
                  action: {
                    type: Type.STRING,
                    description: "Jenis transaksi: 'WIP_UPDATE' (produksi/proses normal), 'IN' (input awal), atau 'OUT' (keluar/kirim).",
                  },
                  qty: {
                    type: Type.INTEGER,
                    description: "Jumlah pcs yang berhasil dikerjakan (Good / OK).",
                  },
                  qty_ng: {
                    type: Type.INTEGER,
                    description: "Jumlah pcs yang cacat (NG) jika tercatat, jika tidak ada isi 0.",
                  },
                  operator: {
                    type: Type.STRING,
                    description: "Nama operator yang tertulis di kertas, atau kosongkan jika tidak ada.",
                  },
                  shift: {
                    type: Type.INTEGER,
                    description: "Nomor shift kerja (1, 2, atau 3) jika tertulis, defaultnya 1.",
                  },
                  catatan: {
                    type: Type.STRING,
                    description: "Keterangan tambahan atau catatan penting lainnya.",
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: "Tingkat keyakinan AI dalam menganalisis data ini (nilai antara 0.0 sampai 1.0).",
                  },
                },
              },
            },
            catatanRingkas: {
              type: Type.STRING,
              description: "Ringkasan pembacaan kertas coretan secara umum.",
            },
          },
        },
      },
    });

    const text = response.text || "{}";
    const resultJson = JSON.parse(text);
    return res.json(resultJson);

  } catch (error: any) {
    console.error("Error parsing photo with Gemini:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: error?.message || "Gagal memproses foto catatan dengan AI.",
    });
  }
});

// Vite & Static file handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
