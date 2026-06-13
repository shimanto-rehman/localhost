import type { Metadata } from 'next';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Sign In or Register — ${SITE_NAME}`,
  description: `Sign in to your ${SITE_NAME} apartment or register a new one to start splitting bills fairly.`,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthLanding />;
}
