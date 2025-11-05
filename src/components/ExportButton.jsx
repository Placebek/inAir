import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function ExportButton() {
  const { token } = useAuth();

  const handleExport = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/reports/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = new Blob([response.data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed');
    }
  };

  return (
    <button
      onClick={handleExport}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      Export Inventory (CSV)
    </button>
  );
}

export default ExportButton;