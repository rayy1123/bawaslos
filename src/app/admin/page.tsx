import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import {
  listPairs,
  listNews,
  listAccounts,
  totalVotes,
  votesByAccount,
  listAudit,
  getScoreboardState,
  getVotingOpen,
  getSettings,
  getRules,
} from '@/lib/queries';
import AdminDashboard from './admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const pairs = listPairs();
  const news = listNews();
  const accounts = listAccounts();
  const total = totalVotes();
  const byAccount = votesByAccount();
  const audit = listAudit();
  const sb = getScoreboardState();
  const rules = getRules();
  const settings = getSettings();
  return (
    <AdminDashboard
      pairs={pairs}
      news={news}
      accounts={accounts}
      total={total}
      byAccount={byAccount}
      audit={audit}
      scoreboard={{ published: sb.published, revealed: sb.revealed, total: sb.total }}
      votingOpen={getVotingOpen()}
      rules={{ headline: rules.headline, body: rules.body }}
      settings={{ org_name: settings.org_name, org_subtitle: settings.org_subtitle, logo_url: settings.logo_url, mascot_url: settings.mascot_url }}
    />
  );
}
