import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getPostLoginRedirectUrl } from '@/lib/post-login-redirect';

export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);
  redirect(await getPostLoginRedirectUrl(session));
}
