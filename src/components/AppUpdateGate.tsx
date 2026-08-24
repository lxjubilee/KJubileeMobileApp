import React, { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, ConfirmDialog } from '@/components/common';
import { checkForUpdate, type UpdateCheckResult } from '@/services/appUpdate';

/**
 * Shows the "update available" popup once the splash finishes. Runs the version
 * check a single time (per launch); renders nothing until/unless an update is
 * available. An OPTIONAL update shows Later + Update and can be dismissed for
 * the session; a MANDATORY update shows only Update and its non-dismissible
 * backdrop blocks the app behind it until the user updates.
 */
export const AppUpdateGate: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!enabled || checkedRef.current) return;
    checkedRef.current = true;
    let active = true;
    void checkForUpdate().then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  if (!result) return null;
  if (dismissed && !result.mandatory) return null;

  const openStore = () => {
    void Linking.openURL(result.storeUrl).catch(() => undefined);
  };

  return (
    <ConfirmDialog
      visible
      align="center"
      title={result.title || t(result.mandatory ? 'update.requiredTitle' : 'update.title')}
      message={result.message || t(result.mandatory ? 'update.requiredMessage' : 'update.message')}
      confirmLabel={t('update.update')}
      cancelLabel={result.mandatory ? undefined : t('update.later')}
      onConfirm={openStore}
      onCancel={result.mandatory ? undefined : () => setDismissed(true)}
    >
      <View style={styles.versions}>
        <AppText variant="bodySm" color="textMuted">
          {t('update.currentVersion')}: {result.currentVersion}
        </AppText>
        <AppText variant="bodySm" color="text" style={styles.latest}>
          {t('update.latestVersion')}: {result.latestVersion}
        </AppText>
      </View>
    </ConfirmDialog>
  );
};

const styles = StyleSheet.create({
  versions: { gap: 2 },
  latest: { marginTop: 2 },
});
