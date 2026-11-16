import { z } from 'zod';

export const TeamIdSchema = z.enum([
  'software-engineer',
  'game-developer',
  'product-analyst',
  'product-associate',
  'data-analyst',
  'ui-ux-designer',
  'growth-analyst',
  'marketing-associate',
  'founders-office',
]);

export type TeamId = z.infer<typeof TeamIdSchema>;

export const TEAM_DISPLAY_NAMES: Record<TeamId, string> = {
  'software-engineer': 'Software Engineer',
  'game-developer': 'Game Developer',
  'product-analyst': 'Product Analyst',
  'product-associate': 'Product Associate',
  'data-analyst': 'Data Analyst',
  'ui-ux-designer': 'UI/UX Designer',
  'growth-analyst': 'Growth Analyst',
  'marketing-associate': 'Marketing Associate',
  'founders-office': 'Founder’s Office',
};

export const TEAM_COLORS: Record<TeamId, string> = {
  'software-engineer': '#4A6FA5',
  'game-developer': '#5E8C6A',
  'product-analyst': '#7B5EA7',
  'product-associate': '#C2607A',
  'data-analyst': '#3E8E93',
  'ui-ux-designer': '#D98A4A',
  'growth-analyst': '#B8962E',
  'marketing-associate': '#BF4B45',
  'founders-office': '#8A9A3B',
};

export const TaskStatusTypeSchema = z.enum(['todo', 'working', 'done']);
export type TaskStatusType = z.infer<typeof TaskStatusTypeSchema>;

export const IssueSchema = z.object({
  theme: z.string(),
  problem: z.string(),
  evidence: z.string(),
  severity: z.number().min(1).max(3),
  confidence: z.number(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const ReviewTeamSchema = z.object({
  team: TeamIdSchema,
  themes: z.array(z.string()),
});
export type ReviewTeam = z.infer<typeof ReviewTeamSchema>;

export const ReviewSchema = z.object({
  id: z.string(),
  alias: z.string(),
  stars: z.number().min(1).max(5),
  date: z.string().nullable(),
  version: z.string().nullable().optional(),
  thumbs: z.number(),
  text: z.string(),
  actionable: z.boolean(),
  dev_reply: z
    .object({
      text: z.string().nullable(),
      date: z.string().nullable(),
    })
    .nullable()
    .optional(),
  issues: z.array(IssueSchema),
  teams: z.array(ReviewTeamSchema),
  sort_score: z.number().optional(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const TaxonomyThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  includes: z.array(z.string()),
  excludes: z.array(z.string()),
  teams: z.array(TeamIdSchema),
});
export type TaxonomyTheme = z.infer<typeof TaxonomyThemeSchema>;

export const TaxonomySchema = z.object({
  version: z.string(),
  themes: z.array(TaxonomyThemeSchema),
});
export type Taxonomy = z.infer<typeof TaxonomySchema>;

export const ExperimentItemSchema = z.object({
  experiment: z.string(),
  metric: z.string(),
  metric_note: z.string(),
  source: z.string(),
});
export type ExperimentItem = z.infer<typeof ExperimentItemSchema>;

export type ExperimentsMap = Record<string, ExperimentItem>;

export const PriorityRankingSchema = z.object({
  theme: z.string(),
  name: z.string(),
  priority_score: z.number(),
  volume_count: z.number(),
  volume_share: z.number(),
  severity_norm: z.number(),
  recency_factor: z.number(),
  engagement_factor: z.number(),
  raw_score: z.number(),
  confidence: z.enum(['High', 'Medium', 'Low']),
  agreement_f1: z.number(),
  primary_team: TeamIdSchema,
  teams: z.array(TeamIdSchema),
});
export type PriorityRanking = z.infer<typeof PriorityRankingSchema>;

export const InsightsSchema = z.object({
  generated_at: z.string(),
  total_reviews: z.number(),
  actionable_reviews: z.number(),
  priority_rankings: z.array(PriorityRankingSchema),
  theme_distribution: z.record(z.number()),
  severity_mix: z.record(z.number()),
  star_distribution: z.record(z.number()),
  version_trends: z.record(z.record(z.number())),
  weekly_trends: z.record(z.number()).optional(),
  reply_stats: z.object({
    available: z.boolean(),
    note: z.string(),
  }),
});
export type Insights = z.infer<typeof InsightsSchema>;

export const MetaSchema = z.object({
  app_id: z.string(),
  store: z.string(),
  country: z.string(),
  language: z.string(),
  collected_at: z.string(),
  total_collected: z.number(),
  total_cleaned: z.number(),
  total_actionable: z.number(),
  retention_rate_pct: z.number(),
  date_range: z.array(z.string()),
  cleaning_drops: z.record(z.number()),
  version_coverage: z.record(z.number()).optional(),
});
export type MetaData = z.infer<typeof MetaSchema>;

export interface TaskStatusRecord {
  review_id: string;
  team: TeamId;
  status: TaskStatusType;
  assignee: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface TaskNoteRecord {
  id: number;
  review_id: string;
  team: TeamId;
  body: string;
  author: string | null;
  created_at: string;
}

export interface TaskActivityRecord {
  id: number;
  review_id: string;
  team: TeamId;
  kind: 'status' | 'assignee' | 'note' | 'viewing';
  from_value: string | null;
  to_value: string | null;
  actor: string | null;
  created_at: string;
}
