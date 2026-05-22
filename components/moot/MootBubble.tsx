import { StyleSheet, Text, View } from 'react-native';

import { C, Radius } from '@/constants/colors';
import type { MootMessage, MootRole } from '@/types/moot';

const COUNSEL_NAME = 'Sr. Adv. Rajan Iyer';

interface MootBubbleProps {
  message: MootMessage;
  studentRole: MootRole;
}

export function MootBubble({ message, studentRole }: MootBubbleProps) {
  const isStudent = message.sender === 'student';
  const label = isStudent
    ? `You (${studentRole.charAt(0).toUpperCase() + studentRole.slice(1)})`
    : COUNSEL_NAME;

  return (
    <View style={[styles.wrap, isStudent ? styles.wrapRight : styles.wrapLeft]}>
      <Text style={isStudent ? styles.studentLabel : styles.counselLabel}>{label}</Text>
      <View
        style={[
          styles.bubble,
          isStudent ? styles.studentBubble : styles.counselBubble,
        ]}>
        <Text style={[styles.text, !isStudent && styles.counselText]}>{message.text}</Text>
      </View>
      <Text style={styles.time}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 6,
    gap: 4,
  },
  wrapRight: {
    alignItems: 'flex-end',
  },
  wrapLeft: {
    alignItems: 'flex-start',
  },
  studentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6BAAFF',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  counselLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF8080',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: Radius.bubble,
  },
  studentBubble: {
    backgroundColor: C.mootNavy,
    borderTopRightRadius: 4,
  },
  counselBubble: {
    backgroundColor: C.mootRedBubble,
    borderTopLeftRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
  },
  text: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 21,
  },
  counselText: {
    color: C.mootRedText,
  },
  time: {
    fontSize: 10,
    color: C.textMuted,
    marginHorizontal: 4,
  },
});
