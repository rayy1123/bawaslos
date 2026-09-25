import Link from 'next/link';
import { listPairs, listAccounts, getSettings, getVotingOpen } from '@/lib/queries';
import { currentVoterAccount } from '@/lib/session';
import VoteClient from './vote-client';

export const dynamic = 'force-dynamic';

export default async function VotePage({
  searchParams,
}: {
  searchParams: { done?: string };
}) {
  const pairs = await listPairs(true);
  const accounts = await listAccounts();
  const voterAccount = await currentVoterAccount();
  const settings = await getSettings();
  const votingOpen = await getVotingOpen();
  const completedNo = searchParams.done ? Number(searchParams.done) : null;
  return (
    <VoteClient
      pairs={pairs}
      accounts={accounts}
      voterAccount={voterAccount}
      logoUrl={settings.logo_url}
      votingOpen={votingOpen}
      completedNo={completedNo}
    />
  );
}
