export const emptySchedule = () => Array.from({length: 7}, () => []);
export function scheduleOpen(schedule, moment = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Africa/Casablanca',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(moment).map(p=>[p.type,p.value]));
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday);
  const minute = Number(parts.hour)*60+Number(parts.minute);
  if (!Array.isArray(schedule) || schedule.length !== 7) return false;
  for (const offset of [0,1]) for(const period of schedule[(day-offset+7)%7] || []) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(period?.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(period?.end)) continue;
    const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3));
    const start = minutes(period.start), end = minutes(period.end);
    if (offset===0 && ((start<end && minute>=start && minute<end) || (start>end && minute>=start))) return true;
    if (offset===1 && start>end && minute<end) return true;
  }
  return false;
}
export const acceptingOrders = (restaurant, moment = new Date()) => restaurant.is_active && restaurant.is_open && (!restaurant.schedule_enabled || scheduleOpen(restaurant.weekly_schedule, moment));
export function scheduleLabel(schedule) {
  const days=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  return [1,2,3,4,5,6,0].map(day=>`${days[day]} : ${(schedule?.[day] || []).map(p=>`${p.start}–${p.end}`).join(', ') || 'fermé'}`).join(' · ');
}
