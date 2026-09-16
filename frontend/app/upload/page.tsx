"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { uploadReports } from "@/services/api";

export default function UploadPage() {
  const router = useRouter();
  const [r1a, setR1a] = useState<File | null>(null);
  const [r1b, setR1b] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  async function analyze() {
    if (!r1a || !r1b) return;
    setStatus("Uploading and parsing reports...");
    try {
      const cycle = await uploadReports(r1a, r1b);
      setStatus("Analysis complete.");
      router.push(`/cycles/${cycle.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Analysis failed");
    }
  }

  return (
    <main className="grid">
      <h1>Upload Reports</h1>
      <div className="card grid">
        <label>R1A cycle summary PDF<input className="input" type="file" accept="application/pdf" onChange={(event) => setR1a(event.target.files?.[0] ?? null)} /></label>
        <label>R1B instant data PDF<input className="input" type="file" accept="application/pdf" onChange={(event) => setR1b(event.target.files?.[0] ?? null)} /></label>
        <button className="button row" onClick={analyze} disabled={!r1a || !r1b}><Upload size={18} /> Analyze Reports</button>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
