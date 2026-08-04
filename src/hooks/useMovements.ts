import { useCallback, useEffect, useState } from 'react'
import { getMovements, addMovement, deleteMovement, updateMovement } from '../lib/supabaseService'

export type Movement = {
  id: string
  name: string
  description?: string
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

function addSecondsToTime(time: string, secondsToAdd: number) {
  const [rawHour = '0', rawMinute = '0', rawSecond = '0'] = String(time).split(':')
  const hour = Number(rawHour)
  const minute = Number(rawMinute)
  const second = Number(rawSecond)

  if (Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
    return time
  }

  const baseDate = new Date(2000, 0, 1, hour, minute, second, 0)
  baseDate.setSeconds(baseDate.getSeconds() + secondsToAdd)

  const hh = String(baseDate.getHours()).padStart(2, '0')
  const mm = String(baseDate.getMinutes()).padStart(2, '0')
  const ss = String(baseDate.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
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
        description: m.description ?? undefined,
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
        description: movement.description,
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
          description: m.description ?? undefined,
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

  const updateMovementDescription = async (id: string, description?: string) => {
    const normalizedDescription = description?.trim() || undefined

    // Atualização otimista.
    setMovements((prev) =>
      prev.map((movement) =>
        movement.id === id
          ? {
              ...movement,
              description: normalizedDescription,
            }
          : movement,
      ),
    )

    try {
      const updated = await updateMovement(id, {
        description: normalizedDescription,
      })

      if (!updated) {
        throw new Error('Não foi possível atualizar a descrição da movimentação.')
      }

      return updated
    } catch (err) {
      console.error('Erro ao atualizar descrição da movimentação:', err)
      await reloadMovements()
      throw err
    }
  }

  const splitMovement = async (
    id: string,
    parts: Array<{ name?: string; description?: string; amount: number }>,
  ) => {
    const originalMovement = movements.find((movement) => movement.id === id)
    if (!originalMovement) {
      throw new Error('Movimentação original não encontrada.')
    }

    if (parts.length < 2) {
      throw new Error('Informe ao menos 2 partes para dividir a movimentação.')
    }

    const totalParts = Number(
      parts.reduce((sum, part) => sum + Number(part.amount || 0), 0).toFixed(2),
    )
    const totalOriginal = Number(originalMovement.amount.toFixed(2))

    if (Math.abs(totalParts - totalOriginal) > 0.01) {
      throw new Error('A soma das partes deve ser igual ao valor da movimentação original.')
    }

    const createdMovementIds: string[] = []

    try {
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index]
        const amount = Number(part.amount)
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error(`Valor inválido na parte ${index + 1}.`)
        }

        const result = await addMovement({
          name:
            part.name?.trim() ||
            `${originalMovement.name} (${index + 1}/${parts.length})`,
          description: part.description?.trim() || undefined,
          amount,
          type: originalMovement.type,
          date: originalMovement.date,
          time: addSecondsToTime(originalMovement.time, index + 1),
        })

        if (!result) {
          throw new Error(`Não foi possível criar a parte ${index + 1}.`)
        }

        createdMovementIds.push(result.id)
      }

      const removed = await deleteMovement(id)
      if (!removed) {
        throw new Error('Não foi possível remover a movimentação original após dividir.')
      }

      await reloadMovements()
    } catch (err) {
      for (const createdId of createdMovementIds) {
        await deleteMovement(createdId)
      }

      await reloadMovements()
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
    updateMovementDescription,
    splitMovement,
  }
}
