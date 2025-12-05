/**
 * Index Selector Component - Allows users to select the active index
 */
import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Loader2, Check } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useIndexStore } from '../../stores/indexStore';
import { useAuthStore } from '../../stores/authStore';
import { api, Index } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const IndexSelector: React.FC = () => {
  const { language, theme } = useUIStore();
  const lang = language;
  const isDark = theme === 'dark';
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
      });
      setIndices(data);

      if (!currentIndex && data.length > 0) {
        setCurrentIndex(data[0]);
      } else if (currentIndex) {
        const updatedIndex = data.find(idx => idx.id === currentIndex.id);
        if (updatedIndex) {
          setCurrentIndex(updatedIndex);
        }
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
      }}>
        <Loader2 size={14} style={{ color: '#22c55e', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', color: isDark ? '#9ca3af' : '#6b7280' }}>
          {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Simple Clean Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '8px 10px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)';
        }}
      >
        <div style={{
          flex: 1,
          textAlign: lang === 'ar' ? 'right' : 'left',
          overflow: 'hidden'
        }}>
          {currentIndex ? (
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: isDark ? '#f3f4f6' : '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentIndex.code.replace('-', ' ')}
            </div>
          ) : (
            <div style={{
              fontSize: '13px',
              color: isDark ? '#9ca3af' : '#6b7280'
            }}>
              {lang === 'ar' ? 'اختر مؤشر' : 'Select'}
            </div>
          )}
        </div>
        <ChevronDown
          size={14}
          style={{
            color: '#22c55e',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: isDark ? '#1f2023' : '#ffffff',
              border: `1px solid ${isDark ? '#3f3f46' : '#e5e7eb'}`,
              borderRadius: '12px',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.5)'
                : '0 8px 32px rgba(0,0,0,0.15)',
              zIndex: 101,
              overflow: 'hidden',
              animation: 'dropdownFadeIn 0.2s ease'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${isDark ? '#3f3f46' : '#f3f4f6'}`,
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isDark ? '#9ca3af' : '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {lang === 'ar' ? 'المؤشرات' : 'Indices'}
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
              {indices.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: isDark ? '#6b7280' : '#9ca3af'
                }}>
                  {lang === 'ar' ? 'لا توجد مؤشرات' : 'No indices'}
                </div>
              ) : (
                indices.map((index) => {
                  const isSelected = currentIndex?.id === index.id;
                  return (
                    <button
                      key={index.id}
                      onClick={() => handleSelectIndex(index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 10px',
                        marginBottom: '2px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.12)')
                          : 'transparent',
                        cursor: 'pointer',
                        textAlign: lang === 'ar' ? 'right' : 'left',
                        transition: 'all 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {/* Selection indicator */}
                      <div style={{
                        width: '4px',
                        height: '24px',
                        borderRadius: '2px',
                        backgroundColor: isSelected ? '#22c55e' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#22c55e' : (isDark ? '#f3f4f6' : '#111827')
                        }}>
                          {index.code.replace('-', ' ')}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: isDark ? '#6b7280' : '#9ca3af',
                          marginTop: '1px'
                        }}>
                          {index.total_requirements} {lang === 'ar' ? 'متطلب' : 'requirements'}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={16} style={{ color: '#22c55e' }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Create New - Only system ADMIN can create new indices */}
            {user?.role === 'ADMIN' && (
              <>
                <div style={{
                  height: '1px',
                  backgroundColor: isDark ? '#3f3f46' : '#f3f4f6',
                  margin: '0 4px'
                }} />
                <div style={{ padding: '4px' }}>
                  <button
                    onClick={handleCreateNew}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '8px',
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                      cursor: 'pointer',
                      color: '#22c55e',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
                    }}
                  >
                    <Plus size={14} />
                    <span>{lang === 'ar' ? 'إنشاء مؤشر جديد' : 'Create New Index'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
