/**
 * Configuration and metadata for City Overview (Toan Canh Da Nang).
 */
export const overviewConfig = {
  id: 'overview',
  name: 'Toàn Cảnh Đà Nẵng',
  icon: '🌐',
  subtitle: 'Thành phố ánh sáng bên bờ Sông Hàn',
  desc: 'Mạng lưới quy hoạch hiện đại kết nối quận Hải Châu và quận Sơn Trà. Nổi bật với các cây cầu huyền thoại, đường bờ biển dài 10km và các đại lộ 6 làn xe rợp bóng cây.',
  stats: [
    { label: 'Trục Đông - Tây', val: 'Nguyễn Văn Linh • Võ Văn Kiệt' },
    { label: 'Trục Ven Sông', val: 'Bạch Đằng • Trần Hưng Đạo' },
    { label: 'Cây Cầu Nổi Tiếng', val: 'Cầu Rồng • Cầu Sông Hàn' },
    { label: 'Bãi Biển Forbes', val: 'Biển Mỹ Khê (Top 6 hành tinh)' }
  ],
  defaultCamera: 'overview:city',
  cameras: [
    { id: 'cam-city', preset: 'overview:city', label: 'Toàn Cảnh Đô Thị', icon: '🏙️' },
    { id: 'cam-hanriver', preset: 'overview:han-river', label: 'Dọc Sông Hàn', icon: '🚢' },
    { id: 'cam-eastwest', preset: 'overview:axis', label: 'Trục Cầu Ra Biển', icon: '🌇' }
  ],
  features: [
    {
      id: 'feat-traffic',
      label: 'Lưu Thông Xe Cộ',
      icon: '🚗',
      type: 'toggle',
      className: 'btn-wave'
    }
  ]
};
