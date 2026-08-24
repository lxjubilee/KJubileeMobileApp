import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/common';
import { useAppDispatch, useAppSelector, setLimitReached } from '@/redux';

/**
 * Shows the "Daily Limit Reached" popup when a Free user has spent their daily
 * allowance and playback stops at the preview cap. Driven by
 * `entitlement.limitReached` (set by usePlaybackGate). Dismiss-only: a single
 * acknowledge button that clears the flag — it does not link to any purchase flow.
 */
export const PlaybackLimitGate: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const visible = useAppSelector((s) => s.entitlement.limitReached);

  if (!visible) return null;

  return (
    <ConfirmDialog
      visible
      title={t('playbackLimit.title')}
      message={t('playbackLimit.message')}
      confirmLabel={t('playbackLimit.ok')}
      onConfirm={() => dispatch(setLimitReached(false))}
    />
  );
};
