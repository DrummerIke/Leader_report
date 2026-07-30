import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Check, ChevronDown, CirclePlus, Download, FileSpreadsheet, LayoutDashboard, LoaderCircle, Plus, Save, Trash2, UserRound } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from './lib/supabase'
import type { Case, Employee, Factor, Report, Reward } from './types'

const emptyCase = (): Case => ({ order_number: '', order_amount: '', personal_consultant: '', client_name: '', segment: '', phone: '', situation: '' })
const emptyFactor = (type: Factor['type']): Factor => ({ type, description: '', suggested_by: '' })
const emptyReward = (): Reward => ({ employee_name: '', reward_reason: '', reward_date: '', penalty_reason: '', penalty_date: '' })
const monthNow = new Date().toISOString().slice(0, 7)
export default function App() {
  const [page, setPage] = useState<'form' | 'admin'>('form')
  const [leaders, setLeaders] = useState<Employee[]>([])
  const [leaderId, setLeaderId] = useState('')
  const [month, setMonth] = useState(monthNow)
  const [cases, setCases] = useState<Case[]>([emptyCase()])
  const [factors, setFactors] = useState<Factor[]>([emptyFactor('growth'), emptyFactor('negative')])
  const [rewards, setRewards] = useState<Reward[]>([emptyReward()])
  const [reports, setReports] = useState<Report[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const leader = leaders.find((item) => item.id === leaderId)
  const completed = [leaderId, month, cases.some((item) => item.order_number && item.situation)].filter(Boolean).length

  useEffect(() => {
    async function loadLeaders() {
      if (!supabase) { setNotice('Подключение к Supabase не настроено. Обратитесь к администратору.'); return }
      const { data, error } = await supabase
        .from('employees')
        .select('id,name,Position')
        .eq('Position', 'Leader')
        .order('name')
      if (error || !data) { setNotice('Не удалось загрузить сотрудников'); return }
      setLeaders(data.map((row) => ({ id: String(row.id), name: String(row.name) })))
    }
    loadLeaders()
  }, [])

  useEffect(() => {
    async function loadExisting() {
      if (!supabase || !leaderId || !month) return
      const { data } = await supabase.from('leader_reports').select('*').eq('leader_id', leaderId).eq('report_month', `${month}-01`).maybeSingle()
      if (data) { setCases(data.cases?.length ? data.cases : [emptyCase()]); setFactors(data.factors?.length ? data.factors : [emptyFactor('growth'), emptyFactor('negative')]); setRewards(data.rewards?.length ? data.rewards : [emptyReward()]); setNotice('Сохранённый отчёт загружен') }
      else { setCases([emptyCase()]); setFactors([emptyFactor('growth'), emptyFactor('negative')]); setRewards([emptyReward()]) }
    }
    loadExisting()
  }, [leaderId, month])

  const updateCase = (index: number, key: keyof Case, value: string) => setCases((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const updateFactor = (index: number, key: keyof Factor, value: string) => setFactors((items) => items.map((item, i) => i === index ? { ...item, [key]: value } as Factor : item))
  const updateReward = (index: number, key: keyof Reward, value: string) => setRewards((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item))

  async function save() {
    if (!leader || !month || !cases.some((item) => item.order_number && item.situation)) { setNotice('Выберите лидера и заполните хотя бы один кейс'); return }
    setSaving(true)
    const report: Report = { leader_id: leader.id, leader_name: leader.name, report_month: `${month}-01`, cases, factors, rewards }
    if (!supabase) { setNotice('Нет подключения к Supabase. Отчёт не сохранён.'); setSaving(false); return }
    const { error } = await supabase.from('leader_reports').upsert(report, { onConflict: 'leader_id,report_month' })
    setNotice(error ? `Ошибка: ${error.message}` : 'Отчёт успешно сохранён')
    setSaving(false)
  }

  async function openAdmin() {
    setPage('admin')
    if (!supabase) { setNotice('Нет подключения к Supabase'); return }
    const { data, error } = await supabase.from('leader_reports').select('*').order('report_month', { ascending: false })
    if (error) setNotice(`Ошибка: ${error.message}`); else setReports((data || []) as Report[])
  }

  function exportXlsx() {
    const factorRows = reports.flatMap((r) => r.factors.map((f) => ({ 'Месяц': r.report_month.slice(0, 7), 'Лидер': r.leader_name, 'Тип': f.type === 'growth' ? 'Фактор роста' : 'Отрицательный фактор', 'Описание': f.description, 'Кто предложил': f.suggested_by })))
    const caseRows = reports.flatMap((r) => r.cases.map((c) => ({ 'Месяц': r.report_month.slice(0, 7), 'Лидер': r.leader_name, 'Номер заказа': c.order_number, 'Сумма': c.order_amount, 'ПК': c.personal_consultant, 'Клиент': c.client_name, 'Сегмент': c.segment, 'Телефон': c.phone, 'Описание ситуации': c.situation })))
    const rewardRows = reports.flatMap((r) => r.rewards.map((x) => ({ 'Месяц': r.report_month.slice(0, 7), 'Лидер': r.leader_name, 'Сотрудник': x.employee_name, 'Премия за что': x.reward_reason, 'Дата премии': x.reward_date, 'Штраф за что': x.penalty_reason, 'Дата штрафа': x.penalty_date })))
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(caseRows), 'Кейсы')
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(factorRows), 'Факторы')
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rewardRows), 'Премии и штрафы')
    XLSX.writeFile(book, `Отчёт_лидеров_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const monthLabel = useMemo(() => new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' }).format(new Date(`${month}-02`)), [month])

  return <div className="app-shell">
    <aside>
      <div className="brand"><div className="brand-mark"><BarChart3 size={22}/></div><div><b>Leader</b><span>Reports</span></div></div>
      <nav><button className={page === 'form' ? 'active' : ''} onClick={() => setPage('form')}><LayoutDashboard size={19}/> Новый отчёт</button><button className={page === 'admin' ? 'active' : ''} onClick={openAdmin}><FileSpreadsheet size={19}/> Все отчёты</button></nav>
      <div className="aside-card"><div className="aside-icon"><Check size={17}/></div><b>Ежемесячный отчёт</b><p>Заполните результаты команды до 5 числа следующего месяца.</p></div>
      <div className="aside-footer"><div className="avatar">АД</div><div><b>Администратор</b><span>Панель управления</span></div></div>
    </aside>
    <main>
      <header><div><p className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</p><h1>{page === 'form' ? 'Отчёт лидера' : 'Все отчёты'}</h1></div><span className={`live-badge ${supabase ? '' : 'offline'}`}><i/> {supabase ? 'РАБОЧИЙ РЕЖИМ' : 'НЕТ ПОДКЛЮЧЕНИЯ'}</span></header>
      {notice && <div className="notice" onClick={() => setNotice('')}><Check size={17}/>{notice}</div>}
      {page === 'form' ? <>
        <section className="intro"><div><h2>Добрый день!</h2><p>Расскажите о результатах команды за выбранный месяц. Все поля можно сохранить и вернуться к ним позже.</p></div><div className="progress"><span>{completed} из 3</span><div><i style={{width: `${completed / 3 * 100}%`}}/></div><small>Основные шаги</small></div></section>
        <section className="card setup"><div className="section-heading"><span>01</span><div><h3>Основная информация</h3><p>Выберите себя и отчётный период</p></div></div><div className="two-cols"><label>Лидер<div className="select-wrap"><UserRound size={18}/><select value={leaderId} onChange={(e) => setLeaderId(e.target.value)}><option value="">Выберите себя из списка</option>{leaders.map((l) => <option value={l.id} key={l.id}>{l.name}</option>)}</select><ChevronDown size={16}/></div></label><label>Отчётный месяц<div className="input-icon"><CalendarDays size={18}/><input type="month" value={month} onChange={(e) => setMonth(e.target.value)}/></div></label></div></section>
        <section className="card"><div className="section-row"><div className="section-heading"><span>02</span><div><h3>Кейсы клиентов</h3><p>Добавьте минимум один показательный кейс</p></div></div><button className="outline" onClick={() => setCases([...cases, emptyCase()])}><Plus size={17}/> Добавить кейс</button></div>{cases.map((item, index) => <div className="case" key={index}><div className="case-title"><b>Кейс {index + 1}</b>{cases.length > 1 && <button className="icon-btn" onClick={() => setCases(cases.filter((_, i) => i !== index))}><Trash2 size={17}/></button>}</div><div className="grid3"><Field label="Номер заказа *" value={item.order_number} onChange={(v) => updateCase(index, 'order_number', v)} placeholder="Например, 1156476725"/><Field label="Сумма заказа" value={item.order_amount} onChange={(v) => updateCase(index, 'order_amount', v)} placeholder="₽"/><Field label="Персональный консультант" value={item.personal_consultant} onChange={(v) => updateCase(index, 'personal_consultant', v)} placeholder="ФИО сотрудника"/><Field label="Имя клиента" value={item.client_name} onChange={(v) => updateCase(index, 'client_name', v)} placeholder="Имя"/><Field label="Сегмент" value={item.segment} onChange={(v) => updateCase(index, 'segment', v)} placeholder="Например, Premium"/><Field label="Телефон" value={item.phone} onChange={(v) => updateCase(index, 'phone', v)} placeholder="+7 000 000-00-00"/></div><label>Описание ситуации *<textarea value={item.situation} onChange={(e) => updateCase(index, 'situation', e.target.value)} placeholder="Опишите ситуацию, действия сотрудника и полученный результат..."/><small>{item.situation.length} символов</small></label></div>)}</section>
        <section className="card"><div className="section-heading"><span>03</span><div><h3>Факторы месяца</h3><p>Что помогло расти и что помешало результату</p></div></div>{(['growth', 'negative'] as const).map((type) => <div className="factor-block" key={type}><div className={`factor-label ${type}`}><CirclePlus size={17}/>{type === 'growth' ? 'Факторы роста' : 'Отрицательные факторы'}</div>{factors.map((f, i) => f.type === type && <div className="factor-row" key={i}><textarea value={f.description} onChange={(e) => updateFactor(i, 'description', e.target.value)} placeholder={type === 'growth' ? 'Что положительно повлияло на результат?' : 'Что помешало достичь цели?'}/><input value={f.suggested_by} onChange={(e) => updateFactor(i, 'suggested_by', e.target.value)} placeholder="Кто предложил"/><button className="icon-btn" onClick={() => setFactors(factors.filter((_, x) => x !== i))}><Trash2 size={16}/></button></div>)}<button className="text-button" onClick={() => setFactors([...factors, emptyFactor(type)])}><Plus size={16}/> Добавить фактор</button></div>)}</section>
        <section className="card"><div className="section-heading"><span>04</span><div><h3>Премии и штрафы</h3><p>Отметьте поощрения или взыскания сотрудников</p></div></div>{rewards.map((r, i) => <div className="reward" key={i}><div className="grid5"><Field label="Сотрудник" value={r.employee_name} onChange={(v) => updateReward(i, 'employee_name', v)} placeholder="ФИО"/><Field label="Премия за что" value={r.reward_reason} onChange={(v) => updateReward(i, 'reward_reason', v)} placeholder="Причина"/><Field label="Дата" type="date" value={r.reward_date} onChange={(v) => updateReward(i, 'reward_date', v)}/><Field label="Штраф за что" value={r.penalty_reason} onChange={(v) => updateReward(i, 'penalty_reason', v)} placeholder="Причина"/><Field label="Дата" type="date" value={r.penalty_date} onChange={(v) => updateReward(i, 'penalty_date', v)}/></div></div>)}<button className="text-button" onClick={() => setRewards([...rewards, emptyReward()])}><Plus size={16}/> Добавить сотрудника</button></section>
        <div className="savebar"><div><b>Отчёт за {monthLabel}</b><span>{leader ? `Лидер: ${leader.name}` : 'Выберите лидера перед сохранением'}</span></div><button className="primary" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={18}/> : <Save size={18}/>} Сохранить отчёт</button></div>
      </> : <Admin reports={reports} exportXlsx={exportXlsx}/>} 
    </main>
  </div>
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label>{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/></label> }

function Admin({ reports, exportXlsx }: { reports: Report[]; exportXlsx: () => void }) {
  return <><section className="admin-summary"><div><FileSpreadsheet size={25}/><div><b>{reports.length}</b><span>отчётов собрано</span></div></div><button className="primary" disabled={!reports.length} onClick={exportXlsx}><Download size={18}/> Скачать Excel</button></section><section className="card"><div className="section-row"><div><h3>Отчёты лидеров</h3><p className="muted">Данные доступны для выгрузки и дальнейшего редактирования</p></div></div>{reports.length ? <div className="table-wrap"><table><thead><tr><th>Месяц</th><th>Лидер</th><th>Кейсы</th><th>Факторы</th><th>Обновлён</th></tr></thead><tbody>{reports.map((r, i) => <tr key={r.id || i}><td>{r.report_month.slice(0, 7)}</td><td><b>{r.leader_name}</b></td><td>{r.cases.length}</td><td>{r.factors.length}</td><td>{r.updated_at ? new Date(r.updated_at).toLocaleDateString('ru') : '—'}</td></tr>)}</tbody></table></div> : <div className="empty"><FileSpreadsheet size={40}/><b>Отчётов пока нет</b><p>Сохранённые лидерами отчёты появятся здесь.</p></div>}</section></>
}
