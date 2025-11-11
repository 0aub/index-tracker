# المؤشر الوطني للذكاء الاصطناعي | National AI Maturity Index

A comprehensive web application for assessing organizational AI maturity based on the Saudi National AI Maturity Index. The system evaluates 26 requirements across 7 sections with 6 maturity levels each (156 total assessment points).

## Features

### 1. Reports Page (Primary Feature)
The most comprehensive reporting system with:
- **Executive Dashboard**: Overall maturity gauge, performance comparison, quick stats
- **Visual Analytics**: Spider charts, pie charts, bar charts, and heatmaps
- **Section Performance Cards**: 7 sections with progress indicators
- **Detailed Gap Analysis**: Identifies areas below target with priority recommendations
- **Export Capabilities**: PDF, Excel, and PowerPoint export (ready for implementation)
- **Bilingual Support**: Full Arabic and English interface

### 2. Dashboard Page
Quick overview with:
- Key metrics (Overall Maturity, Completion Rate, Days Remaining, Total Requirements)
- Section performance breakdown with progress bars
- Alerts and notifications panel
- Recent activity feed

### 3. Requirements Management Page
Complete requirements tracking with:
- Grid view grouped by 7 sections
- Advanced filtering (search, section, priority)
- Visual level indicators
- Progress tracking per requirement
- Assignment and deadline management

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with RTL support
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React Hooks (useState)

## Project Structure

```
src/
├── components/
│   ├── LevelIndicator.tsx      # Visual level progress dots
│   └── MaturityGauge.tsx       # Circular maturity gauge
├── pages/
│   ├── Dashboard.tsx           # Main dashboard
│   ├── Reports.tsx             # Comprehensive reports (PRIMARY)
│   └── Requirements.tsx        # Requirements management
├── utils/
│   └── calculations.ts         # All calculation functions
├── data/
│   ├── requirements.json       # 26 requirements
│   ├── evidence_submissions.json  # Document submissions
│   ├── users.json             # User profiles
│   ├── comments.json          # Comments and feedback
│   └── audit_log.json         # Activity history
├── App.tsx                     # Main app with navigation
└── main.tsx                    # Entry point
```

## Key Calculations

### Overall Maturity Score
Weighted average across 7 sections:
- Strategy: 15%
- Governance: 15%
- Data: 15%
- Infrastructure: 15%
- Human Capabilities: 15%
- Applications: 15%
- Impact: 10%

### Section Maturity
Average of all requirement levels within a section

### Completion Percentage
Ratio of confirmed evidence to total possible levels (6 per requirement)

### Gap Analysis
Difference between current and target levels, sorted by priority

## The 7 Sections

1. **الاستراتيجية (Strategy)** - AI strategy and planning
2. **الحوكمة (Governance)** - AI governance framework
3. **البيانات (Data)** - Data management and quality
4. **البنية التحتية (Infrastructure)** - Technical infrastructure
5. **القدرات البشرية (Human Capabilities)** - AI skills and training
6. **التطبيقات (Applications)** - AI applications and use cases
7. **الأثر (Impact)** - Measuring AI impact and ROI

## Maturity Levels (0-5)

- **Level 0**: Initial/Not Started (Red)
- **Level 1**: Basic Awareness (Orange)
- **Level 2**: Defined Process (Yellow)
- **Level 3**: Managed (Light Green)
- **Level 4**: Optimized (Blue)
- **Level 5**: Leading/Innovative (Purple)

## Status Colors

- **Confirmed** (Green): Evidence approved
- **Ready for Audit** (Orange): Prepared for review
- **Submitted** (Yellow): Under review
- **Assigned** (Blue): Work in progress
- **Changes Requested** (Red): Needs modification
- **Not Started** (Gray): No progress yet

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Type Check
```bash
npm run typecheck
```

## Data Files

The system uses JSON files for data:

- `requirements.json`: All 26 requirements with levels and targets
- `evidence_submissions.json`: Uploaded documents and their review status
- `users.json`: User profiles with roles and permissions
- `comments.json`: Feedback and discussions
- `audit_log.json`: Complete activity history

## User Roles

1. **Index Manager**: Full access to all features
2. **Section Coordinator**: Manage specific sections
3. **Contributor**: Upload evidence and add comments

## Features by Priority

### Implemented ✅
- Complete reporting dashboard with visualizations
- Real-time calculations and analytics
- Multi-section requirement management
- Bilingual interface (Arabic/English)
- Level indicators and progress tracking
- Gap analysis and recommendations
- Activity logging and user management

### Ready for Enhancement 🚀
- Export to PDF/Excel/PowerPoint
- Document upload and storage
- Real-time collaboration
- Email notifications
- Advanced filtering and search
- Custom report builder

## RTL Support

The application fully supports Arabic RTL layout:
- Automatic text direction switching
- Mirrored layouts for RTL
- Proper alignment for both languages
- Native Arabic font rendering

## Performance

- Lazy loading ready for large datasets
- Optimized chart rendering
- Efficient state management
- Fast build times with Vite

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Proprietary - Saudi National AI Initiative

## Contact

For questions or support, please contact the development team.

---

Built with ❤️ for the Saudi National AI Maturity Index Initiative
