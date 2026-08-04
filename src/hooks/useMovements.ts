import { useCallback, useEffect, useState } from 'react'
import { getMovements, addMovement, deleteMovement } from '../lib/supabaseService'

export type Movement = {
  id: string
  name: string
  amount: number
  type: 'entrada' | 'saida'
  date: string
  time: string
}

function normalizeMovementName(name: string) {
  return String(name ?? '').trim().toLowerCase()
}

function movementKey(movement: Omit<Movement, 'id'>) {
  return [
    normalizeMovementName(movement.name),
    Number(movement.amount).toFixed(2),
    movement.type,
    movement.date,
    movement.time,
  ].join('|')
}

export function useMovements(initialData: Movement[]) {
  const [movements, setMovements] = useState<Movement[]>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reloadMovements = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getMovements()
      // Sempre sincroniza com Supabase, inclusive quando vazio.
      const mapped = data.map((m: any) => ({
        id: m.id,
        name: m.name,
        amount: Number(m.amount),
        type: m.type as 'entrada' | 'saida',
        date: m.date,
        time: m.time,
      }))

      // Evita renderizar movimentações repetidas quando já existem duplicadas no banco.
      const uniqueMovements = new Map<string, Movement>()
      for (const movement of mapped) {
        const key = movementKey(movement)
        if (!uniqueMovements.has(key)) {
          uniqueMovements.set(key, movement)
        }
      }

      setMovements(Array.from(uniqueMovements.values()))
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err)
      setError('Não foi possível carregar as movimentações')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar movimentações do Supabase ao montar
  useEffect(() => {
    reloadMovements()
  }, [reloadMovements])

  const addNewMovement = async (movement: Omit<Movement, 'id'>) => {
    try {
      const newMovementKey = movementKey(movement)
      const isDuplicate = movements.some((item) => movementKey(item) === newMovementKey)
      if (isDuplicate) {
        throw new Error('Já existe uma movimentação igual no extrato.')
      }

      // Otimistic update
      const tempId = `temp-${Date.now()}`
      const tempMovement = { ...movement, id: tempId } as Movement
      setMovements((prev) => [tempMovement, ...prev])

      // Enviar para Supabase
      const result = await addMovement({
        name: movement.name,
        amount: Number(movement.amount),
        type: movement.type,
        date: movement.date,
        time: movement.time,
      })

      if (result) {
        // Substituir ID temporário pelo real
        setMovements((prev) =>
          prev.map((m) => (m.id === tempId ? { ...result, amount: Number(result.amount) } : m)),
        )
      } else {
        setMovements((prev) => prev.filter((m) => m.id !== tempId))
        throw new Error('Não foi possível salvar a movimentação.')
      }
      return result
    } catch (err) {
      console.error('Erro ao adicionar movimentação:', err)
      // Remover otimistic update em caso de erro
      setMovements((prev) => prev.filter((m) => !m.id.startsWith('temp-')))
      throw err
    }
  }

  const removeMovement = async (id: string) => {
    try {
      // Otimistic update
      setMovements((prev) => prev.filter((m) => m.id !== id))

      // Remover do Supabase
      const success = await deleteMovement(id)
      if (!success) {
        // Reverter se falhar
        throw new Error('Falha ao deletar')
      }
    } catch (err) {
      console.error('Erro ao deletar movimentação:', err)
      // Recarregar movimentações
      const data = await getMovements()
      if (data) {
        const mapped = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          amount: Number(m.amount),
          type: m.type as 'entrada' | 'saida',
          date: m.date,
          time: m.time,
        }))
        setMovements(mapped)
      }
      throw err
    }
  }

  return {
    movements,
    setMovements,
    loading,
    error,
    reloadMovements,
    addNewMovement,
    removeMovement,
  }
}
