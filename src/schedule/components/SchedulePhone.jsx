// Crew Schedule at phone width (≤768px): the view switch, Week, Day, Person
// and the assign flow. Presentation only — every number, row, warning and
// save comes from views/Schedule.jsx. Plan: docs/plans/crew_mobile_preview.md.
import { useEffect, useRef } from 'react'
import { crewRowNames, crewRowStaffing, crewCardRows } from '../lib/crewScheduleRows'
import { tripRange } from '../lib/trips'
import { crewStatusShortLabel, crewStatusUiLabel, formatScheduledOffRange, CREW_STATUS_SCHEDULED_OFF } from '../lib/crewStatus'
import { canTakeCrew, tripLabel, rowHasDayCell, staffingLine, reviewChange } from '../lib/schedulePhone'
import './SchedulePhone.css'

function flipName(n) {
  if (!n) return ''
  const p = n.split(',')
  return p.length === 2 ? p[1].trim() + ' ' + p[0].trim() : n
}

const dayText = day => `${day.long} ${day.date.split('-')[1]}/${day.date.split('-')[2]}`

const PHONE_VIEWS = [['week', 'Week'], ['day', 'Day'], ['person', 'Person'], ['board', 'Board']]

export function SchedulePhoneSwitch({ view, onChange }) {
  return (
    <div className="sch-ph-switch" role="group" aria-label="Schedule view">
      {PHONE_VIEWS.map(([key, label]) => (
        <button key={key} type="button" className={`sch-ph-tab${view === key ? ' sch-ph-tab-on' : ''}`}
          aria-pressed={view === key} onClick={() => onChange(key)}>{label}</button>
      ))}
    </div>
  )
}

