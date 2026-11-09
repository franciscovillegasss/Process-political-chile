import { refreshCampaign } from '../../app/render.js';
import { GAME_STATE } from '../../app/state.js';
import { LOCAL_REGISTRATION } from '../elections/rules.js';
import { STAFF_CATALOG } from './staff-catalog.js';
import { clp, showToast, warn } from '../../shared/dom.js';

let currentStaffRoleFilter = 'all';

const filterStaffRole = function(role) {
  currentStaffRoleFilter = role;
  document.querySelectorAll('.staff-role-filter').forEach(btn => {
    btn.className = 'staff-role-filter px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer';
  });
  const activeBtn = document.getElementById(`staff-tab-${role}`);
  if (activeBtn) {
    activeBtn.className = 'staff-role-filter px-2.5 py-1 rounded bg-[#0047AB] text-white font-bold text-xs cursor-pointer';
  }
  renderStaffPanel();
};

function staffTotals() {
  const totals = {
    salaryWeekly: 0, bonusHours: 0, bonusRecogWeekly: 0, bonusVolunteersWeekly: 0, bonusPPMonthly: 0,
    fundraisingBonus: 0, pollAccuracy: 0, advertisingBonus: 0, territorialDiscount: 0, registrationDiscount: 0,
  };
  for (const staff of STAFF_CATALOG) {
    if (GAME_STATE.player.hiredStaffIds.includes(staff.id)) {
      for (const key of Object.keys(totals)) totals[key] += staff[key] || 0;
    }
  }
  return totals;
}

function registrationCost() {
  return Math.round(LOCAL_REGISTRATION.funds * (1 - staffTotals().registrationDiscount));
}

function updateStaffHours() {
  const player = GAME_STATE.player;
  player.maxHours = 60 + staffTotals().bonusHours;
  player.hours = Math.min(player.hours, player.maxHours);
}

const hireStaff = function(staffId) {
  const staff = STAFF_CATALOG.find(s => s.id === staffId);
  if (!staff) return;

  const player = GAME_STATE.player;
  const existing = STAFF_CATALOG.find(item => item.role === staff.role && player.hiredStaffIds.includes(item.id));
  if (existing?.id === staff.id) return;
  const payroll = staffTotals().salaryWeekly - (existing?.salaryWeekly || 0) + staff.salaryWeekly;
  if (player.funds < payroll) return warn(`La planilla completa costaría ${clp(payroll)} por semana.`);
  if (existing) player.hiredStaffIds = player.hiredStaffIds.filter(id => id !== existing.id);

  if (!GAME_STATE.player.hiredStaffIds.includes(staff.id)) {
    GAME_STATE.player.hiredStaffIds.push(staff.id);
  }

  // Recalcular horas máximas
  updateStaffHours();

  const change = existing ? ` Reemplaza a ${existing.name}.` : '';
  showToast('Asesor incorporado', `${staff.name} se sumó al comando como ${staff.roleLabel}.${change}`, 'success');
  refreshCampaign();
  renderStaffPanel();
};

const fireStaff = function(staffId) {
  const staff = STAFF_CATALOG.find(s => s.id === staffId);
  if (!staff) return;

  GAME_STATE.player.hiredStaffIds = (GAME_STATE.player.hiredStaffIds || []).filter(id => id !== staffId);

  // Recalcular horas máximas
  updateStaffHours();

  showToast('Contrato Concluido', `Has desvinculado a ${staff.name} del comando de campaña.`, 'info');
  refreshCampaign();
  renderStaffPanel();
};

const renderStaffPanel = function() {
  const container = document.getElementById('staff-hire-container');
  if (!container) return;
  container.innerHTML = '';

  const hiredIds = GAME_STATE.player.hiredStaffIds || [];

  // Actualizar métricas del dashboard superior
  const { salaryWeekly: totalPayroll, bonusHours: totalBonusHours, bonusRecogWeekly: totalBonusRecog, bonusVolunteersWeekly: totalBonusVolunteers } = staffTotals();

  const badgeEl = document.getElementById('staff-summary-badge');
  if (badgeEl) badgeEl.textContent = `${hiredIds.length} / 4 Cargos Cubiertos`;

  const pEl = document.getElementById('staff-metric-payroll');
  if (pEl) pEl.textContent = `$${totalPayroll.toLocaleString('es-CL')} CLP / sem`;

  const hEl = document.getElementById('staff-metric-hours');
  if (hEl) hEl.textContent = `+${totalBonusHours} hrs / sem (${60 + totalBonusHours} hrs tot)`;

  const rEl = document.getElementById('staff-metric-recog');
  if (rEl) rEl.textContent = `+${totalBonusRecog.toFixed(1)}% / sem`;

  const vEl = document.getElementById('staff-metric-volunteers');
  if (vEl) vEl.textContent = `+${totalBonusVolunteers} brigadistas / sem`;

  // Filtrar catálogo según la categoría seleccionada
  const visibleStaff = (currentStaffRoleFilter === 'all')
    ? STAFF_CATALOG
    : STAFF_CATALOG.filter(s => s.role === currentStaffRoleFilter);

  visibleStaff.forEach(staff => {
    const isHired = hiredIds.includes(staff.id);
    const card = document.createElement('div');
    card.className = `p-3.5 border-2 rounded shadow-2xs flex flex-col justify-between transition ${isHired ? 'bg-emerald-50/70 border-emerald-500' : 'bg-white border-stone-300 hover:border-stone-400'}`;

    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${staff.avatar}</span>
            <div>
              <h4 class="font-extrabold text-xs text-slate-900">${staff.name}</h4>
              <span class="text-[10px] font-mono font-bold text-stone-600 block">${staff.roleIcon} ${staff.roleLabel}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isHired ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 border border-stone-300'}">
            ${isHired ? '✓ CONTRATADO' : 'DISPONIBLE'}
          </span>
        </div>

        <div>
          <strong class="text-[11px] text-blue-950 block">${staff.title}</strong>
          <p class="text-[11px] text-stone-600 leading-snug">${staff.exp}</p>
        </div>

        <div class="p-2 bg-stone-50 rounded border border-stone-200 text-xs font-mono space-y-1">
          <div class="flex justify-between">
            <span class="text-stone-500 font-sans text-[11px]">Sueldo Semanal:</span>
            <strong class="text-slate-900 font-mono-num font-bold">$${staff.salaryWeekly.toLocaleString('es-CL')} CLP</strong>
          </div>
          <div class="text-[11px] font-sans font-bold text-emerald-800">
            🎁 Bonos: <span class="font-normal font-sans text-slate-800">${staff.perkDesc}</span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t mt-3 flex justify-end">
        ${isHired ? `
          <button onclick="window.fireStaff('${staff.id}')" class="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded cursor-pointer transition">
            ✕ Desvincular del Comando
          </button>
        ` : `
          <button onclick="window.hireStaff('${staff.id}')" class="w-full py-1.5 bg-[#0047AB] hover:bg-[#003399] active:bg-[#002277] text-white font-bold text-xs rounded shadow-2xs cursor-pointer transition flex items-center justify-center gap-1.5">
            <span>Contratar por $${staff.salaryWeekly.toLocaleString('es-CL')}/sem</span>
          </button>
        `}
      </div>
    `;

    container.appendChild(card);
  });
};

export { filterStaffRole, staffTotals, registrationCost, hireStaff, fireStaff, renderStaffPanel };
