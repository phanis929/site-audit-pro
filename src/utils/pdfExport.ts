import { jsPDF } from 'jspdf';
import { AuditReport } from '../types.js';

export async function exportReportToPDF(report: AuditReport): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = margin;
      renderFooter();
    }
  };

  const renderFooter = () => {
    const pageCount = (doc.internal as any).getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 150);
    doc.text(
      `SiteAudit Pro  •  ${report.domain}  •  Page ${pageCount}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `AI-generated directional review, not a substitute for certified WCAG or Lighthouse audit.`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  // --- COVER / HEADER ---
  doc.setFillColor(24, 32, 47); // Dark Slate Blue
  doc.rect(margin, y, pageWidth - margin * 2, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SiteAudit Pro — Executive Report', margin + 6, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 215, 230);
  doc.text(`Domain: ${report.domain}  •  ${new Date(report.created_at).toLocaleDateString()}  •  ${report.total_pages_analyzed} Key Pages Analyzed`, margin + 6, y + 20);
  doc.text(`Target URL: ${report.root_url}`, margin + 6, y + 26);

  // Score Badge in Header
  const score = report.site_score;
  const scoreColor = score >= 80 ? [34, 197, 94] : score >= 50 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(pageWidth - margin - 32, y + 5, 26, 24, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${score}`, pageWidth - margin - 19, y + 17, { align: 'center' });
  doc.setFontSize(7);
  doc.text('/ 100', pageWidth - margin - 19, y + 23, { align: 'center' });

  y += 40;
  renderFooter();

  // --- CATEGORY SCORE PILLS ---
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'F');

  const categories = [
    { name: 'UI / UX', score: report.category_averages.ui_ux },
    { name: 'Content Quality', score: report.category_averages.content },
    { name: 'Accessibility', score: report.category_averages.accessibility },
    { name: 'Performance', score: report.category_averages.performance },
  ];

  const colWidth = (pageWidth - margin * 2) / 4;
  categories.forEach((cat, idx) => {
    const colX = margin + idx * colWidth + colWidth / 2;
    doc.setTextColor(100, 115, 130);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(cat.name, colX, y + 6, { align: 'center' });

    const cColor = cat.score >= 80 ? [22, 163, 74] : cat.score >= 50 ? [202, 138, 4] : [220, 38, 38];
    doc.setTextColor(cColor[0], cColor[1], cColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${cat.score}/100`, colX, y + 13, { align: 'center' });
  });

  y += 24;

  // --- EXECUTIVE SUMMARY ---
  checkPageBreak(25);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Executive Summary', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const summaryLines = doc.splitTextToSize(report.summary, pageWidth - margin * 2);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.5 + 8;

  // --- SITE-WIDE PATTERNS SECTION (PROMINENT FIRST) ---
  checkPageBreak(30);
  doc.setFillColor(238, 242, 255); // Indigo light
  doc.roundedRect(margin, y - 2, pageWidth - margin * 2, 8, 2, 2, 'F');
  doc.setTextColor(67, 56, 202);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`1. Site-Wide Patterns (${report.site_wide_patterns.length} Identified Issues)`, margin + 4, y + 4);
  y += 12;

  if (report.site_wide_patterns.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No systemic multi-page issues detected across the sampled pages.', margin, y);
    y += 8;
  } else {
    for (const pattern of report.site_wide_patterns) {
      checkPageBreak(32);

      // Severity badge color
      const isHigh = pattern.severity === 'High';
      const isMed = pattern.severity === 'Medium';
      const sevColor = isHigh ? [220, 38, 38] : isMed ? [217, 119, 6] : [71, 85, 105];

      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, 'FD');

      // Severity pill
      doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
      doc.roundedRect(margin + 4, y + 3, 16, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(pattern.severity.toUpperCase(), margin + 12, y + 6.5, { align: 'center' });

      // Pattern Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(pattern.pattern, margin + 23, y + 6.5);

      // Affected pages tag
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Affected Routes: ${pattern.affected_pages.join(', ')}`, margin + 4, y + 12);

      // Why it matters
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);
      const whyLines = doc.splitTextToSize(`Impact: ${pattern.why_it_matters}`, pageWidth - margin * 2 - 8);
      doc.text(whyLines[0] || '', margin + 4, y + 17);

      // Suggested Fix
      doc.setTextColor(16, 110, 50);
      doc.setFont('helvetica', 'bold');
      const fixLines = doc.splitTextToSize(`Fix: ${pattern.suggested_fix}`, pageWidth - margin * 2 - 8);
      doc.text(fixLines[0] || '', margin + 4, y + 22);

      y += 30;
    }
  }

  y += 4;

  // --- PER-PAGE BREAKDOWN SECTION ---
  checkPageBreak(30);
  doc.setFillColor(240, 249, 255); // Sky light
  doc.roundedRect(margin, y - 2, pageWidth - margin * 2, 8, 2, 2, 'F');
  doc.setTextColor(3, 105, 161);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`2. Individual Page Breakdown (${report.pages.length} Pages)`, margin + 4, y + 4);
  y += 14;

  for (let pIdx = 0; pIdx < report.pages.length; pIdx++) {
    const page = report.pages[pIdx];
    checkPageBreak(50);

    // Page title bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 1.5, 1.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Page ${pIdx + 1}: ${page.path}  (${page.url})`, margin + 4, y + 6.5);

    // Page score badge
    const pScoreColor = page.score >= 80 ? [22, 163, 74] : page.score >= 50 ? [202, 138, 4] : [220, 38, 38];
    doc.setFillColor(pScoreColor[0], pScoreColor[1], pScoreColor[2]);
    doc.roundedRect(pageWidth - margin - 20, y + 2, 16, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text(`${page.score}/100`, pageWidth - margin - 12, y + 6.2, { align: 'center' });

    y += 14;

    // Technical Signals summary
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const techText = `Response: ${page.signals.response_time_ms}ms  •  Size: ${page.signals.page_size_kb}KB  •  Alt Text: ${page.signals.alt_coverage_percentage}%  •  H1s: ${page.signals.h1_count}  •  Viewport: ${page.signals.has_viewport ? 'Yes' : 'Missing'}`;
    doc.text(techText, margin + 2, y);
    y += 6;

    // Category Findings for this page
    const cats = [
      { label: 'UI/UX Design', data: page.categories?.ui_ux },
      { label: 'Content & Copy', data: page.categories?.content },
      { label: 'Accessibility', data: page.categories?.accessibility },
      { label: 'Performance Signals', data: page.categories?.performance },
    ];

    for (const cat of cats) {
      if (!cat.data || !cat.data.findings || cat.data.findings.length === 0) continue;
      checkPageBreak(25);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${cat.label} (Score: ${cat.data.score}/100)`, margin + 2, y);
      y += 5;

      for (const finding of cat.data.findings) {
        checkPageBreak(18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);

        const sevTag = `[${finding.severity.toUpperCase()}]`;
        const issueLines = doc.splitTextToSize(`${sevTag} ${finding.issue}`, pageWidth - margin * 2 - 8);
        doc.text(issueLines, margin + 6, y);
        y += issueLines.length * 3.8 + 1;

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7.5);
        const fixLines = doc.splitTextToSize(`Fix: ${finding.suggested_fix}`, pageWidth - margin * 2 - 8);
        doc.text(fixLines, margin + 6, y);
        y += fixLines.length * 3.5 + 3;
      }
    }

    y += 6;
  }

  // Final footer render
  renderFooter();

  // Trigger browser download
  const cleanDomain = report.domain.replace(/[^a-z0-9.-]/gi, '_');
  doc.save(`SiteAuditPro_${cleanDomain}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
