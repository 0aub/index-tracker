/**
 * Index Selector Component - Allows users to select the active index
 */
import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Loader2 } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useIndexStore } from '../../stores/indexStore';
import { useAuthStore } from '../../stores/authStore';
import { api, Index } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { colors } from '../../utils/darkMode';

export const IndexSelector: React.FC = () => {
  const { language } = useUIStore();
  const lang = language;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentIndex, setCurrentIndex } = useIndexStore();

  const [indices, setIndices] = useState<Index[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load indices on mount
  useEffect(() => {
    loadIndices();
  }, []);

  const loadIndices = async () => {
    try {
      setLoading(true);
      const data = await api.indices.getAll({
        organization_id: user?.organizationId,
        status: 'active',
      });
      setIndices(data);

      // If no current index set, set the first one
      if (!currentIndex && data.length > 0) {
        setCurrentIndex(data[0]);
      }
    } catch (error) {
      console.error('Failed to load indices:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل المؤشرات' : 'Failed to load indices');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIndex = (index: Index) => {
    setCurrentIndex(index);
    setIsOpen(false);
    toast.success(
      lang === 'ar'
        ? `تم اختيار: ${index.code.replace('-', ' ')}`
        : `Selected: ${index.code.replace('-', ' ')}`
    );
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    navigate('/index/new');
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg`}>
        <Loader2 className={`w-4 h-4 animate-spin ${colors.primary}`} />
        <span className={`text-sm ${colors.textSecondary}`}>
          {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg hover:border-[rgb(var(--color-focus-ring))] transition-colors min-w-[250px]`}
      >
        <div className="flex-1 text-left">
          {currentIndex ? (
            <>
              <div className={`text-sm font-medium ${colors.textPrimary}`}>
                {currentIndex.code.replace('-', ' ')}
              </div>
              <div className={`text-xs ${colors.textSecondary}`}>
                {currentIndex.total_requirements} {lang === 'ar' ? 'متطلب' : 'requirements'}
              </div>
            </>
          ) : (
            <div className={`text-sm ${colors.textSecondary}`}>
              {lang === 'ar' ? 'اختر مؤشر' : 'Select Index'}
            </div>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 ${colors.textSecondary} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} mt-2 w-80 ${colors.bgSecondary} border ${colors.border} rounded-lg shadow-lg dark:shadow-gray-900/50 z-20 max-h-96 overflow-y-auto`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b ${colors.border}`}>
              <div className={`text-sm font-medium ${colors.textPrimary}`}>
                {lang === 'ar' ? 'المؤشرات المتاحة' : 'Available Indices'}
              </div>
              <div className={`text-xs ${colors.textSecondary} mt-1`}>
                {indices.length} {lang === 'ar' ? 'مؤشر' : 'indices'}
              </div>
            </div>

            {/* Indices List */}
            <div className="py-2">
              {indices.length === 0 ? (
                <div className={`px-4 py-8 text-center text-sm ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'لا توجد مؤشرات متاحة' : 'No indices available'}
                </div>
              ) : (
                indices.map((index) => (
                  <button
                    key={index.id}
                    onClick={() => handleSelectIndex(index)}
                    className={`w-full px-4 py-3 text-left ${colors.bgHover} transition-colors ${
                      currentIndex?.id === index.id ? `${colors.primaryLight}` : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${colors.textPrimary}`}>
                          {index.code.replace('-', ' ')}
                        </div>
                        <div className={`text-xs ${colors.textSecondary} mt-1`}>
                          {index.total_requirements} {lang === 'ar' ? 'متطلب' : 'requirements'}
                        </div>
                      </div>
                      {currentIndex?.id === index.id && (
                        <div className={`w-2 h-2 ${colors.primary} rounded-full`}></div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Create New Button */}
            {(user?.role === 'admin' || user?.role === 'index_manager') && (
              <>
                <div className={`border-t ${colors.border}`}></div>
                <button
                  onClick={handleCreateNew}
                  className={`w-full px-4 py-3 text-left ${colors.bgHover} transition-colors flex items-center gap-2 ${colors.primaryIcon}`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {lang === 'ar' ? 'إنشاء مؤشر جديد' : 'Create New Index'}
                  </span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
