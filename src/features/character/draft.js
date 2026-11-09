

function resetDraft() {
  Object.assign(draft, {
    p1AvailablePoints: 5,
    p1SelectedParty: 'IND',
    p1SelectedFaction: 'Ciudadano Independiente',
    p1Attributes: { oratory: 60, charisma: 55, negotiation: 50, management: 55 },
    p2SelectedPolicies: ['p1', 'p4', 'p9'],
  });
}

const draft = {};
resetDraft();

export { resetDraft, draft };
