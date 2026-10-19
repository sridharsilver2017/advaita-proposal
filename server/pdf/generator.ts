// server/pdf/generator.ts
// Generates vector A4 PDFs using pdf-lib for Proposals, Agreements, Signed Agreements, and Invoices.
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ProposalPdfData {
  proposalNumber: string;
  version: number;
  title: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  scopeOfWork: string;
  deliverables: string;
  timeline: string;
  paymentSchedule: string;
  items: Array<{ description: string; quantity: number; rate: number; calculatedAmount: number }>;
  subtotal: number;
  discount: number;
  total: number;
  validUntil: string;
  businessSettings: Record<string, string>;
}

export interface AgreementPdfData {
  agreementNumber: string;
  version: number;
  proposalNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  effectiveDate: string;
  scopeOfWork: string;
  deliverables: string;
  timeline: string;
  price: number;
  paymentMilestones: string;
  legalTerms: string;
  ipTerms: string;
  confidentialityTerms: string;
  terminationConditions: string;
  disputeResolution: string;
  governingLaw: string;
  businessSettings: Record<string, string>;
  signatures?: Array<{
    role: string;
    signerName: string;
    signedAt: string;
    method: string;
    signatureImageData?: string;
  }>;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  agreementNumber: string;
  proposalNumber: string;
  projectName: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientAddress?: string;
  clientEmail: string;
  items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  subtotal: number;
  discounts: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  totalPayable: number;
  amountPaid: number;
  balanceDue: number;
  paymentInstructions?: string;
  terms?: string;
  businessSettings: Record<string, string>;
}

