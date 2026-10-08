/**
 * Configuration and metadata for Marble Mountains (Ngũ Hành Sơn).
 */
export const nguHanhSonConfig = {
  id: 'ngu-hanh-son',
  name: 'Ngũ Hành Sơn',
  icon: '⛰️',
  subtitle: 'Marble Mountains • Non Nước Danh Thắng',
  desc: 'Quần thể 5 ngọn núi đá vôi cẩm thạch kỳ vĩ mang tên 5 yếu tố ngũ hành: Kim, Mộc, Thủy, Hỏa, Thổ. Nổi tiếng với Tháp Xá Lợi 7 tầng hướng biển, chùa Linh Ứng cổ kính, Động Huyền Không với luồng sáng giếng trời huyền ảo và làng đá mỹ nghệ Non Nước truyền thống.',
  stats: [
    { label: '5 Ngọn Ngũ Hành', val: 'Kim • Mộc • Thủy • Hỏa • Thổ' },
    { label: 'Đỉnh cao nhất', val: 'Thủy Sơn (106 m • 2 đỉnh)' },
    { label: 'Bảo tháp & Chùa cổ', val: 'Tháp Xá Lợi 7 tầng • Chùa Linh Ứng' },
    { label: 'Hang động kỳ vĩ', val: 'Động Huyền Không (Giếng trời)' },
    { label: 'Di sản làng nghề', val: 'Đá mỹ nghệ Non Nước (400 năm)' }
  ],
  defaultCamera: 'ngu-hanh-son:overview',
  cameras: [
    { id: 'cam-nhs-overview', preset: 'ngu-hanh-son:overview', label: 'Toàn Cảnh 5 Núi', icon: '⛰️' },
    { id: 'cam-nhs-thap', preset: 'ngu-hanh-son:thap-xa-loi', label: 'Tháp Xá Lợi 7 Tầng', icon: '🗼' },
    { id: 'cam-nhs-cave', preset: 'ngu-hanh-son:dong-huyen-khong', label: 'Động Huyền Không', icon: '✨' },
    { id: 'cam-nhs-temple', preset: 'ngu-hanh-son:chua-linh-ung', label: 'Chùa Linh Ứng Cổ Tự', icon: '🛕' },
    { id: 'cam-nhs-view', preset: 'ngu-hanh-son:vong-hai-dai', label: 'Vọng Hải Đài Ngắm Biển', icon: '🌊' }
  ],
  features: [
    {
      id: 'feat-temple-bell',
      label: 'Chuông Chùa Linh Ứng',
      icon: '🔔',
      type: 'bell',
      className: 'btn-audio'
    },
    {
      id: 'feat-divine-light',
      label: 'Luồng Sáng Giếng Trời',
      icon: '✨',
      type: 'light-beam',
      className: 'btn-fire'
    },
    {
      id: 'feat-nhs-night',
      label: 'Thắp Sáng Đèn Tháp',
      icon: '🏮',
      type: 'night-view',
      className: 'btn-wave'
    }
  ]
};
