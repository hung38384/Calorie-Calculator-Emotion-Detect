import { useEffect, useState } from 'react';

const STORAGE_KEY = 'symptomLogs';

export const SymptomLogger = () => {
  const [logs, setLogs] = useState([]);
  const [note, setNote] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [severity, setSeverity] = useState('mild');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setLogs(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const addLog = () => {
    const entry = { id: Date.now(), note, emotion, severity, time: new Date().toISOString() };
    setLogs([entry, ...logs]);
    setNote('');

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

  return (
    <div className="mt-6 p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Ghi nhận triệu chứng / Tâm trạng</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <textarea className="col-span-2 p-2 border rounded" placeholder="Ghi chú (ví dụ: đau bụng, đầy hơi...)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Ghi chú triệu chứng" />
        <div className="flex flex-col gap-2">
          <select className="p-2 border rounded" value={emotion} onChange={(e) => setEmotion(e.target.value)} aria-label="Cảm xúc">
            <option value="neutral">Bình thường</option>
            <option value="happy">Vui</option>
            <option value="sad">Buồn</option>
            <option value="angry">Khó chịu</option>
            <option value="surprised">Ngạc nhiên</option>
            <option value="fearful">Lo lắng</option>
          </select>
          <select className="p-2 border rounded" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Mức độ">
            <option value="mild">Nhẹ</option>
            <option value="moderate">Vừa</option>
            <option value="severe">Nặng</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={addLog} disabled={!note}>Thêm</button>
        <button className="btn btn-outline" onClick={clearLogs}>Xóa tất cả</button>
      </div>

      <div className="mt-4">
        <h4 className="font-medium mb-2">Ghi chép gần đây</h4>
        {logs.length === 0 && <p className="text-sm text-gray-500">Chưa có ghi chép.</p>}
        <ul className="space-y-2">
          {logs.map(l => (
            <li key={l.id} className="p-2 border rounded bg-gray-50">
              <div className="flex justify-between">
                <div>
                  <div className="text-sm text-gray-700">{new Date(l.time).toLocaleString('vi-VN')}</div>
                  <div className="font-semibold">{l.note}</div>
                  <div className="text-xs text-gray-500">Cảm xúc: {l.emotion} • Mức độ: {l.severity}</div>
                </div>
              </div>
              {l.advice && (
                <div className="mt-2 p-2 bg-white border rounded text-sm text-gray-700">
                  <strong>Lời khuyên:</strong>
                  <div className="mt-1 whitespace-pre-line">{l.advice}</div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SymptomLogger;
