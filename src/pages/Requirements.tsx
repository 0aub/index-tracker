import { useState } from 'react';
import { Search } from 'lucide-react';
import LevelIndicator from '../components/LevelIndicator';
import { SECTION_NAMES, type Requirement } from '../utils/calculations';
import requirementsData from '../data/requirements.json';
import evidenceData from '../data/evidence_submissions.json';
import usersData from '../data/users.json';

const Requirements = () => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const requirements: Requirement[] = requirementsData.requirements;
  const evidence = evidenceData.evidence_submissions;
  const users = usersData.users;

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.question_en.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSection = selectedSection === 'all' || req.section === selectedSection;

    return matchesSearch && matchesSection;
  });

  const sections = Object.keys(SECTION_NAMES);

  return (
    <div className={`min-h-screen bg-gray-50 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {lang === 'ar' ? 'إدارة المتطلبات' : 'Requirements Management'}
            </h1>
            <p className="text-gray-600 mt-2">
              {lang === 'ar' ? 'إدارة ومتابعة جميع متطلبات المؤشر' : 'Manage and track all index requirements'}
            </p>
          </div>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث في المتطلبات...' : 'Search requirements...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{lang === 'ar' ? 'جميع الأقسام' : 'All Sections'}</option>
              {sections.map(section => (
                <option key={section} value={section}>
                  {SECTION_NAMES[section as keyof typeof SECTION_NAMES][lang]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map(section => {
            const sectionReqs = filteredRequirements.filter(r => r.section === section);
            if (sectionReqs.length === 0 && selectedSection !== 'all' && selectedSection !== section) return null;
            if (sectionReqs.length === 0 && selectedSection === 'all') return null;

            return (
              <div key={section} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">
                    {SECTION_NAMES[section as keyof typeof SECTION_NAMES][lang]}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {sectionReqs.length} {lang === 'ar' ? 'متطلب' : 'requirements'}
                  </p>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {sectionReqs.map(req => {
                      const reqEvidence = evidence.filter(e => e.requirement_id === req.id);
                      const confirmedCount = reqEvidence.filter(e => e.status === 'confirmed').length;
                      const totalLevels = 6;
                      const completionPercentage = Math.round((confirmedCount / totalLevels) * 100);
                      const assignedUser = users.find(u => u.id === req.assigned_to);
                      const dueDate = new Date(req.due_date);
                      const isOverdue = dueDate < new Date();

                      return (
                        <div
                          key={req.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <span className="font-mono text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                                {req.id}
                              </span>
                              <h3 className="text-gray-900 font-medium mt-2 mb-2">
                                {lang === 'ar' ? req.question : req.question_en}
                              </h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <span className="text-xs text-gray-600 block mb-1">
                                {lang === 'ar' ? 'المستوى الحالي' : 'Current Level'}
                              </span>
                              <LevelIndicator currentLevel={req.current_level} />
                            </div>

                            <div>
                              <span className="text-xs text-gray-600 block mb-1">
                                {lang === 'ar' ? 'المسؤول' : 'Assigned To'}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {lang === 'ar' ? assignedUser?.name : assignedUser?.name_en}
                              </span>
                            </div>

                            <div>
                              <span className="text-xs text-gray-600 block mb-1">
                                {lang === 'ar' ? 'الموعد النهائي' : 'Due Date'}
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  isOverdue ? 'text-red-600' : 'text-gray-900'
                                }`}
                              >
                                {dueDate.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                              </span>
                            </div>

                            <div>
                              <span className="text-xs text-gray-600 block mb-1">
                                {lang === 'ar' ? 'الأدلة المؤكدة' : 'Confirmed Evidence'}
                              </span>
                              <span className="text-sm font-bold text-green-600">
                                {confirmedCount} / {totalLevels}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-600">
                                {lang === 'ar' ? 'التقدم' : 'Progress'}
                              </span>
                              <span className="text-xs font-semibold text-gray-900">{completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRequirements.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {lang === 'ar' ? 'لا توجد نتائج' : 'No Results'}
            </h3>
            <p className="text-gray-500">
              {lang === 'ar'
                ? 'لم يتم العثور على متطلبات تطابق معايير البحث'
                : 'No requirements match your search criteria'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Requirements;
