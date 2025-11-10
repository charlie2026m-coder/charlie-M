import { FaArrowRight, FaArrowLeft } from "react-icons/fa6";
export function CustomPagination({
  totalPages,
  currentPage,
  onPageChange,
}: {
  totalPages: number
  currentPage: number
  onPageChange?: (page: number) => void
}) {
  const handlePageChange = (page: number) => {
    if (page < 0 || page >= totalPages) return
    onPageChange?.(page)
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    // If 9 or fewer pages, show all
    if (totalPages <= 9) {
      return Array.from({ length: totalPages }, (_, i) => i)
    }

    // Show first 5 pages, dots, last 2 pages
    if (currentPage <= 3) {
      return [0, 1, 2, 3, 4, -1, totalPages - 2, totalPages - 1]
    }

    // Show first 2 pages, dots, last 5 pages
    if (currentPage >= totalPages - 4) {
      return [0, 1, -1, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1]
    }

    // Show first 2, dots, current-1/current/current+1, dots, last 2
    return [0, 1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages - 2, totalPages - 1]
  }

  const pageNumbers = getPageNumbers()

  const buttonBaseClass = "flex size-[36px] items-center justify-center rounded-full border transition-colors font-semibold text-sm"
  const pageButtonClass = "border-blue text-dark hover:bg-blue/10"
  const activeButtonClass = "border-blue bg-blue text-white"

  return (
    <nav className="flex items-center justify-center">
      <div className="flex items-center gap-2">
        
          
        <FaArrowLeft className="size-6 cursor-pointer" onClick={() => handlePageChange(currentPage - 1)} />

        {pageNumbers.map((pageNum, idx) => (
          <div key={idx}>
            {pageNum === -1 ? (
              <span className="flex size-[36px] items-center justify-center text-[#2C2C2C]">
                ...
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handlePageChange(pageNum)}
                className={`${buttonBaseClass} ${
                  pageNum === currentPage ? activeButtonClass : pageButtonClass
                }`}
                aria-current={pageNum === currentPage ? "page" : undefined}
              >
                {pageNum + 1}
              </button>
            )}
          </div>
        ))}

          
        <FaArrowRight className="size-6 cursor-pointer" onClick={() => handlePageChange(currentPage + 1)} />
      </div>
    </nav>
  )
}
