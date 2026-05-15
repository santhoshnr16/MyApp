import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppColors, Radius } from '@/constants/colors';
import { formatFileSize } from '@/services/documentProcessor';
import type { DocumentFile } from '@/types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';

type UploadCardProps = {
  file: DocumentFile | null;
  onPick: () => void;
  onRemove: () => void;
  onCamera: () => void;
};

export function UploadCard({ file, onPick, onRemove, onCamera }: UploadCardProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  return (
    <Card style={styles.card}>
      <View style={[styles.uploadBox, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
        <View style={[styles.iconBadge, { backgroundColor: palette.accentSoft }]}> 
          <Ionicons name="document-text" size={26} color={palette.primary} />
        </View>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Upload your legal document</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Petition, affidavit, notice, contract, judgment - any legal PDF.
        </Text>
        <Button label="Choose PDF File" onPress={onPick} style={styles.primaryButton} />
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
          <Text style={[styles.dividerText, { color: palette.textMuted }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
        </View>
        <Button label="Take Photo of Document" onPress={onCamera} variant="outline" />
      </View>

      {file && (
        <View style={[styles.fileInfo, { borderColor: palette.border }]}> 
          <Ionicons name="checkmark-circle" size={22} color={palette.success} />
          <View style={styles.fileMeta}>
            <Text style={[styles.fileName, { color: palette.textPrimary }]} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={[styles.fileSize, { color: palette.textMuted }]}>
              {formatFileSize(file.size)}
            </Text>
          </View>
          <TouchableOpacity onPress={onRemove}>
            <Text style={[styles.removeText, { color: palette.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  uploadBox: {
    borderWidth: 2,
    borderRadius: Radius.standard,
    borderStyle: 'dashed',
    padding: 18,
    alignItems: 'flex-start',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'left',
    marginBottom: 14,
  },
  primaryButton: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fileInfo: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: Radius.standard,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
