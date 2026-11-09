const WEEKLY_FUNDS = {
  concejal: 350_000, alcalde: 500_000, core: 500_000, diputado: 650_000,
  gobernador: 750_000, senador: 750_000, presidente: 1_000_000,
};

export const campaignAllowance = office => WEEKLY_FUNDS[office] || 0;

export function grantCampaignWeek(election, week) {
  const amount = campaignAllowance(election?.office);
  if (!amount || election.result || (election.campaignGrantWeek ?? 0) >= week) return 0;
  election.campaignGrantWeek = week;
  election.campaignFunds = (election.campaignFunds ?? 0) + amount;
  return amount;
}

export function campaignPayment(election, costs, payGeneral) {
  const funds = costs.funds ?? 0;
  const restricted = Math.min(election?.campaignFunds ?? 0, funds);
  if (!payGeneral({ ...costs, funds: funds - restricted })) return false;
  if (restricted) election.campaignFunds -= restricted;
  return true;
}
