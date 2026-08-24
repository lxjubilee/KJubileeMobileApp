import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry' | 'style'> {
  /** Box style override (margins, border color) applied to the field container. */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Password field with a trailing show/hide eye toggle. Manages its own
 * visibility state; everything else (value, handlers, placeholder, return key)
 * is forwarded to the underlying TextInput.
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({ containerStyle, ...rest }) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...rest}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={rest.placeholderTextColor ?? '#8A8A99'}
        style={styles.input}
      />
      <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} style={styles.eye}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#8A8A99" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, height: '100%', color: '#FFFFFF', fontSize: 16 },
  eye: { paddingLeft: 12 },
});