// One entry per day: the capacity strip's numbers for that day and the three counts.
export function SchedulePhoneWeek({ days, capacity, counts, todayStr, hasTrips, onOpenDay }) {
  return (
    <div className="sch-ph-week">
      {!hasTrips && <div className="sch-ph-empty">No jobs this week</div>}
      {days.map((day, i) => {
        const cap = capacity[i], c = counts[i]
        return (
          <button key={day.date} type="button" className={`sch-ph-wday${day.date === todayStr ? ' sch-ph-wday-today' : ''}`}
            data-date={day.date} onClick={() => onOpenDay(day.date)}>
            <span className="sch-ph-wday-head">
              <span className="sch-ph-wday-name">{dayText(day)}</span>
              {day.date === todayStr && <span className="sch-ph-today">Today</span>}
            </span>
            <span className="sch-ph-wday-nums">
              <span data-num="assigned">{cap.assigned} / {cap.avail} assigned</span>
              <span data-num="free">{cap.free} free</span>
              <span data-num="out">{cap.out} out</span>
            </span>
            <span className="sch-ph-wday-counts">
              <span data-count="short" className={c.short ? 'sch-ph-flag' : undefined}>Short {c.short}</span>
              <span data-count="unknown" className={c.unknown ? 'sch-ph-flag' : undefined}>Unknown need {c.unknown}</span>
              <span data-count="double" className={c.doubleBooked ? 'sch-ph-flag' : undefined}>Double-booked {c.doubleBooked}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Job/trip cards for one day, in board order, then that day's Free and Out lists.
export function SchedulePhoneDay({ days, date, rows, detail, todayStr, hasTrips, isDoubleBooked, onPickDay, onAssign, onPerson }) {
  const cards = rows.filter(row => rowHasDayCell(row, date))
  return (
    <div className="sch-ph-day">
      <div className="sch-ph-days" role="group" aria-label="Day">
        {days.map(day => (
          <button key={day.date} type="button" className={`sch-ph-daybtn${day.date === date ? ' sch-ph-tab-on' : ''}${day.date === todayStr ? ' sch-ph-daybtn-today' : ''}`}
            aria-pressed={day.date === date} data-date={day.date} onClick={() => onPickDay(day.date)}>
            <span>{day.long}</span><small>{day.date.split('-')[1]}/{day.date.split('-')[2]}</small>
          </button>
        ))}
      </div>
      {!hasTrips && <div className="sch-ph-empty">No jobs this week</div>}
      {hasTrips && cards.length === 0 && <div className="sch-ph-empty">No trips on this day</div>}
      {cards.map(row => {
        const editable = canTakeCrew(row)
        const names = crewRowNames(row, date)
        const leads = crewRowStaffing(row, date).leads
        const need = staffingLine(row, date)
        return (
          <section key={row.key} className="sch-ph-card" data-row={row.key} data-trip={row.trip.id || (row.unavailable ? 'unavailable' : 'unidentified')}>
            <div className="sch-ph-card-job">{row.job.job_num} - {row.job.job_name}</div>
            <div className="sch-ph-card-trip"><strong>{tripLabel(row.trip)}</strong> <small>{tripRange(row.trip)}</small></div>
            {row.issue && <div className="sch-ph-issue" role="note">⚠ {row.issue}</div>}
            {leads.length > 0 && <div className="sch-ph-card-lead">{leads.length > 1 ? 'Leads' : 'Lead'}: {leads.map(flipName).join(', ')}</div>}
            {need && <div className="sch-ph-need">{need}</div>}
            <div className="sch-ph-people">
              {names.length === 0 && <span className="sch-ph-muted">No crew this day</span>}
              {names.map(name => {
                const inner = <>{flipName(name)}{isDoubleBooked(name, date) && <span className="sch-db-tag">2X</span>}</>
                return editable
                  ? <button key={name} type="button" className="sch-ph-person" data-person={name} onClick={e => onPerson(row, name, e.currentTarget)}>{inner}</button>
                  : <span key={name} className="sch-ph-person sch-ph-person-ro" data-person={name}>{inner}</span>
              })}
            </div>
            {editable && <button type="button" className="sch-ph-action" onClick={e => onAssign(row, e.currentTarget)}>Assign</button>}
          </section>
        )
      })}
      <div className="sch-ph-lists">
        <div className="sch-ph-list" data-list="free">
          <div className="sch-ph-list-head">Free ({detail.available.length})</div>
          {detail.available.map(c => <div key={c.name} className="sch-ph-list-row">{flipName(c.name)}</div>)}
        </div>
        <div className="sch-ph-list" data-list="out">
          <div className="sch-ph-list-head">Out ({detail.out.length})</div>
          {detail.out.map(c => <div key={c.name} className="sch-ph-list-row">{flipName(c.name)} <span className="sch-ph-muted">({crewStatusUiLabel(c.status)})</span></div>)}
        </div>
      </div>
    </div>
  )
}

// One person's week: a status per day, one line per trip, Scheduled Off ranges,
// and the status actions the desktop chip offers for that person.
export function SchedulePhonePerson({ person, days, rows, statusOf, outAllWeek, soffRanges, onBack, onTrip, onStatus, onEditSoff, onRemoveSoff }) {
  const name = person.name
  const lines = crewCardRows(rows, name)
  return (
    <div className="sch-ph-pdetail" data-person={name}>
      <button type="button" className="sch-ph-back" onClick={onBack}>‹ Crew list</button>
      <div className="sch-ph-pname">{flipName(name)}</div>
      <div className="sch-ph-muted">
        Team: {person.team || '—'}
        {person.phone && <>{' · '}<a className="sch-ph-tel" href={'tel:' + person.phone}>{person.phone}</a></>}
      </div>
      <div className="sch-ph-pstatus" role="list" aria-label="Status by day">
        {days.map(day => {
          const st = statusOf(name, day.date)
          return (
            <div key={day.date} role="listitem" className={`sch-ph-pday${st === 'available' ? '' : ' sch-ph-pday-out'}`} data-date={day.date}>
              <span>{day.long}</span><small>{day.date.split('-')[2]}</small>
              <strong>{crewStatusShortLabel(st)}</strong>
            </div>
          )
        })}
      </div>
      <div className="sch-ph-section">Trips this week</div>
      {lines.length === 0 && <div className="sch-ph-muted">No assignments</div>}
      {lines.map(row => {
        const text = <>
          <span className="sch-ph-line-job">{row.issue ? '⚠ ' : ''}{row.job.job_num} · {tripLabel(row.trip)}</span>
          <span className="sch-ph-line-days">{days.filter(day => row.dates.includes(day.date)).map(day => day.long).join(', ')}</span>
        </>
        return canTakeCrew(row)
          ? <button key={row.key} type="button" className="sch-ph-line" data-row={row.key} data-trip={row.trip.id} onClick={e => onTrip(row, name, e.currentTarget)}>{text}</button>
          : <div key={row.key} className="sch-ph-line sch-ph-line-ro" data-row={row.key} data-trip={row.unavailable ? 'unavailable' : 'unidentified'}>{text}</div>
      })}
      {soffRanges.length > 0 && <>
        <div className="sch-ph-section">Scheduled Off</div>
        {soffRanges.map(range => (
          <div key={`${range.from}|${range.to}`} className="sch-ph-soff">
            <div>{formatScheduledOffRange(range.from, range.to)}</div>
            <div className="sch-ph-row">
              <button type="button" className="sch-ph-action" onClick={() => onEditSoff(name, range)}>Edit Dates</button>
              <button type="button" className="sch-ph-action" onClick={() => onRemoveSoff(name, range)}>Remove Scheduled Off</button>
            </div>
          </div>
        ))}
      </>}
      <div className="sch-ph-section">Mark out</div>
      <div className="sch-ph-row" data-status-actions>
        {!outAllWeek && <>
          <button type="button" className="sch-ph-action" onClick={() => onStatus(name, 'sick')}>Sick</button>
          <button type="button" className="sch-ph-action" onClick={() => onStatus(name, 'off')}>Call In</button>
          <button type="button" className="sch-ph-action" onClick={() => onStatus(name, 'noshow')}>No Show</button>
        </>}
        <button type="button" className="sch-ph-action" onClick={() => onStatus(name, CREW_STATUS_SCHEDULED_OFF)}>Scheduled Off</button>
      </div>
    </div>
  )
}

// The modal assign flow: person → days → review → save. It holds no data of
// its own beyond the draft; Review is recomputed from the row as it is now.
export function ScheduleAssignFlow({ draft, row, days, groups, busy, isOutAllWeek, dayNote, assignable, onPerson, onToggleDay, onToggleAll, onStep, onSave, onClose }) {
  const box = useRef(null)
  useEffect(() => { box.current?.focus() }, [draft.step])
  const close = () => { if (!busy) onClose() }
  const name = draft.name
  const head = row && <div className="sch-ph-flow-trip">
    <strong>{row.job.job_num} — {tripLabel(row.trip)}</strong>
    <small>{tripRange(row.trip)}</small>
  </div>
  let body
  if (!row) {
    body = <>
      <p className="sch-ph-flow-msg" role="alert">This trip has changed. Close the picker and try again.</p>
      <div className="sch-ph-flow-actions"><button type="button" className="sch-ph-action" onClick={close}>Close</button></div>
    </>
  } else if (draft.step === 'person') {
    const onTrip = crewRowNames(row)
    const list = people => people.map(c => {
      const out = isOutAllWeek(c.name)
      return (
        <button key={c.name} type="button" className="sch-ph-pick" disabled={out} data-person={c.name} onClick={() => onPerson(c.name)}>
          <span>{flipName(c.name)}</span>
          {onTrip.includes(c.name) && <span className="sch-ph-mark">On this trip</span>}
          {out && <span className="sch-ph-muted">Out all week</span>}
        </button>
      )
    })
    body = <>
      <div className="sch-ph-flow-step">Choose a person</div>
      <div className="sch-ph-flow-scroll">
        {groups.teamKeys.map(tk => <div key={tk}><div className="sch-tlbl">Team {tk}</div>{list(groups.teams[tk])}</div>)}
        {groups.floaters.length > 0 && <div><div className="sch-tlbl">Floaters</div>{list(groups.floaters)}</div>}
      </div>
      <div className="sch-ph-flow-actions"><button type="button" className="sch-ph-action" onClick={close}>Cancel</button></div>
    </>
  } else if (draft.step === 'days') {
    const all = assignable(row, name)
    const allOn = all.length > 0 && all.every(d => draft.days.includes(d))
    body = <>
      <div className="sch-ph-flow-step">
        <span>Days for {flipName(name)}</span>
        {all.length > 1 && <button type="button" className="sch-ph-action" onClick={() => onToggleAll(all)}>{allOn ? 'Clear all' : `Select all ${all.length}`}</button>}
      </div>
      <div className="sch-ph-flow-scroll">
        {days.map(day => {
          const note = dayNote(row, name, day.date)
          const on = draft.days.includes(day.date)
          return (
            <button key={day.date} type="button" className={`sch-ph-dayrow${on ? ' sch-ph-dayrow-on' : ''}${note.warning ? ' sch-ph-dayrow-warn' : ''}`}
              disabled={!note.inRange} aria-pressed={on} data-date={day.date} onClick={() => onToggleDay(day.date)}>
              <span className="sch-ph-dayrow-name">{dayText(day)}</span>
              {!note.inRange && <span className="sch-ph-muted">Outside this trip</span>}
              {note.inRange && note.warning && <span className="sch-ph-warn">{note.warning}</span>}
            </button>
          )
        })}
      </div>
      <div className="sch-ph-flow-actions">
        {!draft.fromPerson && <button type="button" className="sch-ph-action" onClick={() => onStep('person')}>Back</button>}
        <button type="button" className="sch-ph-action" onClick={close}>Cancel</button>
        <button type="button" className="sch-ph-action sch-ph-primary" onClick={() => onStep('review')}>Review</button>
      </div>
    </>
  } else {
    const change = reviewChange(row, name, draft.days)
    const label = date => { const day = days.find(d => d.date === date); return day ? dayText(day) : date }
    const warnings = [...draft.days].sort().map(date => ({ date, text: dayNote(row, name, date).warning })).filter(w => w.text)
    const none = !change.add.length && !change.remove.length
    const removesAll = change.current.length > 0 && change.remove.length === change.current.length && !change.add.length
    body = <>
      <div className="sch-ph-flow-step">Review</div>
      <div className="sch-ph-flow-scroll" data-review>
        <div className="sch-ph-rv"><span>Person</span><strong>{flipName(name)}</strong></div>
        <div className="sch-ph-rv" data-rv="current"><span>On this trip now</span><strong>{change.current.length ? change.current.map(label).join(', ') : 'No days'}</strong></div>
        <div className="sch-ph-rv" data-rv="add"><span>Add</span><strong>{change.add.length ? change.add.map(label).join(', ') : 'Nothing'}</strong></div>
        <div className="sch-ph-rv" data-rv="remove"><span>Remove</span><strong>{change.remove.length ? change.remove.map(label).join(', ') : 'Nothing'}</strong></div>
        {removesAll && <p className="sch-ph-flow-msg">This removes {flipName(name)} from this trip for this week.</p>}
        {none && <p className="sch-ph-flow-msg" data-rv="nochange">No change. Saving writes nothing.</p>}
        {warnings.map(w => <p key={w.date} className="sch-ph-warn" data-rv="warning">⚠ {label(w.date)}: {w.text}</p>)}
        {draft.failed && <p className="sch-ph-flow-msg" role="alert" data-rv="failed">Not saved. This shows what is on the trip now and what is still to do.</p>}
      </div>
      <div className="sch-ph-flow-actions">
        <button type="button" className="sch-ph-action" disabled={busy} onClick={() => onStep('days')}>Back</button>
        <button type="button" className="sch-ph-action" disabled={busy} onClick={close}>Cancel</button>
        <button type="button" className="sch-ph-action sch-ph-primary" disabled={busy} onClick={onSave}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </>
  }
  return (
    <div className="sch-ph-flow-overlay" onKeyDown={e => { if (e.key === 'Escape') close() }}>
      <div className="sch-ph-flow" role="dialog" aria-modal="true" aria-label="Assign crew" tabIndex={-1} ref={box}>
        <div className="sch-ph-flow-head">
          <div className="sch-ph-flow-title">Assign crew</div>
          <button type="button" className="sch-ph-close" aria-label="Close" disabled={busy} onClick={close}>✕</button>
        </div>
        {head}
        {body}
      </div>
    </div>
  )
}
