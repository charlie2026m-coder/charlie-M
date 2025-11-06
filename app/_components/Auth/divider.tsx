const Divider = () => {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray/20"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-white px-4 text-gray">or</span>
      </div>
    </div>
  )
}

export default Divider