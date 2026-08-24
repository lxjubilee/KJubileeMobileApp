import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface AuthLinkRowProps {
  /**
   * Where the row sits relative to the submit button. A row above the button
   * tucks up under the field it belongs to; a row below needs positive spacing
   * or it overlaps the button (the bug web commit fe80764 fixed).
   */
  placement?: 'aboveSubmit' | 'belowSubmit';
  align?: 'left' | 'right' | 'between';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Layout wrapper for the link rows that flank the submit button. */
export const AuthLinkRow: React.FC<AuthLinkRowProps> = ({
  placement = 'aboveSubmit',
  align = 'right',
  style,
  children,
}) => (
  <View
    style={[
      styles.row,
      placement === 'aboveSubmit' ? styles.above : styles.below,
      align === 'left' && styles.left,
      align === 'right' && styles.right,
      align === 'between' && styles.between,
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  above: { marginTop: 10, marginBottom: 4 },
  below: { marginTop: 18 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  between: { justifyContent: 'space-between' },
});
