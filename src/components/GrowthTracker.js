import { useState, useEffect } from 'react';

export const GrowthTracker = () => {
  const [childData, setChildData] = useState({
    age: '',
    weight: '',
    height: '',
    gender: 'male'
  });

  const [history, setHistory] = useState([]);
  const [recommendedCalories, setRecommendedCalories] = useState(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('growthHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Lưu lịch sử khi có thay đổi
  useEffect(() => {
    localStorage.setItem('growthHistory', JSON.stringify(history));
  }, [history]);

  // Tính lượng calo cần thiết dựa trên công thức Harris-Benedict
  const calculateCalories = (data) => {
    const { age, weight, height, gender } = data;
    if (!age || !weight || !height) return null;

    // Công thức tính BMR cho trẻ em (3-10 tuổi)
    let bmr;
    if (gender === 'male') {
      bmr = 22.7 * parseFloat(weight) + 495;
    } else {
      bmr = 22.5 * parseFloat(weight) + 499;
    }

    // Nhân với hệ số hoạt động (giả định mức độ hoạt động trung bình)
    const calories = Math.round(bmr * 1.5);
    return calories;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setChildData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const calories = calculateCalories(childData);
    setRecommendedCalories(calories);

    // Thêm vào lịch sử
    const entry = {
      ...childData,
      date: new Date().toISOString(),
      calories
    };
    setHistory([entry, ...history]);
  };

  return (
    <div className="mt-6 p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Theo dõi tăng trưởng</h3>
      <p className="text-sm text-gray-600 mb-4">Nhập thông tin cơ bản của trẻ để nhận khuyến nghị calo hàng ngày. Dữ liệu được lưu cục bộ trên trình duyệt.</p>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tuổi (năm)
            </label>
            <input
              type="number"
              name="age"
              min="0"
              max="18"
              step="0.1"
              value={childData.age}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giới tính
            </label>
            <select
              name="gender"
              value={childData.gender}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cân nặng (kg)
            </label>
            <input
              type="number"
              name="weight"
              min="0"
              step="0.1"
              value={childData.weight}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chiều cao (cm)
            </label>
            <input
              type="number"
              name="height"
              min="0"
              step="0.1"
              value={childData.height}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tính toán
          </button>
          <button
            type="button"
            className="mt-4 px-4 py-2 btn btn-outline"
            onClick={() => { setChildData({ age: '', weight: '', height: '', gender: 'male' }); setRecommendedCalories(null); }}
          >
            Đặt lại
          </button>
        </div>
      </form>

      {recommendedCalories && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h4 className="text-md font-semibold mb-2">Khuyến nghị hàng ngày:</h4>
          <p>Lượng calo cần thiết: <span className="font-bold">{recommendedCalories}</span> calories/ngày</p>
          <p className="text-sm text-gray-600 mt-2">
            * Đây là ước tính dựa trên công thức Harris-Benedict. Tham khảo ý kiến bác sĩ để có chỉ định chính xác.
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-2">Lịch sử theo dõi:</h4>
          <p className="text-sm text-gray-500 mb-2">Bạn có thể xóa lịch sử nếu muốn.</p>
          <div className="mb-2">
            <button className="btn btn-sm btn-outline" onClick={() => setHistory([])}>Xóa lịch sử</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2">Ngày</th>
                  <th className="px-4 py-2">Tuổi</th>
                  <th className="px-4 py-2">Cân nặng</th>
                  <th className="px-4 py-2">Chiều cao</th>
                  <th className="px-4 py-2">Calo/ngày</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">
                      {new Date(entry.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-2">{entry.age}</td>
                    <td className="px-4 py-2">{entry.weight} kg</td>
                    <td className="px-4 py-2">{entry.height} cm</td>
                    <td className="px-4 py-2">{entry.calories}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthTracker;