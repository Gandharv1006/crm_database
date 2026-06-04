import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Downloads record dataset as a CSV file.
 */
export function downloadCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads record dataset as a stylized PDF table using jspdf-autotable.
 */
export function downloadPDF(
  data: Record<string, any>[],
  filename: string,
  title: string
) {
  if (!data || data.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Draw ACADEX CRM header branding logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(99, 102, 241); // Indigo Primary Accent (#6366f1)
  doc.text("ACADEX CRM", 14, 15);

  // Draw Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(title, 14, 22);

  // Draw timestamp metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 27);

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === undefined || val === null) return "";
      
      const k = h.toLowerCase();
      const isMonetaryCol =
        k.includes("amount") ||
        k.includes("balance") ||
        k.includes("payment") ||
        k.includes("rate") ||
        k.includes("commission") ||
        k.includes("deduction") ||
        k.includes("transaction") ||
        k.includes("salary") ||
        k.includes("expense");

      if (isMonetaryCol) {
        let numStr = String(val).replace(/[^\d.-]/g, "");
        const num = Number(numStr);
        if (!isNaN(num) && numStr.trim() !== "") {
          const isNegative = num < 0 || String(val).includes("-");
          const formattedNum = Math.abs(num).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          });
          const prefix = isNegative ? "-₹" : (String(val).includes("+") ? "+₹" : "₹");
          return `${prefix}${formattedNum}`;
        }
      }
      return String(val);
    })
  );

  // Stylized table using jspdf-autotable
  autoTable(doc, {
    startY: 31,
    head: [headers.map((h) => h.replace(/_/g, " ").toUpperCase())],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: [248, 250, 252], // Slate-50
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // Slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    margin: { left: 14, right: 14 },
    styles: {
      overflow: "linebreak",
      cellPadding: 2.5,
    },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/**
 * Downloads expenses dataset as a custom portrait PDF report.
 */
export function exportExpensesPDF(expenses: any[]) {
  if (!expenses || expenses.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Draw ACADEX CRM header branding logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241); // Indigo Primary Accent (#6366f1)
  doc.text("ACADEX CRM", 14, 15);

  // Draw Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("ACADEX CRM — Expense Report", 14, 21);

  // Draw timestamp metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Report Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 26);

  // Draw summary card/row
  const totalCount = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const formattedTotalAmount = `₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // Slate-700
  doc.text(`Total Expenses: ${totalCount}   |   Total Amount: ${formattedTotalAmount}`, 14, 32);

  // Prepare table columns and rows
  const headers = ["#", "Title", "Pay To", "Amount (₹)", "Date", "Reason"];
  const rows = expenses.map((e, index) => {
    const payTo = e.pay_to_type === "EMPLOYEE"
      ? (e.employees?.name || e.pay_to_display || "N/A")
      : (e.pay_to_name || e.pay_to_display || "N/A");

    const formattedAmount = `₹${Number(e.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const formattedDate = new Date(e.expense_date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return [
      String(index + 1),
      e.title || "",
      payTo,
      formattedAmount,
      formattedDate,
      e.reason || "—",
    ];
  });

  // Stylized table using jspdf-autotable
  autoTable(doc, {
    startY: 36,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: [248, 250, 252], // Slate-50
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // Slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    margin: { left: 14, right: 14 },
    styles: {
      overflow: "linebreak",
      cellPadding: 2.5,
    },
  });

  doc.save("expense_report.pdf");
}
