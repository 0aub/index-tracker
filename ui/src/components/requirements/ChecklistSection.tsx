import { useState, useEffect } from 'react';
import { Plus, Check, Edit2, Trash2, X, Save, Loader2 } from 'lucide-react';
import { api, ChecklistItem } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import { colors, patterns } from '../../utils/darkMode';
import toast from 'react-hot-toast';

interface ChecklistSectionProps {
  requirementId: string;
  canEdit: boolean;
}

const ChecklistSection = ({ requirementId, canEdit }: ChecklistSectionProps) => {
  const { language } = useUIStore();
  const lang = language;

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadChecklist();
  }, [requirementId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const data = await api.checklist.getAll(requirementId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      setAddingItem(true);
      const newItem = await api.checklist.create(requirementId, {
        text_ar: newItemText.trim(),
      });
      setItems([...items, newItem]);
      setNewItemText('');
      toast.success(lang === 'ar' ? 'تمت الإضافة بنجاح' : 'Item added successfully');
    } catch (err) {
      console.error('Failed to add checklist item:', err);
      toast.error(lang === 'ar' ? 'فشل في الإضافة' : 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleToggle = async (itemId: string) => {
    setTogglingIds(prev => new Set(prev).add(itemId));
    try {
      const updatedItem = await api.checklist.toggle(itemId);
      setItems(items.map(item => item.id === itemId ? updatedItem : item));
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      toast.error(lang === 'ar' ? 'فشل في تحديث الحالة' : 'Failed to update status');
    } finally {
      setTogglingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditText(item.text_ar);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !editText.trim()) return;

    try {
      setSavingEdit(true);
      const updatedItem = await api.checklist.update(editingItemId, {
        text_ar: editText.trim(),
      });
      setItems(items.map(item => item.id === editingItemId ? updatedItem : item));
      setEditingItemId(null);
      setEditText('');
      toast.success(lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
    } catch (err) {
      console.error('Failed to update checklist item:', err);
      toast.error(lang === 'ar' ? 'فشل في التحديث' : 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(itemId));
    try {
      await api.checklist.delete(itemId);
      setItems(items.filter(item => item.id !== itemId));
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
      toast.error(lang === 'ar' ? 'فشل في الحذف' : 'Failed to delete');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const checkedCount = items.filter(item => item.is_checked).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  if (loading) {
    return (
      <div className={`${patterns.section} p-4`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${patterns.section} p-4`}>
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${colors.textPrimary}`}>
          {lang === 'ar' ? 'قائمة المهام' : 'Checklist'}
        </h3>
        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <span className={`text-sm ${colors.textSecondary}`}>
              {checkedCount}/{items.length}
            </span>
            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Checklist items */}
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg ${colors.bgTertiary} group`}
          >
            {/* Checkbox */}
            <button
              onClick={() => canEdit && handleToggle(item.id)}
              disabled={!canEdit || togglingIds.has(item.id)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center mt-0.5 ${
                item.is_checked
                  ? 'bg-green-500 border-green-500 text-white'
                  : `${colors.border} hover:border-green-400`
              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {togglingIds.has(item.id) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : item.is_checked ? (
                <Check className="w-3 h-3" />
              ) : null}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {editingItemId === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className={`flex-1 px-2 py-1 text-sm ${patterns.input}`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className={`p-1 ${colors.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700 rounded`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <span className={`text-sm ${item.is_checked ? 'line-through ' + colors.textTertiary : colors.textPrimary}`}>
                    {item.text_ar}
                  </span>
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className={`p-1 ${colors.textSecondary} hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded`}
                        title={lang === 'ar' ? 'تعديل' : 'Edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingIds.has(item.id)}
                        className={`p-1 ${colors.textSecondary} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded`}
                        title={lang === 'ar' ? 'حذف' : 'Delete'}
                      >
                        {deletingIds.has(item.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {item.is_checked && item.checked_by_name && (
                <span className={`text-xs ${colors.textTertiary} mt-1 block`}>
                  {lang === 'ar' ? 'تم بواسطة' : 'Checked by'} {item.checked_by_name}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new item */}
      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder={lang === 'ar' ? 'إضافة مهمة جديدة...' : 'Add new item...'}
            className={`flex-1 px-3 py-2 text-sm ${patterns.input}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem();
            }}
          />
          <button
            onClick={handleAddItem}
            disabled={addingItem || !newItemText.trim()}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
              addingItem || !newItemText.trim()
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {addingItem ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span className="text-sm">{lang === 'ar' ? 'إضافة' : 'Add'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !canEdit && (
        <div className={`text-center py-4 ${colors.textTertiary}`}>
          {lang === 'ar' ? 'لا توجد مهام في القائمة' : 'No checklist items'}
        </div>
      )}
    </div>
  );
};

export default ChecklistSection;
