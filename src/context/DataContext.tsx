import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Review,
  ReviewSchema,
  Taxonomy,
  TaxonomySchema,
  Insights,
  InsightsSchema,
  MetaData,
  MetaSchema,
  ExperimentsMap,
  TeamId,
  TEAM_DISPLAY_NAMES,
} from '../types';
import { z } from 'zod';
import { taskStore } from '../store/TaskStore';

interface DataContextType {
  loading: boolean;
  error: string | null;
  reviews: Review[];
  taxonomy: Taxonomy | null;
  insights: Insights | null;
  meta: MetaData | null;
  experiments: ExperimentsMap;
  evalData: Record<string, unknown> | null;
  selectedTeam: TeamId | null;
  setSelectedTeam: (t: TeamId | null) => void;
  viewingAsTeam: TeamId;
  setViewingAsTeam: (t: TeamId) => void;
  actorName: string;
  setActorName: (name: string) => void;
  theme: 'light' | 'dark';
  setTheme: (th: 'light' | 'dark') => void;
  toggleTheme: () => void;
  retry: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [experiments, setExperiments] = useState<ExperimentsMap>({});
  const [evalData, setEvalData] = useState<Record<string, unknown> | null>(null);

  // User State
  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
  const [viewingAsTeam, setViewingAsTeamState] = useState<TeamId>(() => {
    try {
      const saved = localStorage.getItem('hw_viewing_as_team');
      if (saved && saved in TEAM_DISPLAY_NAMES) return saved as TeamId;
    } catch {
      // Ignore
    }
    return 'product-analyst';
  });

  const [actorName, setActorNameState] = useState<string>(() => {
    try {
      return localStorage.getItem('hw_actor_name') || 'Product Analyst';
    } catch {
      return 'Product Analyst';
    }
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('hw_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Ignore
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('hw_theme', theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setViewingAsTeam = (t: TeamId) => {
    setViewingAsTeamState(t);
    try {
      localStorage.setItem('hw_viewing_as_team', t);
    } catch {
      // Ignore
    }
  };

  const setActorName = (name: string) => {
    setActorNameState(name);
    try {
      localStorage.setItem('hw_actor_name', name);
    } catch {
      // Ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [revRes, taxRes, insRes, metaRes, expRes, evalRes] = await Promise.all([
        fetch('/data/reviews.json'),
        fetch('/data/taxonomy.json'),
        fetch('/data/insights.json'),
        fetch('/data/meta.json'),
        fetch('/data/experiments.json'),
        fetch('/data/eval.json'),
      ]);

      if (!revRes.ok || !taxRes.ok || !insRes.ok) {
        throw new Error('Could not load required data files. Please check network.');
      }

      const revJson = await revRes.json();
      const taxJson = await taxRes.json();
      const insJson = await insRes.json();
      const metaJson = metaRes.ok ? await metaRes.json() : null;
      const expJson = expRes.ok ? await expRes.json() : {};
      const evalJson = evalRes.ok ? await evalRes.json() : null;

      // Zod Validations
      const parsedTax = TaxonomySchema.parse(taxJson);
      const parsedIns = InsightsSchema.parse(insJson);
      const parsedReviews = z.array(ReviewSchema).parse(revJson.reviews);

      setTaxonomy(parsedTax);
      setInsights(parsedIns);
      setReviews(parsedReviews);
      if (metaJson) setMeta(MetaSchema.parse(metaJson));
      setExperiments(expJson);
      setEvalData(evalJson);
      setLoading(false);
      // Log initial viewing session
      taskStore.recordViewer(actorName, viewingAsTeam);
    } catch (err) {
      console.error('Data loading error:', err);
      setError((err as Error).message || 'Failed to load static datasets');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DataContext.Provider
      value={{
        loading,
        error,
        reviews,
        taxonomy,
        insights,
        meta,
        experiments,
        evalData,
        selectedTeam,
        setSelectedTeam,
        viewingAsTeam,
        setViewingAsTeam,
        actorName,
        setActorName,
        theme,
        setTheme: setThemeState,
        toggleTheme,
        retry: loadData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
};
