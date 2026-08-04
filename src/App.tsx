import {
  Fragment,
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
  description?: string
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

type SplitPartDraft = {
  description: string
  amount: string
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

function parseFlexibleCurrencyInput(value: string) {
  const raw = String(value ?? '').trim().replace(/\s/g, '')
  if (!raw) {
    return Number.NaN
  }

  if (raw.includes(',')) {
    return Number(raw.replace(/\./g, '').replace(',', '.'))
  }

  return Number(raw.replace(',', '.'))
}

function toCurrencyInput(value: number) {
  return value.toFixed(2).replace('.', ',')
}

function buildSplitDraftParts(totalAmount: number, partsCount: number) {
  const parts: SplitPartDraft[] = []
  let remaining = Number(totalAmount.toFixed(2))

  for (let index = 0; index < partsCount; index += 1) {
    const isLastPart = index === partsCount - 1
    const partAmount = isLastPart
      ? Number(remaining.toFixed(2))
      : Number((remaining / (partsCount - index)).toFixed(2))

    remaining = Number((remaining - partAmount).toFixed(2))
    parts.push({
      description: `Parte ${index + 1}/${partsCount}`,
      amount: toCurrencyInput(partAmount),
    })
  }

  return parts
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
  const {
    movements,
    reloadMovements,
    addNewMovement,
    removeMovement,
    updateMovementDescription,
    splitMovement,
  } = useMovements(initialMovements)
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
  const [isPlanningCollapsed, setIsPlanningCollapsed] = useState(true)
  const [isStatementCollapsed, setIsStatementCollapsed] = useState(false)
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true)

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
  const [splitMovementId, setSplitMovementId] = useState<string | null>(null)
  const [splitPartsCountInput, setSplitPartsCountInput] = useState('2')
  const [splitDraftParts, setSplitDraftParts] = useState<SplitPartDraft[]>([])
  const [splitErrorMessage, setSplitErrorMessage] = useState('')
  const [isSubmittingSplit, setIsSubmittingSplit] = useState(false)
  const [editDescriptionMovementId, setEditDescriptionMovementId] = useState<string | null>(null)
  const [editDescriptionDraft, setEditDescriptionDraft] = useState('')
  const [isSubmittingEditDescription, setIsSubmittingEditDescription] = useState(false)
  const [deleteMovementId, setDeleteMovementId] = useState<string | null>(null)
  const [isSubmittingDeleteMovement, setIsSubmittingDeleteMovement] = useState(false)
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

  async function removeMovementEntry(movement: Movement) {
    if (!isAdmin) {
      return
    }

    if (deleteMovementId === movement.id) {
      setDeleteMovementId(null)
      return
    }

    setSplitErrorMessage('')
    setSplitMovementId(null)
    setEditDescriptionMovementId(null)
    setDeleteMovementId(movement.id)
  }

  async function confirmRemoveMovementEntry(movement: Movement) {
    if (!isAdmin) {
      return
    }

    setIsSubmittingDeleteMovement(true)

    try {
      await removeMovement(movement.id)
      setManualMovementMessage('Movimentação removida com sucesso.')
      setDeleteMovementId(null)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível remover a movimentação.'
      setManualMovementMessage(`Falha ao remover: ${message}`)
    } finally {
      setIsSubmittingDeleteMovement(false)
    }
  }

  async function editMovementDescriptionEntry(movement: Movement) {
    if (!isAdmin) {
      return
    }

    if (editDescriptionMovementId === movement.id) {
      setEditDescriptionMovementId(null)
      setEditDescriptionDraft('')
      return
    }

    setSplitErrorMessage('')
    setSplitMovementId(null)
    setDeleteMovementId(null)
    setEditDescriptionMovementId(movement.id)
    setEditDescriptionDraft(movement.description || '')
  }

  async function submitEditMovementDescriptionForm(
    event: FormEvent<HTMLFormElement>,
    movement: Movement,
  ) {
    event.preventDefault()

    if (!isAdmin) {
      return
    }

    setIsSubmittingEditDescription(true)

    try {
      await updateMovementDescription(movement.id, editDescriptionDraft)
      setManualMovementMessage('Descrição atualizada com sucesso.')
      setEditDescriptionMovementId(null)
      setEditDescriptionDraft('')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a descrição.'
      setManualMovementMessage(`Falha ao atualizar descrição: ${message}`)
    } finally {
      setIsSubmittingEditDescription(false)
    }
  }

  function closeSplitCard() {
    setSplitMovementId(null)
    setSplitPartsCountInput('2')
    setSplitDraftParts([])
    setSplitErrorMessage('')
    setIsSubmittingSplit(false)
  }

  function openSplitCard(movement: Movement) {
    const defaultCount = 2
    setEditDescriptionMovementId(null)
    setDeleteMovementId(null)
    setSplitMovementId(movement.id)
    setSplitPartsCountInput(String(defaultCount))
    setSplitDraftParts(buildSplitDraftParts(movement.amount, defaultCount))
    setSplitErrorMessage('')
  }

  function handleSplitPartsCountChange(movement: Movement, rawValue: string) {
    const nextCount = Number(rawValue)
    setSplitPartsCountInput(rawValue)

    if (!Number.isInteger(nextCount) || nextCount < 2 || nextCount > 10) {
      return
    }

    setSplitDraftParts(buildSplitDraftParts(movement.amount, nextCount))
    setSplitErrorMessage('')
  }

  function updateSplitDraftPart(index: number, field: 'description' | 'amount', value: string) {
    setSplitDraftParts((currentParts) =>
      currentParts.map((part, partIndex) =>
        partIndex === index
          ? {
              ...part,
              [field]: value,
            }
          : part,
      ),
    )
  }

  async function splitMovementEntry(movement: Movement, assignedExpense?: Expense) {
    if (!isAdmin) {
      return
    }

    if (assignedExpense) {
      setManualMovementMessage(
        `Remova a alocação em ${assignedExpense.name} antes de dividir esta movimentação.`,
      )
      return
    }

    if (splitMovementId === movement.id) {
      closeSplitCard()
      return
    }

    openSplitCard(movement)
  }

  async function submitSplitMovementForm(event: FormEvent<HTMLFormElement>, movement: Movement) {
    event.preventDefault()

    const partsCount = Number(splitPartsCountInput)
    if (!Number.isInteger(partsCount) || partsCount < 2 || partsCount > 10) {
      setSplitErrorMessage('Informe um número de partes entre 2 e 10.')
      return
    }

    if (splitDraftParts.length !== partsCount) {
      setSplitErrorMessage('Ajuste a quantidade de partes antes de confirmar.')
      return
    }

    const parsedParts = splitDraftParts.map((part, index) => {
      const parsedAmount = parseFlexibleCurrencyInput(part.amount)
      return {
        index,
        description: part.description.trim() || `Parte ${index + 1}/${partsCount}`,
        amount: parsedAmount,
      }
    })

    const hasInvalidAmount = parsedParts.some(
      (part) => !Number.isFinite(part.amount) || part.amount <= 0,
    )
    if (hasInvalidAmount) {
      setSplitErrorMessage('Todos os valores devem ser numéricos e maiores que zero.')
      return
    }

    const totalParts = Number(
      parsedParts.reduce((sum, part) => sum + Number(part.amount), 0).toFixed(2),
    )
    const totalMovement = Number(movement.amount.toFixed(2))

    if (Math.abs(totalParts - totalMovement) > 0.01) {
      setSplitErrorMessage(
        `A soma das partes (${currencyFormatter.format(
          totalParts,
        )}) precisa ser igual ao valor da movimentação (${currencyFormatter.format(totalMovement)}).`,
      )
      return
    }

    setIsSubmittingSplit(true)
    setSplitErrorMessage('')

    try {
      await splitMovement(
        movement.id,
        parsedParts.map((part, index) => ({
          name: `${movement.name} (${index + 1}/${partsCount})`,
          description: part.description,
          amount: Number(part.amount.toFixed(2)),
        })),
      )

      setManualMovementMessage('Movimentação dividida com sucesso.')
      closeSplitCard()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível dividir a movimentação.'
      setSplitErrorMessage(message)
    } finally {
      setIsSubmittingSplit(false)
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
        const importPixEndpoint =
          import.meta.env.VITE_IMPORT_PIX_ENDPOINT || '/api/import-pix'

        const response = await fetch(importPixEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max: 30 }),
        })

        const rawPayload = await response.text()
        let payload: { ok?: boolean; error?: string; integrationConfigured?: boolean; result?: any } | null = null

        if (rawPayload) {
          try {
            payload = JSON.parse(rawPayload)
          } catch {
            payload = null
          }
        }

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error ||
              `Não foi possível importar o extrato agora (HTTP ${response.status}).`,
          )
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
        let message =
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o extrato.'

        if (message === 'Failed to fetch') {
          message =
            'Falha de conexão com a API de importação. Em ambiente local, execute com `vercel dev` para habilitar a rota /api/import-pix.'
        } else if (message.includes('HTTP 404')) {
          message =
            'Rota de importação não encontrada (HTTP 404). Em ambiente local, execute com `vercel dev` ou defina `VITE_IMPORT_PIX_ENDPOINT` apontando para uma API válida.'
        }

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
          <article className="summary-panel saldo">
            <span>Saldo do período</span>
            <strong>{currencyFormatter.format(totals.entrada - totals.saida)}</strong>
          </article>
          <article className="summary-panel entrada">
            <span>Entradas</span>
            <strong>{currencyFormatter.format(totals.entrada)}</strong>
          </article>
          <article className="summary-panel saida">
            <span>Saídas</span>
            <strong>{currencyFormatter.format(totals.saida)}</strong>
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
            <section
              className={`content-layout ${
                isFiltersCollapsed ? 'filters-collapsed' : ''
              }`}
            >
              <aside
                id="statement-filters-panel"
                className={`filters-panel ${isFiltersCollapsed ? 'collapsed' : 'expanded'}`}
                aria-label="Filtros de movimentações"
                aria-hidden={isFiltersCollapsed}
              >
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
                <p>{filteredMovements.length} movimentações encontradas</p>
                {importStatusMessage && (
                  <p className="import-status-message">{importStatusMessage}</p>
                )}
              </div>
              <div className="movements-actions">
                <button
                  className="ghost-action"
                  type="button"
                  onClick={() => setIsFiltersCollapsed((current) => !current)}
                  aria-expanded={!isFiltersCollapsed}
                  aria-controls="statement-filters-panel"
                >
                  {isFiltersCollapsed ? (
                    <>
                      <ChevronDown size={17} aria-hidden="true" />
                      Expandir filtros
                    </>
                  ) : (
                    <>
                      <ChevronUp size={17} aria-hidden="true" />
                      Minimizar filtros
                    </>
                  )}
                </button>
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
                const isSplitOpen = splitMovementId === movement.id
                const isEditDescriptionOpen = editDescriptionMovementId === movement.id
                const isDeleteOpen = deleteMovementId === movement.id

                return (
                  <Fragment key={movement.id}>
                    <article
                      className={`movement-row ${
                        draggedMovementId === movement.id ? 'dragging' : ''
                      }`}
                      draggable={!isGuest}
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
                        {movement.description && (
                          <small className="movement-detail">
                            Descrição: {movement.description}
                          </small>
                        )}
                        {assignedExpense && <small>Alocada em {assignedExpense.name}</small>}
                      </div>
                      <strong className={`movement-value ${movement.type}`}>
                        {formatCurrency(movement.amount, movement.type)}
                      </strong>
                      {isAdmin && (
                        <div className="movement-row-actions">
                          <button
                            className="icon-action"
                            type="button"
                            aria-label={`Dividir movimentação ${movement.name}`}
                            onClick={() => splitMovementEntry(movement, assignedExpense)}
                          >
                            <Link2 size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="icon-action"
                            type="button"
                            aria-label={`Editar descrição de ${movement.name}`}
                            onClick={() => editMovementDescriptionEntry(movement)}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="icon-action danger"
                            type="button"
                            aria-label={`Remover movimentação ${movement.name}`}
                            onClick={() => removeMovementEntry(movement)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </article>

                    {isAdmin && isSplitOpen && (
                      <form
                        className="movement-split-card"
                        onSubmit={(event) => submitSplitMovementForm(event, movement)}
                      >
                        <div className="movement-split-header">
                          <strong>
                            Dividir {movement.name} ({currencyFormatter.format(movement.amount)})
                          </strong>
                          <button
                            className="icon-action muted"
                            type="button"
                            aria-label="Fechar divisão"
                            onClick={closeSplitCard}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>

                        <label className="field split-parts-field">
                          <span>Quantidade de partes (2 a 10)</span>
                          <div>
                            <input
                              type="number"
                              min={2}
                              max={10}
                              value={splitPartsCountInput}
                              onChange={(event) =>
                                handleSplitPartsCountChange(movement, event.target.value)
                              }
                              disabled={isSubmittingSplit}
                            />
                          </div>
                        </label>

                        <div className="movement-split-parts-grid">
                          {splitDraftParts.map((part, index) => (
                            <div className="movement-split-part-row" key={`${movement.id}-part-${index}`}>
                              <label className="field">
                                <span>Descrição da parte {index + 1}</span>
                                <div>
                                  <input
                                    type="text"
                                    value={part.description}
                                    onChange={(event) =>
                                      updateSplitDraftPart(index, 'description', event.target.value)
                                    }
                                    disabled={isSubmittingSplit}
                                  />
                                </div>
                              </label>
                              <label className="field">
                                <span>Valor</span>
                                <div>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={part.amount}
                                    onChange={(event) =>
                                      updateSplitDraftPart(index, 'amount', event.target.value)
                                    }
                                    disabled={isSubmittingSplit}
                                  />
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>

                        {splitErrorMessage && (
                          <p className="manual-movement-message split-error-message">
                            {splitErrorMessage}
                          </p>
                        )}

                        <div className="movement-split-actions">
                          <button className="ghost-action" type="button" onClick={closeSplitCard}>
                            Cancelar
                          </button>
                          <button className="primary-action" type="submit" disabled={isSubmittingSplit}>
                            {isSubmittingSplit ? 'Dividindo...' : 'Confirmar divisão'}
                          </button>
                        </div>
                      </form>
                    )}

                    {isAdmin && isEditDescriptionOpen && (
                      <form
                        className="movement-edit-card"
                        onSubmit={(event) => submitEditMovementDescriptionForm(event, movement)}
                      >
                        <div className="movement-split-header">
                          <strong>Editar descrição de {movement.name}</strong>
                        </div>

                        <label className="field">
                          <span>Descrição</span>
                          <div>
                            <input
                              type="text"
                              value={editDescriptionDraft}
                              onChange={(event) => setEditDescriptionDraft(event.target.value)}
                              disabled={isSubmittingEditDescription}
                            />
                          </div>
                        </label>

                        <div className="movement-split-actions">
                          <button
                            className="ghost-action"
                            type="button"
                            onClick={() => {
                              setEditDescriptionMovementId(null)
                              setEditDescriptionDraft('')
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="primary-action"
                            type="submit"
                            disabled={isSubmittingEditDescription}
                          >
                            {isSubmittingEditDescription ? 'Salvando...' : 'Salvar descrição'}
                          </button>
                        </div>
                      </form>
                    )}

                    {isAdmin && isDeleteOpen && (
                      <div className="movement-delete-card">
                        <div className="movement-split-header">
                          <strong>
                            Confirmar exclusão de {movement.name} ({currencyFormatter.format(
                              movement.amount,
                            )})
                          </strong>
                        </div>

                        <div className="movement-split-actions">
                          <button
                            className="ghost-action"
                            type="button"
                            onClick={() => setDeleteMovementId(null)}
                            disabled={isSubmittingDeleteMovement}
                          >
                            Cancelar
                          </button>
                          <button
                            className="primary-action danger"
                            type="button"
                            onClick={() => confirmRemoveMovementEntry(movement)}
                            disabled={isSubmittingDeleteMovement}
                          >
                            {isSubmittingDeleteMovement ? 'Removendo...' : 'Confirmar exclusão'}
                          </button>
                        </div>
                      </div>
                    )}
                  </Fragment>
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
