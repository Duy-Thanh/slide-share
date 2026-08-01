'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, AlertCircle, Ban, Zap } from 'lucide-react';

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      {/* TOP NAVIGATION */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trang chủ</span>
          </Link>

          {/* <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            SonderNet community standards
          </span> */}
        </div>
      </nav>

      {/* HEADER SECTION */}
      <header className="border-b border-slate-200 bg-white py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold tracking-wide">
            <Shield className="w-3.5 h-3.5 text-blue-600" /> TIÊU CHUẨN CỘNG ĐỒNG VÀ NGUYÊN TẮC VẬN HÀNH
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
            Tiêu chuẩn cộng đồng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            SonderNet là không gian mở dành cho sinh viên chia sẻ tri thức và kết nối. 
            Để đảm bảo môi trường công bằng, vui lòng tuân thủ các nguyên tắc dưới đây
          </p>
        </div>
      </header>

      {/* CORE CONTENT */}
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-8">
        
        {/* EXECUTIVE SUMMARY */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 flex items-start gap-3">
          <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-semibold text-blue-950 leading-relaxed">
            <strong className="font-extrabold">Tóm tắt nhanh:</strong> Tôn trọng lẫn nhau, chỉ đăng tài liệu chính xác và nói không với spam và tội phạm mạng. Mọi hành vi phá hoại đều dẫn đến việc đình chỉ tài khoản
          </p>
        </div>

        {/* GUIDELINE SECTIONS */}
        <div className="space-y-6">
          
          {/* RULE 1 */}
          <section className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <span className="absolute right-4 top-2 text-6xl font-black text-slate-100 select-none pointer-events-none">
              01
            </span>
            <div className="relative z-10 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Giao tiếp và văn hoá tranh luận
              </h2>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Tranh luận văn minh:</strong> Tập trung vào lập luận và kiến thức chuyên môn. Nghiêm cấm công kích cá nhân, xúc phạm gia đình, miệt thị vùng miền hoặc phát ngôn thù hận</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Không bắt nạt trực tuyến:</strong> Lập hội nhóm tẩy chay, đe dọa hoặc làm phiền thành viên khác sẽ bị khóa tài khoản ngay lập tức</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Thái độ cởi mở:</strong> Tích cực hỗ trợ tân sinh viên và người mới. Không sử dụng từ ngữ coi thường hay mỉa mai người khác</span>
                </li>
              </ul>
            </div>
          </section>

          {/* RULE 2 */}
          <section className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <span className="absolute right-4 top-2 text-6xl font-black text-slate-100 select-none pointer-events-none">
              02
            </span>
            <div className="relative z-10 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Chất lượng tài liệu chia sẻ
              </h2>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Chỉ đăng file thật:</strong> Cấm tải lên tập tin hỏng, tập tin rỗng, đặt sai tên môn học hoặc chứa mã độc nhằm trục lợi Coins</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Tôn trọng tác giả:</strong> Ghi rõ nguồn gốc hoặc tên tác giả đối với tài liệu sưu tầm. Không tự nhận quyền sở hữu đối với công trình của người khác</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Nội dung cấm đăng:</strong> Văn hóa phẩm độc hại, cá độ, dịch vụ học hộ/thi hộ, nội dung vi phạm pháp luật hoặc thông tin sai sự thật</span>
                </li>
              </ul>
            </div>
          </section>

          {/* RULE 3 */}
          <section className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <span className="absolute right-4 top-2 text-6xl font-black text-slate-100 select-none pointer-events-none">
              03
            </span>
            <div className="relative z-10 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Tính minh bạch và chống spam
              </h2>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Không spam:</strong> Không đăng lại một nội dung nhiều lần, chèn link quảng cáo lừa đảo hoặc rao vặt dịch vụ ngoài hệ thống</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Không gian lận Coins:</strong> Nghiêm cấm dùng tài khoản phụ (clone) hoặc công cụ tự động để buff điểm, tăng upvote ảo. Vi phạm sẽ bị thu hồi toàn bộ Coins</span>
                </li>
              </ul>
            </div>
          </section>

        </div>

        {/* PENALTY SYSTEM */}
        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Ban className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Hình thức xử lý vi phạm</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
            <div className="p-3 bg-slate-800/80 rounded-lg space-y-1">
              <span className="text-amber-400 font-bold block">1. Nhắc nhở</span>
              <p className="text-slate-400">Tạm ẩn bài viết & gửi cảnh báo hệ thống cho vi phạm nhẹ lần đầu</p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg space-y-1">
              <span className="text-rose-400 font-bold block">2. Tạm khóa</span>
              <p className="text-slate-400">Khóa quyền đăng bài 7 ngày, thu hồi Badge và trừ 50% Coins</p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg space-y-1">
              <span className="text-rose-500 font-bold block">3. Khóa vĩnh viễn</span>
              <p className="text-slate-400">Cấm tài khoản và chặn địa chỉ IP vĩnh viễn đối với vi phạm nghiêm trọng</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center text-xs text-slate-400 font-medium pt-4">
          © CyberDay Studios Publishing. All right reserved
        </div>

      </div>
    </main>
  );
}