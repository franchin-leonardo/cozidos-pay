import {
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import './App.css'
import { ProtectedRoute } from './components/ProtectedRoute'
import { UserMenu } from './components/UserMenu'
import { useAuthContext } from './contexts/useAuthContext'
import { useMovements } from './hooks/useMovements'
import { useExpenses } from './hooks/useExpenses'
import {
  addCounterpartyEvent,
  deleteCounterpartyEvent,
  getCounterpartyEvents,
} from './lib/supabaseService'
import logo from './assets/logo.png'

type MovementType = 'entrada' | 'saida'

type Movement = {
  id: string
  name: string
  amount: number
  type: MovementType
  date: string
  time: string
}

type Expense = {
  id: string
  name: string
  targetAmount: number
  movementIds: string[]
}

type CounterpartyType = 'devedor' | 'credor'

type CounterpartyEntry = {
  id: string
  name: string
  description: string
  amount: number
  type: CounterpartyType
}

const initialMovements: Movement[] = [
  {
    id: 'mov-001',
    name: 'Pix Mariana Costa',
    amount: 1280.5,
    type: 'entrada',
    date: '2026-07-01',
    time: '09:42',
  },
  {
    id: 'mov-002',
    name: 'Fornecedor Padaria Norte',
    amount: 342.9,
    type: 'saida',
    date: '2026-07-01',
    time: '08:18',
  },
  {
    id: 'mov-003',
    name: 'Venda balcão - Cartão',
    amount: 876,
    type: 'entrada',
    date: '2026-06-30',
    time: '17:56',
  },
  {
    id: 'mov-004',
    name: 'Conta de energia',
    amount: 418.32,
    type: 'saida',
    date: '2026-06-29',
    time: '12:11',
  },
  {
    id: 'mov-005',
    name: 'TED Restaurante Almeida',
    amount: 2350,
    type: 'entrada',
    date: '2026-06-28',
    time: '15:04',
  },
]

const initialExpenses: Expense[] = [
  {
    id: 'expense-001',
    name: 'Aluguel da cozinha',
    targetAmount: 1500,
    movementIds: ['mov-001'],
  },
  {
    id: 'expense-002',
    name: 'Energia e utilidades',
    targetAmount: 900,
    movementIds: ['mov-004'],
  },
]

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
})

function formatCurrency(amount: number, type: MovementType) {
  const signal = type === 'entrada' ? '+' : '-'
  return `${signal} ${currencyFormatter.format(amount)}`
}

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00`))
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function getCurrentLocalDateTime() {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0',
  )}`

  return { date, time }
}

