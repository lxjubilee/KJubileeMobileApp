import React from 'react';
import { LegalScreen } from './LegalScreen';
import { PRIVACY_POLICY } from './content';

export const PrivacyPolicyScreen: React.FC = () => <LegalScreen document={PRIVACY_POLICY} />;

export default PrivacyPolicyScreen;
