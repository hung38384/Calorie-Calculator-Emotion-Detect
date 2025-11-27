import { useEffect, useState } from 'react';
import { PlusCircle, Trash2, AlertCircle, Droplets } from 'lucide-react';

const STORAGE_KEY = 'symptomLogs';

export const SymptomLogger = () => {
  const [logs, setLogs] = useState([]);
  const [note, setNote] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [severity, setSeverity] = useState('mild');
  const [stoolType, setStoolType] = useState('none');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setLogs(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const addLog = () => {
    const entry = {
      id: Date.now(),
      note,
      emotion,
      severity,
      stoolType,
      time: new Date().toISOString()
    };
    setLogs([entry, ...logs]);
    setNote('');
    setStoolType('none');

    // Call server API to get supportive advice from Gemini
    (async () => {
      try {
        const res = await fetch('/api/gemini_advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        const data = await res.json();
        if (data?.success && data?.advice) {
          // Attach advice to the most recent entry in logs
          setLogs((prev) => {
            const updated = prev.map((l) => (l.id === entry.id ? { ...l, advice: data.advice } : l));
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to get advice:', err);
      }
    })();
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const bristolTypes = [
    { value: 'none', label: 'Không ghi nhận', desc: '' },
    { value: 'type1', label: 'Loại 1: Táo bón nặng', desc: 'Cục cứng riêng biệt, khó đi' },
    { value: 'type2', label: 'Loại 2: Táo bón nhẹ', desc: 'Hình xúc xích, lổn nhổn' },
    { value: 'type3', label: 'Loại 3: Bình thường', desc: 'Hình xúc xích, có vết nứt' },
    { value: 'type4', label: 'Loại 4: Tốt nhất', desc: 'Hình xúc xích, mềm và trơn' },
    { value: 'type5', label: 'Loại 5: Thiếu chất xơ', desc: 'Viên mềm, cạnh rõ ràng' },
    { value: 'type6', label: 'Loại 6: Tiêu chảy nhẹ', desc: 'Mảnh xốp, cạnh lởm chởm' },
    { value: 'type7', label: 'Loại 7: Tiêu chảy nặng', desc: 'Hoàn toàn lỏng, không có xác' },
  ];

  return (
    <div className="card bg-base-100 shadow-xl mt-6 w-full">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Ghi nhận triệu chứng / Tâm trạng
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Ghi chú triệu chứng</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-32"
              placeholder="Ví dụ: đau bụng sau khi uống sữa, đầy hơi..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Cảm xúc & Mức độ</span>
              </label>
              <div className="flex gap-2">
                <select
                  className="select select-bordered flex-1"
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                >
                  <option value="neutral">😐 Bình thường</option>
                  <option value="happy">😊 Vui</option>
                  <option value="sad">😢 Buồn</option>
                  <option value="angry">😠 Khó chịu</option>
                  <option value="surprised">😮 Ngạc nhiên</option>
                  <option value="fearful">😨 Lo lắng</option>
                </select>
                <select
                  className="select select-bordered flex-1"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="mild">🟢 Nhẹ</option>
                  <option value="moderate">🟡 Vừa</option>
                  <option value="severe">🔴 Nặng</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Droplets className="w-4 h-4" /> Biểu đồ phân (Bristol)
                </span>
              </label>
              <select
                className="select select-bordered w-full"
                value={stoolType}
                onChange={(e) => setStoolType(e.target.value)}
              >
                {bristolTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {stoolType !== 'none' && (
                <label className="label">
                  <span className="label-text-alt text-base-content/70">
                    {bristolTypes.find(t => t.value === stoolType)?.desc}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="card-actions justify-end">
          <button className="btn btn-outline btn-error gap-2" onClick={clearLogs}>
            <Trash2 className="w-4 h-4" /> Xóa tất cả
          </button>
          <button className="btn btn-primary gap-2" onClick={addLog} disabled={!note && stoolType === 'none'}>
            <PlusCircle className="w-4 h-4" /> Thêm ghi chép
          </button>
        </div>

        <div className="divider"></div>

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-4">Ghi chép gần đây</h3>
          {logs.length === 0 && <p className="text-base-content/60 italic">Chưa có ghi chép nào.</p>}
          <ul className="space-y-4">
            {logs.map(l => (
              <li key={l.id} className="card bg-base-200 compact shadow-sm">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-base-content/60">
                          {new Date(l.time).toLocaleString('vi-VN')}
                        </p>
                        <div className="flex gap-2">
                          {l.stoolType && l.stoolType !== 'none' && (
                            <span className={`badge ${['type1', 'type2', 'type6', 'type7'].includes(l.stoolType) ? 'badge-warning' : 'badge-success'} badge-outline`}>
                              {bristolTypes.find(t => t.value === l.stoolType)?.label.split(':')[0]}
                            </span>
                          )}
                          <span className={`badge ${l.severity === 'severe' ? 'badge-error' : l.severity === 'moderate' ? 'badge-warning' : 'badge-success'}`}>
                            {l.severity}
                          </span>
                        </div>
                      </div>

                      {l.note && <h4 className="font-bold text-lg mb-2">{l.note}</h4>}

                      <div className="flex gap-2 items-center text-sm text-base-content/70">
                        <span>Cảm xúc: {l.emotion}</span>
                      </div>
                    </div>
                  </div>
                  {l.advice && (
                    <div className="alert alert-info mt-3 text-sm">
                      <div>
                        <strong className="block mb-1">💡 Lời khuyên AI:</strong>
                        <span className="whitespace-pre-line">{l.advice}</span>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SymptomLogger;
