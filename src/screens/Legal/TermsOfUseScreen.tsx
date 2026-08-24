import React from 'react';
import { LegalScreen } from './LegalScreen';
import { TERMS_OF_USE } from './content';

export const TermsOfUseScreen: React.FC = () => <LegalScreen document={TERMS_OF_USE} />;

export default TermsOfUseScreen;
