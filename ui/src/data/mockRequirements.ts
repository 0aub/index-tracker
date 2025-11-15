// Shared mock requirements data
export const mockRequirements = [
  // Governance & Strategy (5 requirements)
  {
    id: 'REQ-001',
    section: 'governance',
    question: 'هل تمتلك المنظمة استراتيجية واضحة ومعتمدة للذكاء الاصطناعي؟',
    question_en: 'Does the organization have a clear and approved AI strategy?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-002', 'usr-003'],
    due_date: '2025-06-30'
  },
  {
    id: 'REQ-002',
    section: 'governance',
    question: 'هل يوجد هيكل حوكمة واضح للذكاء الاصطناعي؟',
    question_en: 'Is there a clear AI governance structure?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-002'],
    due_date: '2025-05-15'
  },
  {
    id: 'REQ-003',
    section: 'governance',
    question: 'هل تم تعيين مسؤول أو فريق للذكاء الاصطناعي؟',
    question_en: 'Has an AI officer or team been appointed?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001'],
    due_date: '2025-05-30'
  },
  {
    id: 'REQ-004',
    section: 'governance',
    question: 'هل تم تحديد أدوار ومسؤوليات واضحة للذكاء الاصطناعي؟',
    question_en: 'Have clear AI roles and responsibilities been defined?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-06-15'
  },
  {
    id: 'REQ-005',
    section: 'governance',
    question: 'هل يوجد إطار للمراجعة والتحديث المنتظم لاستراتيجية الذكاء الاصطناعي؟',
    question_en: 'Is there a framework for regular review and update of AI strategy?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-07-15'
  },

  // Data Management (5 requirements)
  {
    id: 'REQ-006',
    section: 'data',
    question: 'هل تمتلك المنظمة استراتيجية وإطار عمل لإدارة البيانات؟',
    question_en: 'Does the organization have a data management strategy and framework?',
    current_level: 0,
    target_level: 5,
    assignees: ['usr-001', 'usr-003'],
    due_date: '2025-07-30'
  },
  {
    id: 'REQ-007',
    section: 'data',
    question: 'هل يوجد نظام لضمان جودة البيانات؟',
    question_en: 'Is there a system to ensure data quality?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-003'],
    due_date: '2025-06-20'
  },
  {
    id: 'REQ-008',
    section: 'data',
    question: 'هل يوجد إطار لحوكمة البيانات والخصوصية؟',
    question_en: 'Is there a framework for data governance and privacy?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-06-25'
  },
  {
    id: 'REQ-009',
    section: 'data',
    question: 'هل البيانات متاحة ويمكن الوصول إليها للاستخدام في الذكاء الاصطناعي؟',
    question_en: 'Is data available and accessible for AI use?',
    current_level: 0,
    target_level: 5,
    assignees: ['usr-003'],
    due_date: '2025-07-10'
  },
  {
    id: 'REQ-010',
    section: 'data',
    question: 'هل يوجد نظام لإدارة دورة حياة البيانات؟',
    question_en: 'Is there a system for data lifecycle management?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-08-15'
  },

  // Technology & Infrastructure (4 requirements)
  {
    id: 'REQ-011',
    section: 'technology',
    question: 'هل تمتلك المنظمة البنية التحتية التقنية اللازمة للذكاء الاصطناعي؟',
    question_en: 'Does the organization have the necessary technical infrastructure for AI?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001'],
    due_date: '2025-08-30'
  },
  {
    id: 'REQ-012',
    section: 'technology',
    question: 'هل يوجد نظام لإدارة نماذج الذكاء الاصطناعي؟',
    question_en: 'Is there a system for AI model management?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-001', 'usr-003'],
    due_date: '2025-07-20'
  },
  {
    id: 'REQ-013',
    section: 'technology',
    question: 'هل يوجد إطار للأمن السيبراني لحلول الذكاء الاصطناعي؟',
    question_en: 'Is there a cybersecurity framework for AI solutions?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-002'],
    due_date: '2025-06-10'
  },
  {
    id: 'REQ-014',
    section: 'technology',
    question: 'هل تستخدم المنظمة منصات وأدوات حديثة للذكاء الاصطناعي؟',
    question_en: 'Does the organization use modern AI platforms and tools?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-09-15'
  },

  // Skills & Talent (4 requirements)
  {
    id: 'REQ-015',
    section: 'skills',
    question: 'هل تمتلك المنظمة استراتيجية لتطوير المهارات في الذكاء الاصطناعي؟',
    question_en: 'Does the organization have a strategy for AI skills development?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-07-05'
  },
  {
    id: 'REQ-016',
    section: 'skills',
    question: 'هل يوجد برامج تدريبية في الذكاء الاصطناعي للموظفين؟',
    question_en: 'Are there AI training programs for employees?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-002'],
    due_date: '2025-06-05'
  },
  {
    id: 'REQ-017',
    section: 'skills',
    question: 'هل تم توظيف أو تطوير خبراء في الذكاء الاصطناعي؟',
    question_en: 'Have AI experts been recruited or developed?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-003'],
    due_date: '2025-08-20'
  },
  {
    id: 'REQ-018',
    section: 'skills',
    question: 'هل يوجد برنامج للتعلم المستمر في مجال الذكاء الاصطناعي؟',
    question_en: 'Is there a continuous learning program in AI?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-002'],
    due_date: '2025-09-30'
  },

  // Ethics & Compliance (4 requirements)
  {
    id: 'REQ-019',
    section: 'ethics',
    question: 'هل يوجد إطار للأخلاقيات في استخدام الذكاء الاصطناعي؟',
    question_en: 'Is there an ethics framework for AI use?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-05-25'
  },
  {
    id: 'REQ-020',
    section: 'ethics',
    question: 'هل يتم مراجعة الامتثال القانوني والتنظيمي لحلول الذكاء الاصطناعي؟',
    question_en: 'Is legal and regulatory compliance reviewed for AI solutions?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001'],
    due_date: '2025-06-18'
  },
  {
    id: 'REQ-021',
    section: 'ethics',
    question: 'هل يوجد آليات للشفافية والمساءلة في أنظمة الذكاء الاصطناعي؟',
    question_en: 'Are there mechanisms for transparency and accountability in AI systems?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-07-28'
  },
  {
    id: 'REQ-022',
    section: 'ethics',
    question: 'هل يتم معالجة التحيز والعدالة في نماذج الذكاء الاصطناعي؟',
    question_en: 'Are bias and fairness addressed in AI models?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-003'],
    due_date: '2025-08-05'
  },

  // Innovation & Use Cases (4 requirements)
  {
    id: 'REQ-023',
    section: 'innovation',
    question: 'هل يوجد حالات استخدام مطبقة للذكاء الاصطناعي في المنظمة؟',
    question_en: 'Are there implemented AI use cases in the organization?',
    current_level: 0,
    target_level: 5,
    assignees: ['usr-001', 'usr-002', 'usr-003'],
    due_date: '2025-09-10'
  },
  {
    id: 'REQ-024',
    section: 'innovation',
    question: 'هل يتم قياس قيمة وأثر مشاريع الذكاء الاصطناعي؟',
    question_en: 'Are the value and impact of AI projects measured?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-002'],
    due_date: '2025-07-12'
  },
  {
    id: 'REQ-025',
    section: 'innovation',
    question: 'هل يوجد برنامج للابتكار والتجريب في الذكاء الاصطناعي؟',
    question_en: 'Is there a program for AI innovation and experimentation?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-003'],
    due_date: '2025-08-25'
  },
  {
    id: 'REQ-026',
    section: 'innovation',
    question: 'هل يتم التعاون مع شركاء خارجيين في مجال الذكاء الاصطناعي؟',
    question_en: 'Is there collaboration with external partners in AI?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-10-15'
  },

  // Additional Governance Requirements
  {
    id: 'REQ-027',
    section: 'governance',
    question: 'هل يوجد ميزانية مخصصة لمبادرات الذكاء الاصطناعي؟',
    question_en: 'Is there a dedicated budget for AI initiatives?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-07-15'
  },
  {
    id: 'REQ-028',
    section: 'governance',
    question: 'هل يتم قياس عائد الاستثمار (ROI) لمشاريع الذكاء الاصطناعي؟',
    question_en: 'Is ROI measured for AI projects?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-001'],
    due_date: '2025-08-20'
  },

  // Additional Data Requirements
  {
    id: 'REQ-029',
    section: 'data',
    question: 'هل يوجد استراتيجية لإدارة دورة حياة البيانات؟',
    question_en: 'Is there a strategy for data lifecycle management?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-06-25'
  },
  {
    id: 'REQ-030',
    section: 'data',
    question: 'هل يتم تطبيق معايير حماية البيانات والخصوصية؟',
    question_en: 'Are data protection and privacy standards implemented?',
    current_level: 0,
    target_level: 5,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-07-10'
  },
  {
    id: 'REQ-031',
    section: 'data',
    question: 'هل يوجد نظام لتتبع وتوثيق مصادر البيانات؟',
    question_en: 'Is there a system for tracking and documenting data sources?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-003'],
    due_date: '2025-08-15'
  },

  // Additional Technology Requirements
  {
    id: 'REQ-032',
    section: 'technology',
    question: 'هل يوجد خطة للتحديث والصيانة المستمرة لأنظمة الذكاء الاصطناعي؟',
    question_en: 'Is there a plan for continuous update and maintenance of AI systems?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-09-05'
  },
  {
    id: 'REQ-033',
    section: 'technology',
    question: 'هل يتم اختبار وتقييم أداء نماذج الذكاء الاصطناعي بشكل منتظم؟',
    question_en: 'Are AI models regularly tested and evaluated for performance?',
    current_level: 0,
    target_level: 5,
    assignees: ['usr-002'],
    due_date: '2025-07-30'
  },
  {
    id: 'REQ-034',
    section: 'technology',
    question: 'هل يوجد إجراءات للتعامل مع حوادث الأمن السيبراني للأنظمة الذكية؟',
    question_en: 'Are there procedures for handling cybersecurity incidents for AI systems?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001', 'usr-003'],
    due_date: '2025-10-05'
  },

  // Additional Skills Requirements
  {
    id: 'REQ-035',
    section: 'skills',
    question: 'هل يوجد برنامج لاستقطاب المواهب في مجال الذكاء الاصطناعي؟',
    question_en: 'Is there a program for attracting AI talent?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-09-15'
  },
  {
    id: 'REQ-036',
    section: 'skills',
    question: 'هل يتم قياس مستوى المهارات والكفاءات في الذكاء الاصطناعي؟',
    question_en: 'Is the level of AI skills and competencies measured?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-001'],
    due_date: '2025-08-30'
  },

  // Additional Ethics Requirements
  {
    id: 'REQ-037',
    section: 'ethics',
    question: 'هل يوجد آلية للإبلاغ عن المخاوف الأخلاقية في استخدام الذكاء الاصطناعي؟',
    question_en: 'Is there a mechanism for reporting ethical concerns in AI use?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-001', 'usr-002'],
    due_date: '2025-09-20'
  },
  {
    id: 'REQ-038',
    section: 'ethics',
    question: 'هل يتم إجراء تقييمات للأثر الأخلاقي والاجتماعي لحلول الذكاء الاصطناعي؟',
    question_en: 'Are ethical and social impact assessments conducted for AI solutions?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-002', 'usr-003'],
    due_date: '2025-10-10'
  },

  // Additional Innovation Requirements
  {
    id: 'REQ-039',
    section: 'innovation',
    question: 'هل يوجد مختبر أو بيئة للتجريب والابتكار في الذكاء الاصطناعي؟',
    question_en: 'Is there a lab or sandbox environment for AI experimentation and innovation?',
    current_level: 0,
    target_level: 3,
    assignees: ['usr-001', 'usr-003'],
    due_date: '2025-11-05'
  },
  {
    id: 'REQ-040',
    section: 'innovation',
    question: 'هل يتم مشاركة المعرفة والخبرات المكتسبة من مشاريع الذكاء الاصطناعي؟',
    question_en: 'Is knowledge and experience from AI projects shared across the organization?',
    current_level: 0,
    target_level: 4,
    assignees: ['usr-002'],
    due_date: '2025-11-20'
  }
];

export const mockUsers = [
  { id: 'usr-001', name: 'أحمد محمد', name_en: 'Ahmed Mohammed' },
  { id: 'usr-002', name: 'فاطمة علي', name_en: 'Fatima Ali' },
  { id: 'usr-003', name: 'سارة خالد', name_en: 'Sara Khaled' }
];
