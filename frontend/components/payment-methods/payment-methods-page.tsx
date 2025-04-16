"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PaymentMethodForm } from "@/components/payment-methods/payment-method-form"
import { PaymentMethodsList } from "@/components/payment-methods/payment-methods-list"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { getPaymentMethods, type PaymentMethodData } from "@/lib/api"
import { PlusCircle } from "lucide-react"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 20

// Function to generate pagination page number/ellipsis items (Simplified)
const generatePaginationPageItems = (
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void,
): React.ReactNode[] => {
  const pageItems: React.ReactNode[] = []
  const siblingCount = 1 // How many pages to show on each side of the current page

  const range = (start: number, end: number) => {
    const length = end - start + 1
    return Array.from({ length }, (_, idx) => idx + start)
  }

  // Pages to display: firstPage + lastPage + currentPage + 2*siblings + 2*ellipsis
  const totalPageNumbersToShow = siblingCount + 5

  /*
      Case 1: If the number of pages is less than the page numbers we want to show
      in the paginationComponent, we return the range [1..totalPages]
    */
  if (totalPageNumbersToShow >= totalPages) {
    const pageRange = range(1, totalPages)
    pageRange.forEach((num) =>
      pageItems.push(
        <PaginationItem key={num}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onPageChange(num)
            }}
            isActive={num === currentPage}
          >
            {num}
          </PaginationLink>
        </PaginationItem>,
      ),
    )
    return pageItems
  }

  /*
    	Calculate left and right sibling index and make sure they are within range 1..totalPages
    */
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  /*
      We do not show dots just when there is just one page number to be inserted between
      the extremes of sibling and the page limits i.e 1 and totalPages. Hence we are using
      leftSiblingIndex > 2 and rightSiblingIndex < totalPages - 1
    */
  const shouldShowLeftEllipsis = leftSiblingIndex > 2
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1

  const firstPageIndex = 1
  const lastPageIndex = totalPages

  /*
    	Case 2: No left dots to show, but rights dots to be shown
    */
  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount
    const leftRange = range(1, leftItemCount)

    leftRange.forEach((num) =>
      pageItems.push(
        <PaginationItem key={num}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onPageChange(num)
            }}
            isActive={num === currentPage}
          >
            {num}
          </PaginationLink>
        </PaginationItem>,
      ),
    )
    pageItems.push(
      <PaginationItem key="end-ellipsis">
        <PaginationEllipsis />
      </PaginationItem>,
    )
    pageItems.push(
      <PaginationItem key={lastPageIndex}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onPageChange(lastPageIndex)
          }}
          isActive={lastPageIndex === currentPage}
        >
          {lastPageIndex}
        </PaginationLink>
      </PaginationItem>,
    )
  } else if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    /*
    	Case 3: No right dots to show, but left dots to be shown
    */
    const rightItemCount = 3 + 2 * siblingCount
    const rightRange = range(totalPages - rightItemCount + 1, totalPages)

    pageItems.push(
      <PaginationItem key={firstPageIndex}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onPageChange(firstPageIndex)
          }}
          isActive={firstPageIndex === currentPage}
        >
          {firstPageIndex}
        </PaginationLink>
      </PaginationItem>,
    )
    pageItems.push(
      <PaginationItem key="start-ellipsis">
        <PaginationEllipsis />
      </PaginationItem>,
    )
    rightRange.forEach((num) =>
      pageItems.push(
        <PaginationItem key={num}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onPageChange(num)
            }}
            isActive={num === currentPage}
          >
            {num}
          </PaginationLink>
        </PaginationItem>,
      ),
    )
  } else if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    /*
    	Case 4: Both left and right dots to be shown
    */
    const middleRange = range(leftSiblingIndex, rightSiblingIndex)

    pageItems.push(
      <PaginationItem key={firstPageIndex}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onPageChange(firstPageIndex)
          }}
          isActive={firstPageIndex === currentPage}
        >
          {firstPageIndex}
        </PaginationLink>
      </PaginationItem>,
    )
    pageItems.push(
      <PaginationItem key="start-ellipsis">
        <PaginationEllipsis />
      </PaginationItem>,
    )
    middleRange.forEach((num) =>
      pageItems.push(
        <PaginationItem key={num}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onPageChange(num)
            }}
            isActive={num === currentPage}
          >
            {num}
          </PaginationLink>
        </PaginationItem>,
      ),
    )
    pageItems.push(
      <PaginationItem key="end-ellipsis">
        <PaginationEllipsis />
      </PaginationItem>,
    )
    pageItems.push(
      <PaginationItem key={lastPageIndex}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onPageChange(lastPageIndex)
          }}
          isActive={lastPageIndex === currentPage}
        >
          {lastPageIndex}
        </PaginationLink>
      </PaginationItem>,
    )
  }

  return pageItems
}

