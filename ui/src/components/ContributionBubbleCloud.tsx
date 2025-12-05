import { useState, useEffect, useRef, useMemo } from 'react';
import { colors } from '../utils/darkMode';
import { useUIStore } from '../stores/uiStore';

interface UserEngagement {
  username: string;
  full_name_ar?: string;
  full_name_en?: string;
  index_role?: string;
  user_role?: string;
  assigned_requirements: number;
  total_uploads: number;
  draft_documents?: number;
  submitted_documents?: number;
  documents_reviewed?: number;
  approved_documents?: number;
  rejected_documents?: number;
  checklist_items_completed?: number;
  total_comments: number;
}

interface BubbleData {
  id: string;
  username: string;
  fullName: string;
  role: string;
  score: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  stats: {
    uploads: number;
    reviewed: number;
    approved: number;
    rejected: number;
    tasksCompleted: number;
    comments: number;
  };
}

interface ContributionBubbleCloudProps {
  userEngagement: UserEngagement[];
}

// Calculate contribution score with weights
const calculateContributionScore = (user: UserEngagement): number => {
  const weights = {
    tasksCompleted: 4,
    uploads: 3,
    reviewed: 3,
    approved: 2,
    rejected: 2,
    submitted: 1,
    comments: 1,
  };

  return (
    (user.checklist_items_completed || 0) * weights.tasksCompleted +
    (user.total_uploads || 0) * weights.uploads +
    (user.documents_reviewed || 0) * weights.reviewed +
    (user.approved_documents || 0) * weights.approved +
    (user.rejected_documents || 0) * weights.rejected +
    (user.submitted_documents || 0) * weights.submitted +
    (user.total_comments || 0) * weights.comments
  );
};

