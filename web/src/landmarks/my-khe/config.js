/**
 * Configuration and metadata for My Khe Beach (Bien My Khe).
 */
export const myKheConfig = {
  id: 'my-khe',
  name: 'Biển Mỹ Khê',
  icon: '🏖️',
  subtitle: 'My Khe Beach • Top 6 bãi biển đẹp nhất hành tinh',
  desc: 'Bãi biển được tạp chí Forbes vinh danh với bờ cát trắng mịn thoai thoải, làn nước trong xanh ngọc bích, rặng dừa nhiệt đới nghiêng bóng mát và sóng biển dạt dào quanh năm. Cửa ngõ kết nối trực tiếp với Đại lộ Võ Văn Kiệt.',
  stats: [
    { label: 'Dải bờ biển', val: 'Dài ~10 km biển Mỹ Khê' },
    { label: 'Bờ cát & Rặng dừa', val: 'Cát trắng mịn • Dừa nhiệt đới' },
    { label: 'Vinh danh Forbes', val: 'Top 6 đẹp nhất hành tinh' },
    { label: 'Bản sắc miền biển', val: 'Thuyền thúng tre • Lướt sóng' }
  ],
  defaultCamera: 'my-khe:overview',
  cameras: [
    { id: 'cam-mk-overview', preset: 'my-khe:overview', label: 'Toàn Cảnh Bãi Biển', icon: '🏖️' },
    { id: 'cam-mk-junction', preset: 'my-khe:junction', label: 'Cửa Ngõ Võ Văn Kiệt', icon: '🛣️' },
    { id: 'cam-mk-sand', preset: 'my-khe:beach', label: 'Bờ Cát & Rặng Dừa', icon: '🌴' },
    { id: 'cam-mk-waves', preset: 'my-khe:waves', label: 'Mép Sóng & Thuyền Thúng', icon: '🌊' }
  ],
  features: [
    {
      id: 'feat-wave-surge',
      label: 'Sóng Biển Dạt Dào',
      icon: '🌊',
      type: 'wave',
      className: 'btn-wave'
    },
    {
      id: 'feat-ocean-audio',
      label: 'Tiếng Sóng Biển',
      icon: '🔊',
      type: 'audio',
      className: 'btn-audio'
    }
  ]
};