function App() {
  const { isGuest, isAdmin } = useAuthContext()
  const { movements, reloadMovements, addNewMovement } = useMovements(initialMovements)
  const {
    expenses,
    addNewExpense: addNewExpenseToSupabase,
    updateExpenseName: updateExpenseNameSupabase,
    removeExpense: removeExpenseFromSupabase,
    assignMovementToExpense,
    removeMovementFromExpense,
  } = useExpenses(initialExpenses)

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<MovementType | 'todos'>('todos')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [manualMovementName, setManualMovementName] = useState('')
  const [manualMovementAmount, setManualMovementAmount] = useState('')
  const [manualMovementType, setManualMovementType] = useState<MovementType>('saida')
  const [isAddingManualMovement, setIsAddingManualMovement] = useState(false)
  const [manualMovementMessage, setManualMovementMessage] = useState('')

  const [planningView, setPlanningView] = useState<
    'planejamento' | 'devedores_credores'
  >('planejamento')
  const [isPlanningCollapsed, setIsPlanningCollapsed] = useState(false)
  const [isStatementCollapsed, setIsStatementCollapsed] = useState(false)

  const [expenseName, setExpenseName] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')

  const [counterpartyName, setCounterpartyName] = useState('')
  const [counterpartyDescription, setCounterpartyDescription] = useState('')
  const [counterpartyAmount, setCounterpartyAmount] = useState('')
  const [counterpartyType, setCounterpartyType] =
    useState<CounterpartyType>('devedor')
  const [counterpartyEntries, setCounterpartyEntries] = useState<
    CounterpartyEntry[]
  >([])

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingExpenseName, setEditingExpenseName] = useState('')
  const [editingExpenseAmount, setEditingExpenseAmount] = useState('')
  const [selectedMovementByExpenseId, setSelectedMovementByExpenseId] = useState<
    Record<string, string>
  >({})
  const [draggedMovementId, setDraggedMovementId] = useState<string | null>(null)
  const [dragOverExpenseId, setDragOverExpenseId] = useState<string | null>(null)
  const [isImportingMovements, setIsImportingMovements] = useState(false)
  const [importStatusMessage, setImportStatusMessage] = useState('')
  const hasTriggeredAutoImport = useRef(false)

  const filteredMovements = movements.filter((movement) => {
    const matchesName = movement.name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase())
    const matchesType = typeFilter === 'todos' || movement.type === typeFilter
    const matchesStartDate = !startDate || movement.date >= startDate
    const matchesEndDate = !endDate || movement.date <= endDate

    return matchesName && matchesType && matchesStartDate && matchesEndDate
  })

  const totals = movements.reduce(
    (summary, movement) => {
      summary[movement.type] += movement.amount
      return summary
    },
    { entrada: 0, saida: 0 },
  )

  const movementById = new Map(movements.map((movement) => [movement.id, movement]))

  const assignedExpenseByMovementId = new Map<string, Expense>()
  expenses.forEach((expense) => {
    expense.movementIds.forEach((movementId) => {
      assignedExpenseByMovementId.set(movementId, expense)
    })
  })

  const expensesWithProgress = expenses.map((expense) => {
    const assignedMovements = expense.movementIds
      .map((movementId) => movementById.get(movementId))
      .filter((movement): movement is Movement => Boolean(movement))
    const assignedTotal = assignedMovements.reduce(
      (total, movement) => total + movement.amount,
      0,
    )
    const progress = Math.min(
      100,
      Math.round((assignedTotal / expense.targetAmount) * 100),
    )

    return {
      ...expense,
      assignedMovements,
      assignedTotal,
      progress,
      isCompleted: assignedTotal >= expense.targetAmount,
    }
  })

  const visibleExpenses = expensesWithProgress

  useEffect(() => {
    let isMounted = true

    const loadCounterpartyEvents = async () => {
      const data = await getCounterpartyEvents()
      if (!isMounted) {
        return
      }

      const mapped = data.map((entry: any) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        amount: Number(entry.amount),
        type: entry.type as CounterpartyType,
      }))
      setCounterpartyEntries(mapped)
    }

    void loadCounterpartyEvents()

    return () => {
      isMounted = false
    }
  }, [])

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isGuest) {
      return
    }

    const targetAmount = parseCurrencyInput(expenseAmount)
    if (!expenseName.trim() || Number.isNaN(targetAmount) || targetAmount <= 0) {
      return
    }

    addNewExpenseToSupabase(expenseName.trim(), targetAmount)
    setExpenseName('')
    setExpenseAmount('')
  }

  async function addCounterpartyEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isGuest) {
      return
    }

    const amount = parseCurrencyInput(counterpartyAmount)
    if (
      !counterpartyName.trim() ||
      !counterpartyDescription.trim() ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      return
    }

    const inserted = await addCounterpartyEvent({
      name: counterpartyName.trim(),
      description: counterpartyDescription.trim(),
      amount,
      type: counterpartyType,
    })

    if (!inserted) {
      return
    }

    const entry: CounterpartyEntry = {
      id: inserted.id,
      name: inserted.name,
      description: inserted.description,
      amount: Number(inserted.amount),
      type: inserted.type,
    }

    setCounterpartyEntries((currentEntries) => [entry, ...currentEntries])
    setCounterpartyName('')
    setCounterpartyDescription('')
    setCounterpartyAmount('')
    setCounterpartyType('devedor')
  }

  async function removeCounterpartyEntry(entryId: string) {
    if (isGuest) {
      return
    }

    const success = await deleteCounterpartyEvent(entryId)
    if (!success) {
      return
    }

    setCounterpartyEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.id !== entryId),
    )
  }

  async function addManualMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isAdmin || isAddingManualMovement) {
      return
    }

    const parsedAmount = parseCurrencyInput(manualMovementAmount)
    if (!manualMovementName.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setManualMovementMessage('Preencha descrição e valor válido.')
      return
    }

    setIsAddingManualMovement(true)
    setManualMovementMessage('')

    try {
      const { date, time } = getCurrentLocalDateTime()
      await addNewMovement({
        name: manualMovementName.trim(),
        amount: parsedAmount,
        type: manualMovementType,
        date,
        time,
      })

      setManualMovementName('')
      setManualMovementAmount('')
      setManualMovementType('saida')
      setManualMovementMessage('Movimentação em dinheiro cadastrada com sucesso.')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a movimentação manual.'
      setManualMovementMessage(`Falha ao salvar: ${message}`)
    } finally {
      setIsAddingManualMovement(false)
    }
  }

  function addSelectedMovementToExpense(expenseId: string) {
    if (isGuest) {
      return
    }

    const expense = expensesWithProgress.find((item) => item.id === expenseId)
    if (!expense || expense.isCompleted) {
      return
    }

    const movementId = selectedMovementByExpenseId[expenseId]
    if (!movementId) {
      return
    }

    assignMovementToExpense(expenseId, movementId)
    setSelectedMovementByExpenseId((currentSelection) => ({
      ...currentSelection,
      [expenseId]: '',
    }))
  }

  function startEditingExpense(expense: Expense) {
    if (isGuest) {
      return
    }

    setEditingExpenseId(expense.id)
    setEditingExpenseName(expense.name)
    setEditingExpenseAmount(String(expense.targetAmount).replace('.', ','))
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null)
    setEditingExpenseName('')
    setEditingExpenseAmount('')
  }

  function saveExpenseEdit(expenseId: string) {
    if (isGuest) {
      return
    }

    const targetAmount = parseCurrencyInput(editingExpenseAmount)
    if (!editingExpenseName.trim() || Number.isNaN(targetAmount) || targetAmount <= 0) {
      return
    }

    updateExpenseNameSupabase(expenseId, editingExpenseName.trim(), targetAmount)
    cancelEditingExpense()
  }

  function deleteExpense(expenseId: string) {
    if (isGuest) {
      return
    }

    removeExpenseFromSupabase(expenseId)
    setSelectedMovementByExpenseId((currentSelection) => {
      const { [expenseId]: _removedSelection, ...nextSelection } = currentSelection
      return nextSelection
    })

    if (editingExpenseId === expenseId) {
      cancelEditingExpense()
    }
  }

  function handleMovementDragStart(event: DragEvent<HTMLElement>, movementId: string) {
    if (isGuest) {
      return
    }

    event.dataTransfer.setData('text/plain', movementId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggedMovementId(movementId)
  }

  function handleExpenseDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleExpenseDragEnter(event: DragEvent<HTMLElement>, expenseId: string) {
    event.preventDefault()
    setDragOverExpenseId(expenseId)
  }

  function handleExpenseDragLeave(event: DragEvent<HTMLElement>, expenseId: string) {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }

    if (dragOverExpenseId === expenseId) {
      setDragOverExpenseId(null)
    }
  }

  function handleExpenseDrop(event: DragEvent<HTMLElement>, expenseId: string) {
    if (isGuest) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const expense = expensesWithProgress.find((item) => item.id === expenseId)
    if (!expense || expense.isCompleted) {
      setDraggedMovementId(null)
      setDragOverExpenseId(null)
      return
    }

    const movementId = event.dataTransfer.getData('text/plain') || draggedMovementId
    if (!movementId) {
      return
    }

    assignMovementToExpense(expenseId, movementId)
    setDraggedMovementId(null)
    setDragOverExpenseId(null)
  }

  const runPixImport = useCallback(
    async (source: 'auto' | 'manual') => {
      if (isGuest) {
        setImportStatusMessage('Modo visitante: apenas leitura.')
        return
      }

      if (source === 'manual' && !isAdmin) {
        setImportStatusMessage('Ação disponível apenas para administradores.')
        return
      }

      if (isImportingMovements) {
        return
      }

      setIsImportingMovements(true)
      setImportStatusMessage(
        source === 'auto'
          ? 'Sincronizando extrato automaticamente...'
          : 'Sincronizando extrato manualmente...',
      )

      try {
        const response = await fetch('/api/import-pix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max: 30 }),
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || 'Não foi possível importar o extrato agora.')
        }

        if (payload?.integrationConfigured === false) {
          const reason = payload?.result?.reason
          if (reason === 'gmail-not-configured') {
            setImportStatusMessage('Integração Gmail não configurada neste ambiente.')
          } else if (reason === 'supabase-not-configured') {
            setImportStatusMessage('Integração Supabase não configurada neste ambiente.')
          } else {
            setImportStatusMessage('Integração de importação não configurada neste ambiente.')
          }
          return
        }

        await reloadMovements()

        const inserted = Number(payload?.result?.inserted ?? 0)
        const skipped = Number(payload?.result?.skipped ?? 0)
        setImportStatusMessage(
          `Extrato atualizado: ${inserted} nova(s), ${skipped} ignorada(s).`,
        )
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o extrato.'

        setImportStatusMessage(`Falha na sincronização: ${message}`)
      } finally {
        setIsImportingMovements(false)
      }
    },
    [isAdmin, isGuest, isImportingMovements, reloadMovements],
  )

  useEffect(() => {
    if (hasTriggeredAutoImport.current) {
      return
    }

    hasTriggeredAutoImport.current = true
    if (!isGuest) {
      void runPixImport('auto')
    }
  }, [isGuest, runPixImport])

  return (
    <ProtectedRoute>
      <main className="app-shell">
        <header className="app-header">
          <div>
            <div className="brand-row">
              <img
                className="brand-logo"
                src={logo}
                alt="Logo Cozidos F.C"
              />
              <span className="eyebrow">Cozidos Pay</span>
            </div>
            <h1>Movimentações da conta</h1>
            <p>Entradas, saídas e avisos em tempo real em uma visão simples.</p>
          </div>
          <div className="header-actions">
            <UserMenu />
          </div>
        </header>

        <section className="summary-grid" aria-label="Resumo financeiro">
          <article className="summary-panel entrada">
            <span>Entradas</span>
            <strong>{currencyFormatter.format(totals.entrada)}</strong>
          </article>
          <article className="summary-panel saida">
            <span>Saídas</span>
            <strong>{currencyFormatter.format(totals.saida)}</strong>
          </article>
          <article className="summary-panel saldo">
            <span>Saldo do período</span>
            <strong>{currencyFormatter.format(totals.entrada - totals.saida)}</strong>
          </article>
        </section>

        <section className="expenses-panel" aria-label="Planejamento financeiro">
          <div className="section-accordion-bar">
            <span className="section-accordion-title">Planejamento financeiro</span>
            <button
              type="button"
              className="ghost-action accordion-toggle"
              onClick={() => setIsPlanningCollapsed((current) => !current)}
              aria-expanded={!isPlanningCollapsed}
              aria-controls="planning-accordion-content"
            >
              {isPlanningCollapsed ? (
                <>
                  <ChevronDown size={16} aria-hidden="true" />
                  Expandir
                </>
              ) : (
                <>
                  <ChevronUp size={16} aria-hidden="true" />
                  Minimizar
                </>
              )}
            </button>
          </div>

          <div
            id="planning-accordion-content"
            className={`planning-accordion-content ${
              isPlanningCollapsed ? 'collapsed' : 'expanded'
            }`}
            aria-hidden={isPlanningCollapsed}
          >
          <div
            className={`expenses-header ${
              planningView === 'devedores_credores' ? 'single-column' : ''
            }`}
          >
            <div>
              <div
                className="planning-view-tabs"
                role="tablist"
                aria-label="Seções de planejamento"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={planningView === 'planejamento'}
                  className={planningView === 'planejamento' ? 'active' : ''}
                  onClick={() => setPlanningView('planejamento')}
                >
                  Planejamento
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={planningView === 'devedores_credores'}
                  className={planningView === 'devedores_credores' ? 'active' : ''}
                  onClick={() => setPlanningView('devedores_credores')}
                >
                  Devedores e credores
                </button>
              </div>

              {planningView === 'planejamento' ? (
                <>
                  <h2>Despesas</h2>
                </>
              ) : (
                <>
                  <h2>Devedores e credores</h2>                  
                </>
              )}
            </div>

            {planningView === 'planejamento' ? (
              <form className="expense-form" onSubmit={addExpense}>
                <label className="compact-field">
                  <span>Nome</span>
                  <input
                    aria-label="Nome da despesa"
                    placeholder="Ex.: Impostos"
                    value={expenseName}
                    onChange={(event) => setExpenseName(event.target.value)}
                    disabled={isGuest}
                  />
                </label>
                <label className="compact-field">
                  <span>Valor</span>
                  <input
                    aria-label="Valor da despesa"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={expenseAmount}
                    onChange={(event) => setExpenseAmount(event.target.value)}
                    disabled={isGuest}
                  />
                </label>
                {!isGuest && (
                  <button className="primary-action expense-submit" type="submit">
                    <Plus size={18} aria-hidden="true" />
                    Cadastrar
                  </button>
                )}
              </form>
            ) : null}
          </div>

          {planningView === 'devedores_credores' && (
            <form
              className="expense-form counterparty-form counterparty-form-below"
              onSubmit={addCounterpartyEntry}
            >
              <label className="compact-field">
                <span>Jogador</span>
                <input
                  aria-label="Nome do cliente"
                  placeholder="Ex.: João Silva"
                  value={counterpartyName}
                  onChange={(event) => setCounterpartyName(event.target.value)}
                  disabled={isGuest}
                />
              </label>
              <label className="compact-field">
                <span>Descrição</span>
                <input
                  aria-label="Descrição do evento"
                  placeholder="Ex.: Compra de insumos"
                  value={counterpartyDescription}
                  onChange={(event) => setCounterpartyDescription(event.target.value)}
                  disabled={isGuest}
                />
              </label>
              <label className="compact-field">
                <span>Valor</span>
                <input
                  aria-label="Valor devido ou creditado"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={counterpartyAmount}
                  onChange={(event) => setCounterpartyAmount(event.target.value)}
                  disabled={isGuest}
                />
              </label>
              <label className="compact-field">
                <span>Tipo</span>
                <select
                  aria-label="Tipo do lançamento"
                  value={counterpartyType}
                  onChange={(event) =>
                    setCounterpartyType(event.target.value as CounterpartyType)
                  }
                  disabled={isGuest}
                >
                  <option value="devedor">Devedor</option>
                  <option value="credor">Credor</option>
                </select>
              </label>
              {!isGuest && (
                <button className="primary-action expense-submit" type="submit">
                  <Plus size={18} aria-hidden="true" />
                  Cadastrar
                </button>
              )}
            </form>
          )}

          {planningView === 'planejamento' ? (
            <div className="expense-list">
              {visibleExpenses.map((expense) => (
                <article
                  className={`expense-card ${expense.isCompleted ? 'completed' : ''} ${
                    draggedMovementId && !expense.isCompleted ? 'drop-ready' : ''
                  } ${dragOverExpenseId === expense.id ? 'drop-active' : ''}`}
                  key={expense.id}
                  onDragEnter={
                    expense.isCompleted
                      ? undefined
                      : (event) => handleExpenseDragEnter(event, expense.id)
                  }
                  onDragLeave={
                    expense.isCompleted
                      ? undefined
                      : (event) => handleExpenseDragLeave(event, expense.id)
                  }
                  onDragOver={expense.isCompleted ? undefined : handleExpenseDragOver}
                  onDragOverCapture={
                    expense.isCompleted ? undefined : handleExpenseDragOver
                  }
                  onDrop={
                    expense.isCompleted
                      ? undefined
                      : (event) => handleExpenseDrop(event, expense.id)
                  }
                  onDropCapture={
                    expense.isCompleted
                      ? undefined
                      : (event) => handleExpenseDrop(event, expense.id)
                  }
                >
                  <div className="expense-top">
                    <div className="expense-icon">
                      {expense.isCompleted ? (
                        <CheckCircle2 size={20} aria-hidden="true" />
                      ) : (
                        <Wallet size={20} aria-hidden="true" />
                      )}
                    </div>
                    {editingExpenseId === expense.id ? (
                      <div className="edit-expense-form">
                        <input
                          aria-label="Editar nome da despesa"
                          value={editingExpenseName}
                          onChange={(event) => setEditingExpenseName(event.target.value)}
                        />
                        <input
                          aria-label="Editar valor da despesa"
                          inputMode="decimal"
                          value={editingExpenseAmount}
                          onChange={(event) => setEditingExpenseAmount(event.target.value)}
                        />
                      </div>
                    ) : (
                      <div>
                        <strong>{expense.name}</strong>
                        <span>{expense.isCompleted ? 'Concluída' : 'Em andamento'}</span>
                      </div>
                    )}
                    {!isGuest && (
                      <div className="expense-actions">
                        {editingExpenseId === expense.id ? (
                          <>
                            <button
                              className="icon-action"
                              type="button"
                              aria-label="Salvar despesa"
                              onClick={() => saveExpenseEdit(expense.id)}
                            >
                              <Check size={17} aria-hidden="true" />
                            </button>
                            <button
                              className="icon-action muted"
                              type="button"
                              aria-label="Cancelar edição"
                              onClick={cancelEditingExpense}
                            >
                              <X size={17} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="icon-action"
                              type="button"
                              aria-label={`Editar ${expense.name}`}
                              onClick={() => startEditingExpense(expense)}
                            >
                              <Pencil size={17} aria-hidden="true" />
                            </button>
                            <button
                              className="icon-action danger"
                              type="button"
                              aria-label={`Excluir ${expense.name}`}
                              onClick={() => deleteExpense(expense.id)}
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="expense-progress" aria-label={`${expense.progress}% concluída`}>
                    <div style={{ width: `${expense.progress}%` }} />
                  </div>

                  <div className="expense-numbers">
                    <span>{currencyFormatter.format(expense.assignedTotal)} alocado</span>
                    <strong>{currencyFormatter.format(expense.targetAmount)}</strong>
                  </div>

                  {!isGuest && <div className="manual-assignment">
                    <select
                      aria-label={`Movimentação para adicionar em ${expense.name}`}
                      value={selectedMovementByExpenseId[expense.id] ?? ''}
                      disabled={expense.isCompleted}
                      onChange={(event) =>
                        setSelectedMovementByExpenseId((currentSelection) => ({
                          ...currentSelection,
                          [expense.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Adicionar movimentação</option>
                      {movements.map((movement) => {
                        const assignedExpense = assignedExpenseByMovementId.get(movement.id)

                        return (
                          <option key={movement.id} value={movement.id}>
                            {movement.name} · {formatCurrency(movement.amount, movement.type)}
                            {assignedExpense ? ` · em ${assignedExpense.name}` : ''}
                          </option>
                        )
                      })}
                    </select>
                    <button
                      className="icon-action add-movement"
                      type="button"
                      aria-label={`Adicionar movimentação em ${expense.name}`}
                      disabled={expense.isCompleted}
                      onClick={() => addSelectedMovementToExpense(expense.id)}
                    >
                      <Link2 size={17} aria-hidden="true" />
                    </button>
                  </div>}

                  <div className="assigned-movements">
                    {expense.assignedMovements.length > 0 ? (
                      expense.assignedMovements.map((movement) => (
                        <div className="assigned-movement" key={movement.id}>
                          <span>
                            {movement.name} · {formatCurrency(movement.amount, movement.type)}
                          </span>
                          {!isGuest && (
                            <button
                              className="icon-action muted"
                              type="button"
                              aria-label={`Remover ${movement.name} de ${expense.name}`}
                              onClick={() =>
                                removeMovementFromExpense(expense.id, movement.id)
                              }
                            >
                              <X size={15} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span>Solte uma entrada ou saída aqui</span>
                    )}
                  </div>
                </article>
              ))}

              {visibleExpenses.length === 0 && (
                <div className="empty-state">
                  <Wallet size={24} aria-hidden="true" />
                  <strong>Nenhuma despesa cadastrada</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="counterparty-list">
              {counterpartyEntries.map((entry) => (
                <article
                  className={`counterparty-card ${
                    entry.type === 'devedor' ? 'devedor' : 'credor'
                  }`}
                  key={entry.id}
                >
                  <div className="counterparty-card-top">
                    <div>
                      <strong>{entry.name}</strong>
                      <span>{entry.type === 'devedor' ? 'Devedor' : 'Credor'}</span>
                    </div>
                    {!isGuest && (
                      <button
                        className="icon-action muted"
                        type="button"
                        aria-label={`Remover ${entry.name}`}
                        onClick={() => removeCounterpartyEntry(entry.id)}
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <p className="counterparty-description">{entry.description}</p>
                  <strong className="counterparty-value">
                    {currencyFormatter.format(entry.amount)}
                  </strong>
                </article>
              ))}

              {counterpartyEntries.length === 0 && (
                <div className="empty-state">
                  <Wallet size={24} aria-hidden="true" />
                  <strong>Nenhum cliente cadastrado</strong>
                </div>
              )}
            </div>
          )}
          </div>
        </section>

        <section
          className="expenses-panel statement-accordion-shell"
          aria-label="Extrato financeiro"
        >
          <div className="section-accordion-bar">
            <span className="section-accordion-title">Extrato</span>
            <button
              type="button"
              className="ghost-action accordion-toggle"
              onClick={() => setIsStatementCollapsed((current) => !current)}
              aria-expanded={!isStatementCollapsed}
              aria-controls="statement-accordion-content"
            >
              {isStatementCollapsed ? (
                <>
                  <ChevronDown size={16} aria-hidden="true" />
                  Expandir
                </>
              ) : (
                <>
                  <ChevronUp size={16} aria-hidden="true" />
                  Minimizar
                </>
              )}
            </button>
          </div>

          <div
            id="statement-accordion-content"
            className={`statement-accordion-content ${
              isStatementCollapsed ? 'collapsed' : 'expanded'
            }`}
            aria-hidden={isStatementCollapsed}
          >
            <section className="content-layout">
              <aside className="filters-panel" aria-label="Filtros de movimentações">
                <div className="panel-title">
                  <SlidersHorizontal size={18} aria-hidden="true" />
                  <h2>Filtros</h2>
                </div>

                <label className="field search-field">
                  <span>Nome</span>
                  <div>
                    <Search size={18} aria-hidden="true" />
                    <input
                      type="search"
                      placeholder="Buscar por nome"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                </label>

                <div className="segmented-control" aria-label="Tipo de movimentação">
                  <button
                    className={typeFilter === 'todos' ? 'active' : ''}
                    type="button"
                    onClick={() => setTypeFilter('todos')}
                  >
                    Todos
                  </button>
                  <button
                    className={typeFilter === 'entrada' ? 'active' : ''}
                    type="button"
                    onClick={() => setTypeFilter('entrada')}
                  >
                    <ArrowDownLeft size={16} aria-hidden="true" />
                    Entradas
                  </button>
                  <button
                    className={typeFilter === 'saida' ? 'active' : ''}
                    type="button"
                    onClick={() => setTypeFilter('saida')}
                  >
                    <ArrowUpRight size={16} aria-hidden="true" />
                    Saídas
                  </button>
                </div>

                <label className="field">
                  <span>Data inicial</span>
                  <div>
                    <CalendarDays size={18} aria-hidden="true" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </div>
                </label>

                <label className="field">
                  <span>Data final</span>
                  <div>
                    <CalendarDays size={18} aria-hidden="true" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </div>
                </label>
              </aside>

              <section className="movements-panel" aria-label="Lista de movimentações">
            <div className="movements-header">
              <div>
                <h2>Extrato</h2>
                <p>{filteredMovements.length} movimentações encontradas</p>
                {importStatusMessage && (
                  <p className="import-status-message">{importStatusMessage}</p>
                )}
              </div>
              <div className="movements-actions">
                {isAdmin && (
                  <button
                    className="ghost-action"
                    type="button"
                    onClick={() => runPixImport('manual')}
                    disabled={isImportingMovements}
                  >
                    <RefreshCw
                      className={isImportingMovements ? 'spin' : ''}
                      size={17}
                      aria-hidden="true"
                    />
                    {isImportingMovements ? 'Atualizando...' : 'Atualizar extrato'}
                  </button>
                )}
                {!isGuest && (
                  <button className="ghost-action" type="button">
                    <Download size={17} aria-hidden="true" />
                    Exportar
                  </button>
                )}
              </div>
            </div>

            {isAdmin && (
              <section className="manual-movement-panel" aria-label="Lançamento manual em dinheiro">
                <div className="manual-movement-panel-header">
                  <h3>Dinheiro manual</h3>
                </div>

                <form className="movement-form movement-form-inline" onSubmit={addManualMovement}>
                  <label className="field search-field">
                    <span>Descrição</span>
                    <div>
                      <Wallet size={18} aria-hidden="true" />
                      <input
                        type="text"
                        placeholder="Ex.: Pagamento em dinheiro"
                        value={manualMovementName}
                        onChange={(event) => setManualMovementName(event.target.value)}
                        disabled={!isAdmin}
                      />
                    </div>
                  </label>

                  <label className="field search-field">
                    <span>Valor</span>
                    <div>
                      <ArrowUpRight size={18} aria-hidden="true" />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={manualMovementAmount}
                        onChange={(event) => setManualMovementAmount(event.target.value)}
                        disabled={!isAdmin}
                      />
                    </div>
                  </label>

                  <div
                    className="segmented-control manual-movement-type-toggle"
                    aria-label="Tipo da movimentação manual"
                  >
                    <button
                      type="button"
                      className={manualMovementType === 'entrada' ? 'active' : ''}
                      onClick={() => setManualMovementType('entrada')}
                      disabled={!isAdmin}
                    >
                      <ArrowDownLeft size={16} aria-hidden="true" />
                      Entrada
                    </button>
                    <button
                      type="button"
                      className={`manual-movement-saida ${
                        manualMovementType === 'saida' ? 'active' : ''
                      }`}
                      onClick={() => setManualMovementType('saida')}
                      disabled={!isAdmin}
                    >
                      <ArrowUpRight size={16} aria-hidden="true" />
                      Saída
                    </button>
                  </div>

                  <button
                    className="primary-action"
                    type="submit"
                    disabled={isAddingManualMovement}
                  >
                    <Plus size={17} aria-hidden="true" />
                    {'Lançar no extrato'}
                  </button>
                </form>

                {manualMovementMessage && (
                  <p className="manual-movement-message">{manualMovementMessage}</p>
                )}
              </section>
            )}

            <div className="movement-list">
              {filteredMovements.map((movement) => {
                const assignedExpense = expenses.find((expense) =>
                  expense.movementIds.includes(movement.id),
                )

                return (
                  <article
                    className={`movement-row ${
                      draggedMovementId === movement.id ? 'dragging' : ''
                    }`}
                    draggable={!isGuest}
                    key={movement.id}
                    onDragEnd={() => setDraggedMovementId(null)}
                    onDragStart={(event) => handleMovementDragStart(event, movement.id)}
                  >
                    <GripVertical className="drag-handle" size={18} aria-hidden="true" />
                    <div className={`movement-badge ${movement.type}`}>
                      {movement.type === 'entrada' ? (
                        <ArrowDownLeft size={18} aria-hidden="true" />
                      ) : (
                        <ArrowUpRight size={18} aria-hidden="true" />
                      )}
                    </div>
                    <div className="movement-main">
                      <strong>{movement.name}</strong>
                      <span>
                        {formatDate(movement.date)} · {movement.time}
                      </span>
                      {assignedExpense && <small>Alocada em {assignedExpense.name}</small>}
                    </div>
                    <strong className={`movement-value ${movement.type}`}>
                      {formatCurrency(movement.amount, movement.type)}
                    </strong>
                  </article>
                )
              })}

              {filteredMovements.length === 0 && (
                <div className="empty-state">
                  <Search size={24} aria-hidden="true" />
                  <strong>Nenhuma movimentação encontrada</strong>
                </div>
              )}
            </div>
              </section>
            </section>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  )
}

export default App