const ContributionBubbleCloud = ({ userEngagement }: ContributionBubbleCloudProps) => {
  const { language } = useUIStore();
  const lang = language;
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredBubble, setHoveredBubble] = useState<BubbleData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Filter users: exclude owners and inactive users
  const activeUsers = useMemo(() => {
    return userEngagement.filter(user => {
      // Exclude owners
      if (user.index_role?.toUpperCase() === 'OWNER') return false;
      // Exclude admins
      if (user.user_role === 'ADMIN') return false;
      // Exclude inactive users (zero contribution)
      const score = calculateContributionScore(user);
      return score > 0;
    });
  }, [userEngagement]);

  // Calculate bubble data with responsive sizing
  const bubbleData = useMemo(() => {
    if (activeUsers.length === 0) return [];

    const scores = activeUsers.map(user => calculateContributionScore(user));
    const maxScore = Math.max(...scores, 1);
    // Smaller bubbles on mobile
    const minRadius = isMobile ? 20 : 30;
    const maxRadius = isMobile ? 50 : 80;

    return activeUsers.map((user, index) => {
      const score = scores[index];
      // Scale radius based on score (square root for better visual scaling)
      const normalizedScore = score / maxScore;
      const radius = minRadius + (maxRadius - minRadius) * Math.sqrt(normalizedScore);

      return {
        id: user.username,
        username: user.username,
        fullName: lang === 'ar'
          ? user.full_name_ar || user.username
          : user.full_name_en || user.full_name_ar || user.username,
        role: user.index_role?.toLowerCase() || 'contributor',
        score,
        radius,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        stats: {
          uploads: user.total_uploads || 0,
          reviewed: user.documents_reviewed || 0,
          approved: user.approved_documents || 0,
          rejected: user.rejected_documents || 0,
          tasksCompleted: user.checklist_items_completed || 0,
          comments: user.total_comments || 0,
        },
      };
    });
  }, [activeUsers, lang, isMobile]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mobile = rect.width < 640;
        setIsMobile(mobile);
        // Responsive height: shorter on mobile
        const height = mobile ? 300 : 450;
        setDimensions({ width: rect.width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize and run force simulation
  useEffect(() => {
    if (bubbleData.length === 0 || dimensions.width === 0) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Initialize positions randomly
    const initialBubbles: BubbleData[] = bubbleData.map(bubble => ({
      ...bubble,
      x: centerX + (Math.random() - 0.5) * dimensions.width * 0.5,
      y: centerY + (Math.random() - 0.5) * dimensions.height * 0.5,
      vx: 0,
      vy: 0,
    }));

    setBubbles(initialBubbles);

    // Force simulation
    let currentBubbles = [...initialBubbles];
    let iteration = 0;
    const maxIterations = 300;

    const simulate = () => {
      if (iteration >= maxIterations) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        return;
      }

      const alpha = 1 - iteration / maxIterations;
      const padding = 10;

      // Apply forces
      for (let i = 0; i < currentBubbles.length; i++) {
        const bubble = currentBubbles[i];

        // Center gravity (stronger for larger bubbles)
        const dx = centerX - bubble.x;
        const dy = centerY - bubble.y;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);
        const gravityStrength = 0.02 * alpha * (bubble.radius / 80);
        bubble.vx += dx * gravityStrength;
        bubble.vy += dy * gravityStrength;

        // Collision avoidance
        for (let j = i + 1; j < currentBubbles.length; j++) {
          const other = currentBubbles[j];
          const ddx = other.x - bubble.x;
          const ddy = other.y - bubble.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          const minDist = bubble.radius + other.radius + padding;

          if (dist < minDist && dist > 0) {
            const force = ((minDist - dist) / dist) * 0.5 * alpha;
            const fx = ddx * force;
            const fy = ddy * force;
            bubble.vx -= fx;
            bubble.vy -= fy;
            other.vx += fx;
            other.vy += fy;
          }
        }

        // Boundary constraints
        const margin = bubble.radius + 10;
        if (bubble.x < margin) bubble.vx += (margin - bubble.x) * 0.1;
        if (bubble.x > dimensions.width - margin) bubble.vx -= (bubble.x - (dimensions.width - margin)) * 0.1;
        if (bubble.y < margin) bubble.vy += (margin - bubble.y) * 0.1;
        if (bubble.y > dimensions.height - margin) bubble.vy -= (bubble.y - (dimensions.height - margin)) * 0.1;
      }

      // Apply velocities with damping
      const damping = 0.85;
      for (const bubble of currentBubbles) {
        bubble.x += bubble.vx;
        bubble.y += bubble.vy;
        bubble.vx *= damping;
        bubble.vy *= damping;
      }

      setBubbles([...currentBubbles]);
      iteration++;

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bubbleData, dimensions]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'supervisor':
        return {
          fill: 'rgba(59, 130, 246, 0.3)', // Blue
          stroke: 'rgb(59, 130, 246)',
          text: 'rgb(59, 130, 246)',
        };
      case 'contributor':
        return {
          fill: 'rgba(16, 185, 129, 0.3)', // Green
          stroke: 'rgb(16, 185, 129)',
          text: 'rgb(16, 185, 129)',
        };
      default:
        return {
          fill: 'rgba(156, 163, 175, 0.3)', // Gray
          stroke: 'rgb(156, 163, 175)',
          text: 'rgb(156, 163, 175)',
        };
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[1].charAt(0);
    }
    return name.substring(0, 2);
  };

  if (activeUsers.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${colors.textSecondary}`}>
        <div className="text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium">
            {lang === 'ar' ? 'لا يوجد مساهمين نشطين' : 'No active contributors'}
          </p>
          <p className="text-sm mt-1">
            {lang === 'ar'
              ? 'سيظهر هنا المستخدمون الذين قاموا بمساهمات'
              : 'Users with contributions will appear here'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onMouseMove={handleMouseMove}
      style={{ height: dimensions.height }}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible"
      >
        {/* Bubbles */}
        {bubbles.map((bubble) => {
          const roleColors = getRoleColor(bubble.role);
          const isHovered = hoveredBubble?.id === bubble.id;

          return (
            <g
              key={bubble.id}
              transform={`translate(${bubble.x}, ${bubble.y})`}
              onMouseEnter={() => setHoveredBubble(bubble)}
              onMouseLeave={() => setHoveredBubble(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Outer glow on hover */}
              {isHovered && (
                <circle
                  r={bubble.radius + 8}
                  fill="none"
                  stroke={roleColors.stroke}
                  strokeWidth={3}
                  opacity={0.4}
                  className="animate-pulse"
                />
              )}

              {/* Main bubble */}
              <circle
                r={bubble.radius}
                fill={roleColors.fill}
                stroke={roleColors.stroke}
                strokeWidth={isHovered ? 3 : 2}
                style={{
                  transition: 'stroke-width 0.2s, transform 0.2s',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                }}
              />

              {/* User initials or name */}
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={roleColors.text}
                fontSize={bubble.radius > 50 ? 16 : 12}
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                {bubble.radius > 45 ? bubble.fullName.split(' ')[0] : getInitials(bubble.fullName)}
              </text>

              {/* Score badge */}
              <g transform={`translate(${bubble.radius * 0.6}, ${-bubble.radius * 0.6})`}>
                <circle
                  r={12}
                  fill={roleColors.stroke}
                  opacity={0.9}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={8}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {bubble.score > 999 ? '999+' : bubble.score}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className={`absolute bottom-2 sm:bottom-4 ${lang === 'ar' ? 'right-2 sm:right-4' : 'left-2 sm:left-4'} flex gap-2 sm:gap-4 text-xs sm:text-sm`}>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500/30 border-2 border-blue-500"></div>
          <span className={colors.textSecondary}>{lang === 'ar' ? 'مدقق' : 'Reviewer'}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500/30 border-2 border-green-500"></div>
          <span className={colors.textSecondary}>{lang === 'ar' ? 'مساهم' : 'Contributor'}</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredBubble && (
        <div
          className={`absolute z-50 pointer-events-none`}
          style={{
            left: Math.min(mousePos.x + 15, dimensions.width - 220),
            top: Math.min(mousePos.y + 15, dimensions.height - 200),
          }}
        >
          <div className={`${colors.bgSecondary} rounded-xl shadow-2xl border-2 ${colors.border} p-4 min-w-[200px]`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  hoveredBubble.role === 'supervisor' ? 'bg-blue-500' : 'bg-green-500'
                }`}
              >
                {getInitials(hoveredBubble.fullName)}
              </div>
              <div>
                <p className={`font-bold ${colors.textPrimary}`}>{hoveredBubble.fullName}</p>
                <p className={`text-xs ${colors.textSecondary}`}>
                  {hoveredBubble.role === 'supervisor'
                    ? (lang === 'ar' ? 'مدقق' : 'Reviewer')
                    : (lang === 'ar' ? 'مساهم' : 'Contributor')
                  }
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2 text-sm">
              {hoveredBubble.stats.uploads > 0 && (
                <div className="flex justify-between">
                  <span className={colors.textSecondary}>📎 {lang === 'ar' ? 'المرفقات' : 'Uploads'}</span>
                  <span className={`font-semibold ${colors.textPrimary}`}>{hoveredBubble.stats.uploads}</span>
                </div>
              )}
              {hoveredBubble.stats.tasksCompleted > 0 && (
                <div className="flex justify-between">
                  <span className={colors.textSecondary}>✅ {lang === 'ar' ? 'المهام المنجزة' : 'Tasks Done'}</span>
                  <span className={`font-semibold ${colors.textPrimary}`}>{hoveredBubble.stats.tasksCompleted}</span>
                </div>
              )}
              {hoveredBubble.stats.reviewed > 0 && (
                <div className="flex justify-between">
                  <span className={colors.textSecondary}>👁️ {lang === 'ar' ? 'المراجعات' : 'Reviewed'}</span>
                  <span className={`font-semibold ${colors.textPrimary}`}>{hoveredBubble.stats.reviewed}</span>
                </div>
              )}
              {hoveredBubble.stats.approved > 0 && (
                <div className="flex justify-between">
                  <span className={colors.textSecondary}>✓ {lang === 'ar' ? 'الموافقات' : 'Approved'}</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{hoveredBubble.stats.approved}</span>
                </div>
              )}
              {hoveredBubble.stats.rejected > 0 && (
                <div className="flex justify-between">
                  <span className={colors.textSecondary}>✗ {lang === 'ar' ? 'المرفوضات' : 'Rejected'}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{hoveredBubble.stats.rejected}</span>
                </div>
              )}
              {hoveredBubble.stats.comments > 0 && (
                <div className="flex justify-between">
                  <span className={colors.textSecondary}>💬 {lang === 'ar' ? 'التعليقات' : 'Comments'}</span>
                  <span className={`font-semibold ${colors.textPrimary}`}>{hoveredBubble.stats.comments}</span>
                </div>
              )}
            </div>

            {/* Total Score */}
            <div className={`mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center`}>
              <span className={`font-semibold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'نقاط المساهمة' : 'Contribution Score'}
              </span>
              <span className={`text-lg font-bold ${
                hoveredBubble.role === 'supervisor' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {hoveredBubble.score}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributionBubbleCloud;
