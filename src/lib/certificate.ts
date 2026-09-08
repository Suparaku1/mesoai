
export type CertificateData = {
  studentName: string;
  courseTitle: string;
  drejtimi?: string | null;
  klasa?: string | null;
  averageGrade?: number | null;
  teacherName?: string | null;
  date?: Date;
};

/** jsPDF ngarkohet vetëm kur kërkohet certifikata, që bundle-i fillestar të mbetet i lehtë. */
export async function generateCertificatePDF(data: CertificateData) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, W, H, "F");

  // Border
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, W - 28, H - 28);

  // Header
  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SHKOLLA PROFESIONALE ELBASAN", W / 2, 28, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Uendi Platform", W / 2, 34, { align: "center" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("CERTIFIKATË PËRFUNDIMI", W / 2, 62, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("Kjo certifikatë i jepet me krenari", W / 2, 78, { align: "center" });

  // Student name
  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(data.studentName, W / 2, 96, { align: "center" });

  doc.setDrawColor(91, 179, 184);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 70, 100, W / 2 + 70, 100);

  // Body
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("për përfundimin me sukses të kursit", W / 2, 112, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  const courseLines = doc.splitTextToSize(`"${data.courseTitle}"`, W - 60);
  doc.text(courseLines, W / 2, 124, { align: "center" });

  if (data.drejtimi || data.klasa) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const meta = [data.drejtimi, data.klasa ? `Klasa ${data.klasa}` : null].filter(Boolean).join(" · ");
    doc.text(meta, W / 2, 138, { align: "center" });
  }

  if (typeof data.averageGrade === "number" && !Number.isNaN(data.averageGrade)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(`Nota mesatare: ${data.averageGrade.toFixed(2)} / 10`, W / 2, 150, { align: "center" });
  }

  // Footer signatures
  const dateStr = (data.date ?? new Date()).toLocaleDateString("sq-AL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(40, H - 38, 110, H - 38);
  doc.line(W - 110, H - 38, W - 40, H - 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Data", 75, H - 32, { align: "center" });
  doc.text(dateStr, 75, H - 26, { align: "center" });

  doc.text("Mësuesi", W - 75, H - 32, { align: "center" });
  doc.text(data.teacherName ?? "—", W - 75, H - 26, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Krijuar nga Esmerald Suparaku · Uendi Platform", W / 2, H - 16, { align: "center" });

  const safeName = data.studentName.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`Certifikate_${safeName}.pdf`);
}
