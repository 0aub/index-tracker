import { useState, useEffect, useRef } from 'react';
import { Search, X, Check, User as UserIcon } from 'lucide-react';
import { colors, patterns } from '../../utils/darkMode';
import { useUIStore } from '../../stores/uiStore';

interface User {
  id: string;
  name: string;
  name_en: string;
  email: string;
  role?: string;
  avatar_url?: string;
}

interface UserSearchSelectorProps {
  users: User[];
  selectedIds: string[];
  onSelect: (userId: string) => void;
  onDeselect: (userId: string) => void;
  placeholder?: { ar: string; en: string };
  multiple?: boolean;
  showRole?: boolean;
  disabled?: boolean;
}

const UserSearchSelector = ({
  users,
  selectedIds,
  onSelect,
  onDeselect,
  placeholder = { ar: 'ابحث بالاسم أو البريد الإلكتروني...', en: 'Search by name or email...' },
  multiple = true,
  showRole = true,
  disabled = false,
}: UserSearchSelectorProps) => {
  const { language } = useUIStore();
  const lang = language;
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (lang === 'ar' ? user.name : user.name_en || user.name).toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const handleToggleUser = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onDeselect(userId);
    } else {
      onSelect(userId);
      if (!multiple) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[1].charAt(0);
    }
    return name.substring(0, 2);
  };

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Users as Cards */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-2 px-3 py-2 ${colors.bgTertiary} rounded-lg border ${colors.border} group`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${colors.primary}`}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={lang === 'ar' ? user.name : user.name_en || user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(lang === 'ar' ? user.name : user.name_en || user.name)
                )}
              </div>

              {/* Name & Email */}
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${colors.textPrimary}`}>
                  {lang === 'ar' ? user.name : user.name_en || user.name}
                </span>
                <span className={`text-xs ${colors.textTertiary}`}>
                  {user.email}
                </span>
              </div>

              {/* Remove Button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onDeselect(user.id)}
                  className={`p-1 rounded-full ${colors.textSecondary} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search
          className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 ${colors.textTertiary}`}
          size={18}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 ${patterns.input}`}
          placeholder={lang === 'ar' ? placeholder.ar : placeholder.en}
          disabled={disabled}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        />
      </div>

      {/* Dropdown List */}
      {isDropdownOpen && !disabled && (
        <div className={`absolute z-50 w-full mt-2 ${colors.bgSecondary} border ${colors.border} rounded-xl shadow-lg max-h-72 overflow-y-auto`}>
          {filteredUsers.length === 0 ? (
            <div className={`p-4 text-center ${colors.textSecondary}`}>
              <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {lang === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleToggleUser(user.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 border'
                        : `${colors.bgHover} border border-transparent`
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${
                      isSelected ? 'bg-green-500' : colors.primary
                    }`}>
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={lang === 'ar' ? user.name : user.name_en || user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(lang === 'ar' ? user.name : user.name_en || user.name)
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-start min-w-0">
                      <div className={`font-medium truncate ${isSelected ? 'text-green-700 dark:text-green-400' : colors.textPrimary}`}>
                        {lang === 'ar' ? user.name : user.name_en || user.name}
                      </div>
                      <div className={`text-xs truncate ${colors.textSecondary}`}>
                        {user.email}
                      </div>
                    </div>

                    {/* Role Badge */}
                    {showRole && user.role && (
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        isSelected
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : `${colors.bgTertiary} ${colors.textSecondary}`
                      }`}>
                        {user.role === 'owner' ? (lang === 'ar' ? 'معتمد' : 'Owner')
                          : user.role === 'supervisor' ? (lang === 'ar' ? 'مدقق' : 'Reviewer')
                          : user.role === 'contributor' ? (lang === 'ar' ? 'مساهم' : 'Contributor')
                          : user.role}
                      </span>
                    )}

                    {/* Selection Indicator */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-green-500 border-green-500 text-white'
                        : `border-gray-300 dark:border-gray-600`
                    }`}>
                      {isSelected && <Check size={12} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchSelector;
