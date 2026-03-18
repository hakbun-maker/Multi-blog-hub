'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { usePlan } from '@/hooks/usePlan'

type PlanContextType = ReturnType<typeof usePlan>

const PlanCtx = createContext<PlanContextType | null>(null)

export function usePlanContext() {
  const ctx = useContext(PlanCtx)
  if (!ctx) throw new Error('usePlanContext must be used within PlanProvider')
  return ctx
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const planState = usePlan()
  return <PlanCtx.Provider value={planState}>{children}</PlanCtx.Provider>
}
