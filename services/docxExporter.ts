import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function exportContractToDocx(title: string, documentText: string): Promise<string> {
  const cleanTitle = title.trim() || 'Legal_Contract';
  const fileName = `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;

  const paragraphs: Paragraph[] = [];

  // Title header
  paragraphs.push(
    new Paragraph({
      text: cleanTitle.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300, before: 100 },
    })
  );

  // Split content by paragraphs
  const rawParagraphs = documentText.split(/\n\s*\n/);

  for (const rawP of rawParagraphs) {
    const trimmed = rawP.trim();
    if (!trimmed) continue;

    const isHeading =
      /^(?:CLAUSE|\d+\.|\b[A-Z0-9\s,\-–]{4,}\b:?$)/.test(trimmed) && trimmed.length < 120 && !trimmed.includes('\n');

    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24, // 12pt
              font: 'Times New Roman',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
    } else {
      const lines = trimmed.split('\n');
      const textRuns: TextRun[] = [];

      lines.forEach((line, idx) => {
        textRuns.push(
          new TextRun({
            text: line,
            size: 22, // 11pt
            font: 'Times New Roman',
          })
        );
        if (idx < lines.length - 1) {
          textRuns.push(new TextRun({ break: 1 }));
        }
      });

      paragraphs.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 160, line: 276 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const base64Data = await Packer.toBase64String(doc);

  if (Platform.OS === 'web') {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return fileName;
  } else {
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: `Share ${fileName}`,
        UTI: 'com.microsoft.word.doc',
      });
    }

    return fileUri;
  }
}
