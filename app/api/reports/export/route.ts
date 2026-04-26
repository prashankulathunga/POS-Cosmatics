import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { getSession } from "@/lib/auth/session";
import { getReportData } from "@/lib/services/reports";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const cashierId = searchParams.get("cashierId") ?? undefined;

  if (!format || !type || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing report filters" }, { status: 400 });
  }

  const data = await getReportData({
    type: type as never,
    startDate,
    endDate,
    cashierId,
  });

  const rows = buildRows(type, data);
  const filenameBase = `${type}-${startDate}-${endDate}`;

  if (format === "xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`POS Beauty Report: ${type}`, 14, 18);
  doc.setFontSize(10);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 26);

  autoTable(doc, {
    startY: 32,
    head: rows.length ? [Object.keys(rows[0])] : [["No data"]],
    body: rows.length ? rows.map((row) => Object.values(row)) : [["No data"]],
    styles: {
      fontSize: 9,
    },
  });

  const pdfBuffer = doc.output("arraybuffer");
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}

function buildRows(type: string, data: Awaited<ReturnType<typeof getReportData>>) {
  switch (type) {
    case "stock":
      return data.stock.map((item) => ({
        Product: item.name,
        Barcode: item.barcode,
        Category: item.category?.name ?? "",
        Stock: item.stockQuantity,
        LowStockLimit: item.lowStockLimit,
        SellingPrice: Number(item.sellingPrice),
      }));
    case "expenses":
      return data.expenses.map((item) => ({
        Title: item.title,
        Category: item.category?.name ?? "",
        Date: item.expenseDate.toISOString().slice(0, 10),
        Amount: Number(item.amount),
      }));
    case "sales-by-cashier":
      return data.cashierSummary.map((item) => ({
        Cashier: item.cashierName,
        SalesCount: item.saleCount,
        TotalSales: item.totalSales,
      }));
    case "best-selling-products":
      return data.bestSellingProducts.map((item) => ({
        Product: item.productName,
        Barcode: item.barcode,
        Quantity: item.quantity,
        SalesTotal: item.salesTotal,
      }));
    case "profit":
      return data.saleItems.map((item) => ({
        Product: item.productNameSnapshot,
        Invoice: item.sale.invoiceNumber,
        Cashier: item.sale.cashier.fullName,
        Quantity: item.quantity,
        Revenue: Number(item.lineTotal),
        Cost: Number(item.buyingPriceSnapshot) * item.quantity,
        Profit: Number(item.lineTotal) - Number(item.buyingPriceSnapshot) * item.quantity,
      }));
    default:
      return data.sales.map((item) => ({
        Invoice: item.invoiceNumber,
        Cashier: item.cashier.fullName,
        Date: item.createdAt.toISOString().slice(0, 10),
        PaymentMethod: item.paymentMethod,
        Total: Number(item.total),
      }));
  }
}
