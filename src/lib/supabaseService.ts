import { supabase } from './supabase'

export interface Movement {
  id: string
  name: string
  description?: string | null
  amount: number
  type: 'entrada' | 'saida'
  date: string
  time: string
  allocated_expense_id?: string
}

export interface Expense {
  id: string
  name: string
  target_amount: number
  created_at: string
  status: 'em_andamento' | 'concluida'
}

export interface MovementAllocation {
  id: string
  movement_id: string
  expense_id: string
  created_at: string
}

export interface CounterpartyEvent {
  id: string
  name: string
  description: string
  amount: number
  type: 'devedor' | 'credor'
  created_at: string
}

export interface ConfirmedPaymentClient {
  id: string
  client_number: number
  name: string
  amount: number
  paid: boolean
  created_at: string
  updated_at: string
}

// ============ MOVEMENTS ============

export async function getMovements() {
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .order('date', { ascending: false })
    .order('time', { ascending: false })

  if (error) {
    console.error('Erro ao buscar movimentações:', error)
    return []
  }
  return data || []
}

export async function addMovement(movement: Omit<Movement, 'id'>) {
  const { data, error } = await supabase.from('movements').insert([movement]).select()

  if (error) {
    console.error('Erro ao adicionar movimentação:', error)
    return null
  }
  return data?.[0] || null
}

export async function updateMovement(id: string, updates: Partial<Movement>) {
  const { data, error } = await supabase
    .from('movements')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    const isDescriptionUpdate = Object.prototype.hasOwnProperty.call(updates, 'description')
    const errorMessage = String(error.message || '').toLowerCase()

    if (isDescriptionUpdate && errorMessage.includes('description') && errorMessage.includes('does not exist')) {
      throw new Error(
        'A coluna description não existe na tabela movements. Execute o SQL de migração: ALTER TABLE movements ADD COLUMN IF NOT EXISTS description TEXT;',
      )
    }

    console.error('Erro ao atualizar movimentação:', error)
    throw new Error(error.message || 'Não foi possível atualizar movimentação.')
  }
  return data?.[0] || null
}

export async function deleteMovement(id: string) {
  const { error } = await supabase.from('movements').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar movimentação:', error)
    return false
  }
  return true
}

// ============ EXPENSES ============

export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar despesas:', error)
    return []
  }
  return data || []
}

export async function addExpense(expense: Omit<Expense, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{ ...expense, created_at: new Date().toISOString() }])
    .select()

  if (error) {
    console.error('Erro ao adicionar despesa:', error)
    return null
  }
  return data?.[0] || null
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Erro ao atualizar despesa:', error)
    return null
  }
  return data?.[0] || null
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar despesa:', error)
    return false
  }
  return true
}

// ============ ALLOCATIONS ============

export async function getAllocations(expenseId: string) {
  const { data, error } = await supabase
    .from('movement_allocations')
    .select('*')
    .eq('expense_id', expenseId)

  if (error) {
    console.error('Erro ao buscar alocações:', error)
    return []
  }
  return data || []
}

export async function allocateMovement(movementId: string, expenseId: string) {
  const { data, error } = await supabase
    .from('movement_allocations')
    .insert([{ movement_id: movementId, expense_id: expenseId }])
    .select()

  if (error) {
    console.error('Erro ao alocar movimentação:', error)
    return null
  }
  return data?.[0] || null
}

export async function deallocateMovement(allocationId: string) {
  const { error } = await supabase
    .from('movement_allocations')
    .delete()
    .eq('id', allocationId)

  if (error) {
    console.error('Erro ao desalocar movimentação:', error)
    return false
  }
  return true
}

// ============ COUNTERPARTY EVENTS ============

export async function getCounterpartyEvents() {
  const { data, error } = await supabase
    .from('counterparty_events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar devedores/credores:', error)
    return []
  }
  return data || []
}

export async function addCounterpartyEvent(
  event: Omit<CounterpartyEvent, 'id' | 'created_at'>,
) {
  const { data, error } = await supabase
    .from('counterparty_events')
    .insert([{ ...event, created_at: new Date().toISOString() }])
    .select()

  if (error) {
    console.error('Erro ao adicionar devedor/credor:', error)
    return null
  }
  return data?.[0] || null
}

export async function deleteCounterpartyEvent(id: string) {
  const { error } = await supabase
    .from('counterparty_events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao remover devedor/credor:', error)
    return false
  }
  return true
}

// ============ CONFIRMED PAYMENTS CLIENTS ============

export async function getConfirmedPaymentClients() {
  const { data, error } = await supabase
    .from('confirmed_payment_clients')
    .select('*')
    .order('client_number', { ascending: true })

  if (error) {
    console.error('Erro ao buscar clientes de pagamentos confirmados:', error)
    return []
  }
  return data || []
}

export async function addConfirmedPaymentClient(
  client: Omit<ConfirmedPaymentClient, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await supabase
    .from('confirmed_payment_clients')
    .insert([
      {
        ...client,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()

  if (error) {
    console.error('Erro ao cadastrar cliente de pagamentos confirmados:', error)
    return null
  }
  return data?.[0] || null
}

export async function updateConfirmedPaymentClient(
  id: string,
  updates: Partial<Omit<ConfirmedPaymentClient, 'id' | 'created_at'>>,
) {
  const { data, error } = await supabase
    .from('confirmed_payment_clients')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()

  if (error) {
    console.error('Erro ao atualizar cliente de pagamentos confirmados:', error)
    return null
  }
  return data?.[0] || null
}

export async function deleteConfirmedPaymentClient(id: string) {
  const { error } = await supabase
    .from('confirmed_payment_clients')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao remover cliente de pagamentos confirmados:', error)
    return false
  }
  return true
}

// ============ REALTIME SUBSCRIPTIONS ============

export function subscribeToMovements(callback: (movement: Movement) => void) {
  return supabase
    .channel('movements:*')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'movements' },
      (payload: any) => {
        callback(payload.new)
      },
    )
    .subscribe()
}

export function subscribeToExpenses(callback: (expense: Expense) => void) {
  return supabase
    .channel('expenses:*')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'expenses' },
      (payload: any) => {
        callback(payload.new)
      },
    )
    .subscribe()
}
