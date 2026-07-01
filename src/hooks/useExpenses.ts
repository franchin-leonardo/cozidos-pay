import { useEffect, useState } from 'react'
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getAllocations,
  allocateMovement,
  deallocateMovement,
} from '../lib/supabaseService'

export type Expense = {
  id: string
  name: string
  targetAmount: number
  movementIds: string[]
  status?: 'em_andamento' | 'concluida'
}

type ExpenseDB = {
  id: string
  name: string
  target_amount: number
  status: 'em_andamento' | 'concluida'
}

export function useExpenses(initialData: Expense[]) {
  const [expenses, setExpenses] = useState<Expense[]>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allocations, setAllocations] = useState<Record<string, string[]>>({})

  // Carregar despesas do Supabase ao montar
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true)
        const data = await getExpenses()
        if (data && data.length > 0) {
          // Mapear dados do Supabase para o formato esperado
          const expensesList = (data as ExpenseDB[]).map((e) => ({
            id: e.id,
            name: e.name,
            targetAmount: Number(e.target_amount),
            status: e.status,
            movementIds: [] as string[],
          }))

          // Carregar alocações para cada despesa
          const allAllocations: Record<string, string[]> = {}
          for (const expense of expensesList) {
            const expenseAllocations = await getAllocations(expense.id)
            allAllocations[expense.id] = expenseAllocations.map(
              (a: any) => a.movement_id,
            )
            expense.movementIds = allAllocations[expense.id]
          }

          setAllocations(allAllocations)
          setExpenses(expensesList)
        }
        setError(null)
      } catch (err) {
        console.error('Erro ao carregar despesas:', err)
        setError('Não foi possível carregar as despesas')
      } finally {
        setLoading(false)
      }
    }

    loadExpenses()
  }, [])

  const addNewExpense = async (
    name: string,
    targetAmount: number,
  ): Promise<Expense | null> => {
    try {
      const result = await addExpense({
        name,
        target_amount: Number(targetAmount),
        status: 'em_andamento',
      })

      if (result) {
        const newExpense: Expense = {
          id: result.id,
          name: result.name,
          targetAmount: Number(result.target_amount),
          status: result.status,
          movementIds: [],
        }
        setExpenses((prev) => [newExpense, ...prev])
        setAllocations((prev) => ({ ...prev, [result.id]: [] }))
        return newExpense
      }
      return null
    } catch (err) {
      console.error('Erro ao adicionar despesa:', err)
      throw err
    }
  }

  const updateExpenseName = async (id: string, newName: string, newAmount: number) => {
    try {
      const result = await updateExpense(id, {
        name: newName,
        target_amount: Number(newAmount),
      })
      if (result) {
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  name: result.name,
                  targetAmount: Number(result.target_amount),
                }
              : e,
          ),
        )
      }
    } catch (err) {
      console.error('Erro ao atualizar despesa:', err)
      throw err
    }
  }

  const removeExpense = async (id: string) => {
    try {
      const success = await deleteExpense(id)
      if (success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
        setAllocations((prev) => {
          const newAllocations = { ...prev }
          delete newAllocations[id]
          return newAllocations
        })
      }
    } catch (err) {
      console.error('Erro ao deletar despesa:', err)
      throw err
    }
  }

  const assignMovementToExpense = async (expenseId: string, movementId: string) => {
    try {
      const result = await allocateMovement(movementId, expenseId)
      if (result) {
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expenseId
              ? {
                  ...e,
                  movementIds: [...new Set([...e.movementIds, movementId])],
                }
              : e,
          ),
        )
        setAllocations((prev) => ({
          ...prev,
          [expenseId]: [...new Set([...(prev[expenseId] || []), movementId])],
        }))
      }
    } catch (err) {
      console.error('Erro ao alocar movimentação:', err)
      throw err
    }
  }

  const removeMovementFromExpense = async (expenseId: string, movementId: string) => {
    try {
      // Procurar alocação pelo ID
      const allocationData = await getAllocations(expenseId)
      const allocation = allocationData.find((a: any) => a.movement_id === movementId)

      if (allocation) {
        const success = await deallocateMovement(allocation.id)
        if (success) {
          setExpenses((prev) =>
            prev.map((e) =>
              e.id === expenseId
                ? {
                    ...e,
                    movementIds: e.movementIds.filter((id) => id !== movementId),
                  }
                : e,
            ),
          )
          setAllocations((prev) => ({
            ...prev,
            [expenseId]: prev[expenseId]?.filter((id) => id !== movementId) || [],
          }))
        }
      }
    } catch (err) {
      console.error('Erro ao desalocar movimentação:', err)
      throw err
    }
  }

  return {
    expenses,
    setExpenses,
    allocations,
    loading,
    error,
    addNewExpense,
    updateExpenseName,
    removeExpense,
    assignMovementToExpense,
    removeMovementFromExpense,
  }
}
