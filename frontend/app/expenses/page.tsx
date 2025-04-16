import { ExpensesPage } from "@/components/expenses/expenses-page"
import { Suspense } from "react"

export default function Expenses() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExpensesPage />
    </Suspense>
  )
}