export async function generateProposalPdf(data: ProposalPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText(data.businessSettings.business_name || 'Advaita Designs', {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2)
  });

  page.drawText('PROPOSAL', {
    x: width - 150,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35)
  });

  y -= 25;
  page.drawText(data.businessSettings.tagline || 'Design & Digital Architecture', {
    x: 50,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.45, 0.5)
  });

  page.drawText(`Ref: ${data.proposalNumber} (v${data.version})`, {
    x: width - 180,
    y,
    size: 9,
    font,
    color: rgb(0.3, 0.3, 0.3)
  });

  y -= 15;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.9)
  });

  y -= 30;
  // Client & Project Info
  page.drawText('PREPARED FOR:', { x: 50, y, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
  page.drawText('DETAILS:', { x: 340, y, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });

  y -= 16;
  page.drawText(data.clientName, { x: 50, y, size: 12, font: fontBold });
  page.drawText(`Valid Until: ${data.validUntil}`, { x: 340, y, size: 9, font });

  y -= 14;
  page.drawText(data.clientEmail, { x: 50, y, size: 9, font });
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 340, y, size: 9, font });

  if (data.clientAddress) {
    y -= 14;
    page.drawText(data.clientAddress, { x: 50, y, size: 9, font });
  }

  y -= 25;
  // Proposal Title
  page.drawText('PROJECT PROPOSAL', { x: 50, y, size: 10, font: fontBold, color: rgb(0.4, 0.45, 0.5) });
  y -= 16;
  page.drawText(data.title, { x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  y -= 25;
  // Scope & Deliverables
  page.drawText('SCOPE OF WORK', { x: 50, y, size: 10, font: fontBold });
  y -= 15;
  const scopeLines = wrapText(data.scopeOfWork, 85);
  for (const line of scopeLines) {
    page.drawText(line, { x: 50, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 13;
  }

  y -= 10;
  page.drawText('DELIVERABLES', { x: 50, y, size: 10, font: fontBold });
  y -= 15;
  const deliverableLines = wrapText(data.deliverables, 85);
  for (const line of deliverableLines) {
    page.drawText(line, { x: 50, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 13;
  }

  y -= 10;
  page.drawText('TIMELINE & MILESTONES', { x: 50, y, size: 10, font: fontBold });
  y -= 15;
  page.drawText(data.timeline, { x: 50, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });

  y -= 25;
  // Items Table Header
  page.drawRectangle({
    x: 50,
    y: y - 5,
    width: width - 100,
    height: 20,
    color: rgb(0.95, 0.96, 0.98)
  });
  page.drawText('Item & Description', { x: 60, y, size: 9, font: fontBold });
  page.drawText('Qty', { x: 330, y, size: 9, font: fontBold });
  page.drawText('Rate (INR)', { x: 400, y, size: 9, font: fontBold });
  page.drawText('Amount (INR)', { x: 480, y, size: 9, font: fontBold });

  y -= 22;
  for (const item of data.items) {
    page.drawText(item.description, { x: 60, y, size: 9, font });
    page.drawText(String(item.quantity), { x: 330, y, size: 9, font });
    page.drawText(formatCurrency(item.rate), { x: 400, y, size: 9, font });
    page.drawText(formatCurrency(item.calculatedAmount), { x: 480, y, size: 9, font });
    y -= 16;
  }

  y -= 10;
  page.drawLine({ start: { x: 300, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });
  y -= 16;
  page.drawText('Subtotal:', { x: 380, y, size: 9, font });
  page.drawText(formatCurrency(data.subtotal), { x: 480, y, size: 9, font });

  if (data.discount > 0) {
    y -= 14;
    page.drawText('Discount:', { x: 380, y, size: 9, font });
    page.drawText(`-${formatCurrency(data.discount)}`, { x: 480, y, size: 9, font });
  }

  y -= 16;
  page.drawText('Total Value:', { x: 380, y, size: 10, font: fontBold });
  page.drawText(formatCurrency(data.total), { x: 480, y, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.3) });

  y -= 30;
  page.drawText('PAYMENT SCHEDULE', { x: 50, y, size: 10, font: fontBold });
  y -= 15;
  const payLines = wrapText(data.paymentSchedule, 85);
  for (const line of payLines) {
    page.drawText(line, { x: 50, y, size: 9, font });
    y -= 13;
  }

  // Footer
  const footerText = data.businessSettings.document_footer || 'Advaita Designs — Confidential & Proprietary';
  page.drawText(footerText, {
    x: 50,
    y: 35,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });

  return doc.save();
}

export async function generateAgreementPdf(data: AgreementPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText(data.businessSettings.business_name || 'Advaita Designs', {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2)
  });

  page.drawText('MUTUAL SERVICE AGREEMENT', {
    x: width - 230,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35)
  });

  y -= 25;
  page.drawText(`Agreement No: ${data.agreementNumber} (v${data.version}) | Prop Ref: ${data.proposalNumber}`, {
    x: 50,
    y,
    size: 9,
    font,
    color: rgb(0.35, 0.4, 0.45)
  });

  y -= 15;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });

  y -= 25;
  page.drawText(`Effective Date: ${data.effectiveDate}`, { x: 50, y, size: 9, font: fontBold });
  y -= 18;
  page.drawText(`BETWEEN: ${data.businessSettings.business_name || 'Advaita Designs'} ("Designer")`, { x: 50, y, size: 9, font: fontBold });
  y -= 14;
  page.drawText(`AND: ${data.clientName} ("Client", ${data.clientEmail})`, { x: 50, y, size: 9, font: fontBold });

  y -= 22;
  page.drawText('TERMS & CONDITIONS', { x: 50, y, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });

  y -= 15;
  const terms = [
    `1. SCOPE & DELIVERABLES: Designer agrees to execute the scope of work: ${data.scopeOfWork}. Deliverables: ${data.deliverables}. Timeline: ${data.timeline}.`,
    `2. FEES & MILESTONES: Total agreed compensation is ${formatCurrency(data.price)}. Milestones: ${data.paymentMilestones}.`,
    `3. INTELLECTUAL PROPERTY: ${data.ipTerms}`,
    `4. CONFIDENTIALITY: ${data.confidentialityTerms}`,
    `5. TERMINATION: ${data.terminationConditions}`,
    `6. GOVERNING LAW: ${data.governingLaw}. Dispute Resolution: ${data.disputeResolution}.`
  ];

  for (const term of terms) {
    const wrapped = wrapText(term, 85);
    for (const line of wrapped) {
      if (y < 120) {
        page = doc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      page.drawText(line, { x: 50, y, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 12;
    }
    y -= 6;
  }

  // Signature Block
  if (y < 200) {
    page = doc.addPage([595.28, 841.89]);
    y = height - 50;
  }

  y -= 20;
  page.drawText('SIGNATURES & EXECUTION', { x: 50, y, size: 10, font: fontBold });
  y -= 15;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

  y -= 30;
  // Left: Freelancer
  const freelancerSig = data.signatures?.find(s => s.role === 'freelancer');
  page.drawText('FOR ADVAITA DESIGNS:', { x: 50, y, size: 9, font: fontBold });
  page.drawText('FOR CLIENT:', { x: 320, y, size: 9, font: fontBold });

  y -= 20;
  if (freelancerSig) {
    page.drawText(`Signed by: ${freelancerSig.signerName}`, { x: 50, y, size: 9, font: fontBold, color: rgb(0.1, 0.4, 0.2) });
    page.drawText(`Method: ${freelancerSig.method} | Date: ${freelancerSig.signedAt}`, { x: 50, y: y - 12, size: 7.5, font });
  } else {
    page.drawText('[Pending Signature]', { x: 50, y, size: 9, font, color: rgb(0.6, 0.4, 0.1) });
  }

  // Right: Client
  const clientSig = data.signatures?.find(s => s.role === 'client');
  if (clientSig) {
    page.drawText(`Signed by: ${clientSig.signerName}`, { x: 320, y, size: 9, font: fontBold, color: rgb(0.1, 0.4, 0.2) });
    page.drawText(`Method: ${clientSig.method} | Date: ${clientSig.signedAt}`, { x: 320, y: y - 12, size: 7.5, font });
  } else {
    page.drawText('[Pending Signature]', { x: 320, y, size: 9, font, color: rgb(0.6, 0.4, 0.1) });
  }

  // Footer
  page.drawText(data.businessSettings.document_footer || 'Advaita Designs — Legally Binding Service Agreement', {
    x: 50,
    y: 35,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });

  return doc.save();
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText(data.businessSettings.business_name || 'Advaita Designs', {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2)
  });

  page.drawText('INVOICE', {
    x: width - 140,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3)
  });

  y -= 25;
  page.drawText(`Invoice No: ${data.invoiceNumber}`, { x: width - 180, y, size: 9, font: fontBold });
  page.drawText(`Issue Date: ${data.issueDate}`, { x: width - 180, y: y - 14, size: 9, font });
  page.drawText(`Due Date: ${data.dueDate}`, { x: width - 180, y: y - 28, size: 9, font: fontBold, color: rgb(0.7, 0.2, 0.1) });

  page.drawText(data.businessSettings.address_line1 || 'Chennai, India', { x: 50, y, size: 9, font });
  y -= 14;
  page.drawText(`${data.businessSettings.city || 'Chennai'}, ${data.businessSettings.state || 'Tamil Nadu'} - ${data.businessSettings.postal_code || '600041'}`, { x: 50, y, size: 9, font });
  y -= 14;
  page.drawText(`Email: ${data.businessSettings.email || 'hello@advaitadesigns.com'} | PAN: ${data.businessSettings.pan || 'N/A'}`, { x: 50, y, size: 9, font });

  y -= 25;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });

  y -= 25;
  page.drawText('BILLED TO:', { x: 50, y, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });
  page.drawText('ENGAGEMENT REFERENCE:', { x: 340, y, size: 9, font: fontBold, color: rgb(0.3, 0.35, 0.4) });

  y -= 16;
  page.drawText(data.clientName, { x: 50, y, size: 12, font: fontBold });
  page.drawText(`Project: ${data.projectName}`, { x: 340, y, size: 9, font });

  y -= 14;
  page.drawText(data.clientEmail, { x: 50, y, size: 9, font });
  page.drawText(`Agreement Ref: ${data.agreementNumber}`, { x: 340, y, size: 9, font });

  if (data.clientAddress) {
    y -= 14;
    page.drawText(data.clientAddress, { x: 50, y, size: 9, font });
    page.drawText(`Proposal Ref: ${data.proposalNumber}`, { x: 340, y, size: 9, font });
  }

  y -= 35;
  // Items Header
  page.drawRectangle({
    x: 50,
    y: y - 5,
    width: width - 100,
    height: 20,
    color: rgb(0.95, 0.96, 0.98)
  });
  page.drawText('Description', { x: 60, y, size: 9, font: fontBold });
  page.drawText('Qty', { x: 330, y, size: 9, font: fontBold });
  page.drawText('Rate (INR)', { x: 400, y, size: 9, font: fontBold });
  page.drawText('Amount (INR)', { x: 480, y, size: 9, font: fontBold });

  y -= 22;
  for (const item of data.items) {
    page.drawText(item.description, { x: 60, y, size: 9, font });
    page.drawText(String(item.quantity), { x: 330, y, size: 9, font });
    page.drawText(formatCurrency(item.rate), { x: 400, y, size: 9, font });
    page.drawText(formatCurrency(item.amount), { x: 480, y, size: 9, font });
    y -= 16;
  }

  y -= 10;
  page.drawLine({ start: { x: 320, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });

  y -= 16;
  page.drawText('Subtotal:', { x: 380, y, size: 9, font });
  page.drawText(formatCurrency(data.subtotal), { x: 480, y, size: 9, font });

  if (data.discounts > 0) {
    y -= 14;
    page.drawText('Discount:', { x: 380, y, size: 9, font });
    page.drawText(`-${formatCurrency(data.discounts)}`, { x: 480, y, size: 9, font });
  }

  if (data.taxEnabled && data.taxAmount > 0) {
    y -= 14;
    page.drawText(`GST (${data.taxRate}%):`, { x: 380, y, size: 9, font });
    page.drawText(formatCurrency(data.taxAmount), { x: 480, y, size: 9, font });
  }

  y -= 16;
  page.drawText('Total Payable:', { x: 380, y, size: 10, font: fontBold });
  page.drawText(formatCurrency(data.totalPayable), { x: 480, y, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.3) });

  if (data.amountPaid > 0) {
    y -= 14;
    page.drawText('Amount Paid:', { x: 380, y, size: 9, font, color: rgb(0.1, 0.5, 0.2) });
    page.drawText(`-${formatCurrency(data.amountPaid)}`, { x: 480, y, size: 9, font, color: rgb(0.1, 0.5, 0.2) });
  }

  y -= 16;
  page.drawText('Balance Due:', { x: 380, y, size: 10, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
  page.drawText(formatCurrency(data.balanceDue), { x: 480, y, size: 10, font: fontBold, color: rgb(0.8, 0.1, 0.1) });

  y -= 30;
  // Payment Instructions
  page.drawText('PAYMENT INSTRUCTIONS', { x: 50, y, size: 9, font: fontBold });
  y -= 14;
  page.drawText(`Bank: ${data.businessSettings.bank_name || 'HDFC Bank'} | A/C: ${data.businessSettings.bank_account_number || '50200012345678'}`, { x: 50, y, size: 8.5, font });
  y -= 12;
  page.drawText(`IFSC: ${data.businessSettings.bank_ifsc || 'HDFC0001234'} | Branch: ${data.businessSettings.bank_branch || 'Chennai'}`, { x: 50, y, size: 8.5, font });
  y -= 12;
  page.drawText(`UPI ID: ${data.businessSettings.upi_id || 'advaita@okhdfcbank'}`, { x: 50, y, size: 8.5, font: fontBold });

  y -= 25;
  page.drawText('TERMS & CONDITIONS', { x: 50, y, size: 9, font: fontBold });
  y -= 14;
  page.drawText(data.terms || 'Payment is strictly due within 7 days of invoice date. Thank you for your partnership!', { x: 50, y, size: 8.5, font });

  // Footer
  page.drawText(data.businessSettings.document_footer || 'Advaita Designs — Confidential & Proprietary', {
    x: 50,
    y: 35,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });

  return doc.save();
}

function formatCurrency(num: number): string {
  return `INR ${Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function wrapText(text: string, maxCharsPerLine: number = 80): string[] {
  if (!text) return [];
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (para.length <= maxCharsPerLine) {
      lines.push(para);
    } else {
      const words = para.split(' ');
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + word).length > maxCharsPerLine) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine.trim());
      }
    }
  }

  return lines;
}