export function PaymentMethodsPage() {
  const { isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)
  const [paymentMethodToEdit, setPaymentMethodToEdit] = useState<PaymentMethodData | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPaymentMethods, setTotalPaymentMethods] = useState(0)

  useEffect(() => {
    if (!authLoading) {
      fetchPaymentMethods(currentPage)
    }
  }, [authLoading, currentPage])

  const fetchPaymentMethods = async (page: number) => {
    try {
      setIsLoading(true)
      const skip = (page - 1) * ITEMS_PER_PAGE
      const data = await getPaymentMethods(skip, ITEMS_PER_PAGE)
      if (Array.isArray(data)) {
        setPaymentMethods(data)
        setTotalPaymentMethods(data.length)
        console.warn("API response for getPaymentMethods was an array, pagination might not work as expected.")
      } else if (data && Array.isArray(data.items)) {
        setPaymentMethods(data.items)
        setTotalPaymentMethods(data.total || 0)
      } else {
        console.error("Invalid data received from getPaymentMethods:", data)
        toast.error("Failed to load payment methods due to invalid data format")
        setPaymentMethods([])
        setTotalPaymentMethods(0)
      }
    } catch (error) {
      console.error("Failed to fetch payment methods:", error)
      toast.error("Failed to load payment methods")
      setPaymentMethods([])
      setTotalPaymentMethods(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPaymentMethod = () => {
    setPaymentMethodToEdit(undefined)
    setShowPaymentMethodForm(true)
  }

  const handleEditPaymentMethod = (paymentMethod: PaymentMethodData) => {
    setPaymentMethodToEdit(paymentMethod)
    setShowPaymentMethodForm(true)
  }

  const handleSuccess = () => {
    setShowPaymentMethodForm(false)
    fetchPaymentMethods(currentPage)
  }

  const totalPages = Math.ceil(totalPaymentMethods / ITEMS_PER_PAGE)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <MobileNav />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader
          title="Payment Methods"
          description="Manage your payment methods"
          action={
            <Button onClick={handleAddPaymentMethod}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <PaymentMethodsList
              paymentMethods={paymentMethods}
              onEdit={handleEditPaymentMethod}
              onRefresh={() => fetchPaymentMethods(currentPage)}
            />
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(currentPage - 1)
                        }}
                        aria-disabled={currentPage === 1}
                        tabIndex={currentPage === 1 ? -1 : undefined}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                    {/* Render page numbers and ellipsis */}
                    {generatePaginationPageItems(currentPage, totalPages, handlePageChange)}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(currentPage + 1)
                        }}
                        aria-disabled={currentPage === totalPages}
                        tabIndex={currentPage === totalPages ? -1 : undefined}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      <PaymentMethodForm
        isOpen={showPaymentMethodForm}
        onClose={() => setShowPaymentMethodForm(false)}
        onSuccess={handleSuccess}
        paymentMethodToEdit={paymentMethodToEdit}
      />
    </div>
  )
}
