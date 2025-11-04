export default function SimpleSensorCard({ title, value, unit, onDismissAlert, hasAlert }) {
  // Màu đơn giản cho từng loại cảm biến
  const getCardColor = () => {
    switch(title) {
      case 'Nhiệt độ':
        return 'bg-orange-100 border-orange-300'
      case 'Độ ẩm':
        return 'bg-blue-100 border-blue-300'
      case 'Ánh sáng':
        return 'bg-yellow-100 border-yellow-300'
      case 'Bụi mịn':
        return 'bg-gray-100 border-gray-300'
      default:
        return 'bg-white/70 border-white/20'
    }
  }

  const getTextColor = () => {
    switch(title) {
      case 'Nhiệt độ':
        return 'text-orange-600'
      case 'Độ ẩm':
        return 'text-blue-600'
      case 'Ánh sáng':
        return 'text-yellow-600'
      case 'Bụi mịn':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={`${getCardColor()} backdrop-blur-xl rounded-xl shadow-lg p-4 border ${
      hasAlert ? 'border-red-400 ring-2 ring-red-400' : ''
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-medium ${getTextColor()}`}>{title}</h3>
        {hasAlert && onDismissAlert && (
          <button
            onClick={onDismissAlert}
            className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
          >
            Tắt
          </button>
        )}
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        {unit && <span className="ml-1 text-gray-500">{unit}</span>}
      </div>
    </div>
  )
}
