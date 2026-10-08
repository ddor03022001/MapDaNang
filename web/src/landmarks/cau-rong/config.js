/**
 * Configuration and metadata for Dragon Bridge (Cau Rong).
 */
export const cauRongConfig = {
  id: 'cau-rong',
  name: 'Cầu Rồng Đà Nẵng',
  icon: '🐉',
  subtitle: 'Dragon Bridge • Biểu tượng sông Hàn',
  desc: 'Cây cầu vòm thép đơn độc đáo mô phỏng con rồng thời Lý bay ra biển Đông. Đầu rồng ngẩng cao tại bờ Đông (Sơn Trà), đuôi hoa sen nở tại bờ Tây (Hải Châu). Nổi tiếng với màn trình diễn phun lửa và phun nước rực rỡ vào mỗi dịp cuối tuần.',
  stats: [
    { label: 'Chiều dài thật', val: '666 m (6 làn xe)' },
    { label: 'Chiều rộng mặt cầu', val: '37.5 m' },
    { label: 'Chiều cao vòm rồng', val: '48.0 m (5 nhịp)' },
    { label: 'Đầu rồng thời Lý', val: '18.2 m • 194.1 tấn' }
  ],
  defaultCamera: 'cau-rong:overview',
  cameras: [
    { id: 'cam-cr-overview', preset: 'cau-rong:overview', label: 'Toàn Cảnh Cầu', icon: '🐉' },
    { id: 'cam-cr-head', preset: 'cau-rong:head', label: 'Đầu Rồng', icon: '🐲' },
    { id: 'cam-cr-deck', preset: 'cau-rong:deck', label: 'Thân Rồng & Mặt Cầu', icon: '🛣️' },
    { id: 'cam-cr-tail', preset: 'cau-rong:tail', label: 'Đuôi Rồng Hoa Sen', icon: '🪷' },
    { id: 'cam-cr-river', preset: 'cau-rong:river', label: 'Ngắm Từ Sông Hàn', icon: '🚢' }
  ],
  features: [
    {
      id: 'feat-fire',
      label: 'Phun Lửa',
      icon: '🔥',
      type: 'fire',
      className: 'btn-fire'
    },
    {
      id: 'feat-water',
      label: 'Phun Nước',
      icon: '💧',
      type: 'water',
      className: 'btn-water'
    }
  ]
};
