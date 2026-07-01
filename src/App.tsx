import { type DragEvent, type FormEvent, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  GripVertical,
  Link2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import './App.css'

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

const movementTemplates = [
  { name: 'Pix Cliente recorrente', amount: 492.75, type: 'entrada' as const },
  { name: 'Pagamento motoboy', amount: 86.4, type: 'saida' as const },
  { name: 'Venda delivery', amount: 318.2, type: 'entrada' as const },
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

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentTime() {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function App() {
  const [movements, setMovements] = useState(initialMovements)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<MovementType | 'todos'>('todos')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expenseName, setExpenseName] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingExpenseName, setEditingExpenseName] = useState('')
  const [editingExpenseAmount, setEditingExpenseAmount] = useState('')
  const [selectedMovementByExpenseId, setSelectedMovementByExpenseId] = useState<
    Record<string, string>
  >({})
  const [draggedMovementId, setDraggedMovementId] = useState<string | null>(null)
  const [dragOverExpenseId, setDragOverExpenseId] = useState<string | null>(null)
  const [latestNotification, setLatestNotification] = useState<Movement>(
    initialMovements[0],
  )

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

  const movementById = new Map(
    movements.map((movement) => [movement.id, movement]),
  )

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

  function simulateMovement() {
    const template = movementTemplates[movements.length % movementTemplates.length]
    const movement: Movement = {
      ...template,
      id: `mov-${Date.now()}`,
      date: getToday(),
      time: getCurrentTime(),
    }

    setMovements((currentMovements) => [movement, ...currentMovements])
    setLatestNotification(movement)
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const targetAmount = parseCurrencyInput(expenseAmount)
    if (!expenseName.trim() || Number.isNaN(targetAmount) || targetAmount <= 0) {
      return
    }

    setExpenses((currentExpenses) => [
      {
        id: `expense-${Date.now()}`,
        name: expenseName.trim(),
        targetAmount,
        movementIds: [],
      },
      ...currentExpenses,
    ])
    setExpenseName('')
    setExpenseAmount('')
  }

  function assignMovementToExpense(expenseId: string, movementId: string) {
    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) => {
        const movementIds =
          expense.id === expenseId
            ? Array.from(new Set([...expense.movementIds, movementId]))
            : expense.movementIds.filter(
                (assignedMovementId) => assignedMovementId !== movementId,
              )

        return { ...expense, movementIds }
      }),
    )
  }

  function removeMovementFromExpense(expenseId: string, movementId: string) {
    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              movementIds: expense.movementIds.filter(
                (assignedMovementId) => assignedMovementId !== movementId,
              ),
            }
          : expense,
      ),
    )
  }

  function addSelectedMovementToExpense(expenseId: string) {
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
    const targetAmount = parseCurrencyInput(editingExpenseAmount)
    if (
      !editingExpenseName.trim() ||
      Number.isNaN(targetAmount) ||
      targetAmount <= 0
    ) {
      return
    }

    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              name: editingExpenseName.trim(),
              targetAmount,
            }
          : expense,
      ),
    )
    cancelEditingExpense()
  }

  function deleteExpense(expenseId: string) {
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.id !== expenseId),
    )
    setSelectedMovementByExpenseId((currentSelection) => {
      const { [expenseId]: _removedSelection, ...nextSelection } = currentSelection
      return nextSelection
    })

    if (editingExpenseId === expenseId) {
      cancelEditingExpense()
    }
  }

  function handleMovementDragStart(
    event: DragEvent<HTMLElement>,
    movementId: string,
  ) {
    event.dataTransfer.setData('text/plain', movementId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggedMovementId(movementId)
  }

  function handleExpenseDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleExpenseDragEnter(
    event: DragEvent<HTMLElement>,
    expenseId: string,
  ) {
    event.preventDefault()
    setDragOverExpenseId(expenseId)
  }

  function handleExpenseDragLeave(
    event: DragEvent<HTMLElement>,
    expenseId: string,
  ) {
    const nextTarget = event.relatedTarget
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return
    }

    if (dragOverExpenseId === expenseId) {
      setDragOverExpenseId(null)
    }
  }

  function handleExpenseDrop(event: DragEvent<HTMLElement>, expenseId: string) {
    event.preventDefault()
    event.stopPropagation()

    const movementId = event.dataTransfer.getData('text/plain') || draggedMovementId
    if (!movementId) {
      return
    }

    assignMovementToExpense(expenseId, movementId)
    setDraggedMovementId(null)
    setDragOverExpenseId(null)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Cozidos Pay</span>
          <h1>Movimentações da conta</h1>
          <p>Entradas, saídas e avisos em tempo real em uma visão simples.</p>
        </div>
        <button className="primary-action" type="button" onClick={simulateMovement}>
          <BellRing size={18} aria-hidden="true" />
          Simular notificação
        </button>
      </header>

      <section className="notification-strip" aria-live="polite">
        <div className="notification-icon">
          <BellRing size={20} aria-hidden="true" />
        </div>
        <div>
          <span>Nova movimentação</span>
          <strong>{latestNotification.name}</strong>
        </div>
        <span className={`notification-value ${latestNotification.type}`}>
          {formatCurrency(latestNotification.amount, latestNotification.type)}
        </span>
      </section>

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

      <section className="expenses-panel" aria-label="Despesas cadastradas">
        <div className="expenses-header">
          <div>
            <span className="section-kicker">Planejamento</span>
            <h2>Despesas</h2>
            <p>Cadastre uma despesa, arraste movimentações ou adicione pela lista.</p>
          </div>

          <form className="expense-form" onSubmit={addExpense}>
            <label className="compact-field">
              <span>Nome</span>
              <input
                aria-label="Nome da despesa"
                placeholder="Ex.: Impostos"
                value={expenseName}
                onChange={(event) => setExpenseName(event.target.value)}
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
              />
            </label>
            <button className="primary-action expense-submit" type="submit">
              <Plus size={18} aria-hidden="true" />
              Cadastrar
            </button>
          </form>
        </div>

        <div className="expense-list">
          {expensesWithProgress.map((expense) => (
            <article
              className={`expense-card ${expense.isCompleted ? 'completed' : ''} ${
                draggedMovementId ? 'drop-ready' : ''
              } ${dragOverExpenseId === expense.id ? 'drop-active' : ''}`}
              key={expense.id}
              onDragEnter={(event) => handleExpenseDragEnter(event, expense.id)}
              onDragLeave={(event) => handleExpenseDragLeave(event, expense.id)}
              onDragOver={handleExpenseDragOver}
              onDragOverCapture={handleExpenseDragOver}
              onDrop={(event) => handleExpenseDrop(event, expense.id)}
              onDropCapture={(event) => handleExpenseDrop(event, expense.id)}
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
              </div>

              <div className="expense-progress" aria-label={`${expense.progress}% concluída`}>
                <div style={{ width: `${expense.progress}%` }} />
              </div>

              <div className="expense-numbers">
                <span>{currencyFormatter.format(expense.assignedTotal)} alocado</span>
                <strong>{currencyFormatter.format(expense.targetAmount)}</strong>
              </div>

              <div className="manual-assignment">
                <select
                  aria-label={`Movimentação para adicionar em ${expense.name}`}
                  value={selectedMovementByExpenseId[expense.id] ?? ''}
                  onChange={(event) =>
                    setSelectedMovementByExpenseId((currentSelection) => ({
                      ...currentSelection,
                      [expense.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Adicionar movimentação</option>
                  {movements.map((movement) => {
                    const assignedExpense = assignedExpenseByMovementId.get(
                      movement.id,
                    )

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
                  onClick={() => addSelectedMovementToExpense(expense.id)}
                >
                  <Link2 size={17} aria-hidden="true" />
                </button>
              </div>

              <div className="assigned-movements">
                {expense.assignedMovements.length > 0 ? (
                  expense.assignedMovements.map((movement) => (
                    <div className="assigned-movement" key={movement.id}>
                      <span>
                        {movement.name} · {formatCurrency(movement.amount, movement.type)}
                      </span>
                      <button
                        className="icon-action muted"
                        type="button"
                        aria-label={`Remover ${movement.name} de ${expense.name}`}
                        onClick={() => removeMovementFromExpense(expense.id, movement.id)}
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span>Solte uma entrada ou saída aqui</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

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
            </div>
            <button className="ghost-action" type="button">
              <Download size={17} aria-hidden="true" />
              Exportar
            </button>
          </div>

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
                  draggable
                  key={movement.id}
                  onDragEnd={() => setDraggedMovementId(null)}
                  onDragStart={(event) =>
                    handleMovementDragStart(event, movement.id)
                  }
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
    </main>
  )
}

export default App
