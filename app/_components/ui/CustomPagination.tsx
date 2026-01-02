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
    // If 6 or fewer pages, show all
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i)
    }

    // Show first 4 pages, dots, last page
    if (currentPage <= 2) {
      return [0, 1, 2, 3, -1, totalPages - 1]
    }

    // Show first page, dots, last 4 pages
    if (currentPage >= totalPages - 3) {
      return [0, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1]
    }

    // Show first page, dots, current-1/current, dots, last page
    return [0, -1, currentPage - 1, currentPage, -1, totalPages - 1]
  }

  const pageNumbers = getPageNumbers()

  const buttonBaseClass = "flex size-[36px] items-center justify-center cursor-pointer rounded-full border transition-colors font-semibold text-sm"
  const pageButtonClass = "border-blue text-dark hover:bg-blue/10"
  const activeButtonClass = "border-blue bg-blue text-white"

  return (
    <nav className="flex items-center justify-center mt-auto">
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
