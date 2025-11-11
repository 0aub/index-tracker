import { useState } from 'react';
import { BarChart3, FileText, CheckSquare, Home } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Requirements from './pages/Requirements';

type Page = 'dashboard' | 'reports' | 'requirements';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('reports');
  const [lang] = useState<'ar' | 'en'>('ar');

  const menuItems = [
    { id: 'dashboard' as Page, icon: Home, label: { ar: 'لوحة المعلومات', en: 'Dashboard' } },
    { id: 'reports' as Page, icon: BarChart3, label: { ar: 'التقارير', en: 'Reports' } },
    { id: 'requirements' as Page, icon: CheckSquare, label: { ar: 'المتطلبات', en: 'Requirements' } }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'reports':
        return <Reports />;
      case 'requirements':
        return <Requirements />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {lang === 'ar' ? 'المؤشر الوطني للذكاء الاصطناعي' : 'National AI Index'}
                </h1>
                <p className="text-xs text-gray-500">
                  {lang === 'ar' ? 'نظام تقييم النضج' : 'Maturity Assessment System'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{item.label[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main>{renderPage()}</main>
    </div>
  );
}

export default App;
