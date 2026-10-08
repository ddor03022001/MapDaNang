/**
 * Configuration and metadata for Han River Swing Bridge (Cau Song Han).
 */
export const cauSongHanConfig = {
  id: 'cau-song-han',
  name: 'Cầu Sông Hàn',
  icon: '🌉',
  subtitle: 'Han River Swing Bridge • Cầu quay đầu tiên tại VN',
  desc: 'Cây cầu quay lịch sử kết nối đường Lê Duẩn (Hải Châu) và Phạm Văn Đồng (Sơn Trà) do chính kỹ sư Việt Nam thiết kế và thi công. Nhịp giữa dài 122.8m có khả năng xoay 90 độ song song dòng chảy sông Hàn cho tàu bè trọng tải lớn qua lại.',
  stats: [
    { label: 'Chiều dài toàn cầu', val: '487.7 m (nối 2 bờ)' },
    { label: 'Chiều rộng cầu', val: '12.9 m (2 làn xe)' },
    { label: 'Nhịp dầm quay', val: '122.8 m (xoay 90°)' },
    { label: 'Tháp cáp chữ A', val: 'Cao 25.3 m • Dây văng' }
  ],
  defaultCamera: 'cau-song-han:overview',
  cameras: [
    { id: 'cam-sh-overview', preset: 'cau-song-han:overview', label: 'Toàn Cảnh Cầu', icon: '🌉' },
    { id: 'cam-sh-pylon', preset: 'cau-song-han:pylon', label: 'Tháp Cáp & Trụ Xoay', icon: '🗼' },
    { id: 'cam-sh-deck', preset: 'cau-song-han:deck', label: 'Mặt Cầu & Dây Văng', icon: '🛣️' },
    { id: 'cam-sh-river', preset: 'cau-song-han:river', label: 'Dưới Dạ Cầu Sông Hàn', icon: '🚢' }
  ],
  features: [
    {
      id: 'feat-sh-night',
      label: 'Màn Đêm & Đèn LED',
      icon: '🌙',
      type: 'night-view',
      className: 'btn-audio'
    }
  ]
};
