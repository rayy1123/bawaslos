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
  listVoters,
  getVotersStats,
} from '@/lib/queries';
import AdminDashboard from './admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const pairs = await listPairs();
  const news = await listNews();
  const accounts = await listAccounts();
  const total = await totalVotes();
  const byAccount = await votesByAccount();
  const audit = await listAudit();
  const sb = await getScoreboardState();
  const rules = await getRules();
  const settings = await getSettings();
  const { voters } = await listVoters({ limit: 1000 });
  const votersStats = await getVotersStats();
  const votingOpen = await getVotingOpen();
  return (
    <AdminDashboard
      pairs={pairs}
      news={news}
      accounts={accounts}
      voters={voters}
      votersStats={votersStats}
      total={total}
      byAccount={byAccount}
      audit={audit}
      scoreboard={{ published: sb.published, revealed: sb.revealed, total: sb.total }}
      votingOpen={votingOpen}
      rules={{ headline: rules.headline, body: rules.body }}
      settings={{ org_name: settings.org_name, org_subtitle: settings.org_subtitle, logo_url: settings.logo_url, mascot_url: settings.mascot_url }}
    />
  );
}
