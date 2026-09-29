import React, { useState } from 'react';
import {
  Brain,
  Search,
  Sparkles,
  Database,
  Plus,
  Send,
  Loader2,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { searchMemory, reflectMemory, retainMemory, seedPlaybooks } from '../api';
import toast from 'react-hot-toast';

export default function MemoryHub() {
  // Search State
  const [searchQuery, setSearchQuery] = useState('database connection pool exhaustion');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Reflection State
  const [reflectQuery, setReflectQuery] = useState(
    'What are the common root causes and successful mitigations for database latency spikes during high traffic?'
  );
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [reflecting, setReflecting] = useState(false);

  // Retain Custom Memory State
  const [postmortemContent, setPostmortemContent] = useState('');
  const [retaining, setRetaining] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const data = await searchMemory(searchQuery.trim());
      setSearchResults(data.results || []);
      if ((data.results || []).length === 0) {
        toast('No matching memories found in Hindsight bank', { icon: '🔍' });
      }
    } catch {
      toast.error('Failed to search Hindsight memory');
    } finally {
      setSearching(false);
    }
  };

  const handleReflect = async (e) => {
    e.preventDefault();
    if (!reflectQuery.trim()) return;

    try {
      setReflecting(true);
      const data = await reflectMemory(reflectQuery.trim());
      setReflectionAnswer(data.reflection || 'No reflection response generated.');
    } catch {
      toast.error('Failed to query Hindsight reflection');
    } finally {
      setReflecting(false);
    }
  };

  const handleRetain = async (e) => {
    e.preventDefault();
    if (!postmortemContent.trim()) return;

    try {
      setRetaining(true);
      const res = await retainMemory(postmortemContent.trim());
      if (res.retained) {
        toast.success('Postmortem retained in Hindsight long-term memory bank!');
        setPostmortemContent('');
      } else {
        toast.error('Could not retain to memory bank (Hindsight service check)');
      }
    } catch {
      toast.error('Failed to retain memory');
    } finally {
      setRetaining(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await seedPlaybooks();
      toast.success(
        `Seeded ${res.retained_successfully || res.total_seeded} postmortems into Hindsight memory!`,
        { duration: 5000 }
      );
    } catch {
      toast.error('Failed to seed playbooks');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-card to-subtle p-6 rounded-xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-accent flex items-center gap-1">
              <Brain size={12} /> Hindsight Memory Bank
            </span>
            <span className="text-xs text-muted">Long-Term Incident Knowledge Core</span>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Organizational Memory & Hindsight Intelligence
          </h1>
          <p className="text-sm text-secondary max-w-2xl mt-1">
            Explore indexed historical postmortems, test similarity retrieval (Recall), and synthesise
            cross-incident learnings (Reflect) to prepare for future outages.
          </p>
        </div>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="btn btn-primary btn-sm flex items-center gap-1-5 flex-shrink-0"
        >
          <Sparkles size={15} />
          <span>{seeding ? 'Seeding...' : 'Seed Standard Playbooks'}</span>
        </button>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Recall + Retain (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recall / Search Memories */}
          <div className="card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-badge icon-badge-accent">
                  <Search size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary">Recall Past Incidents</h3>
                  <p className="text-[11px] text-muted">
                    Test how Hindsight retrieves similar past incidents for any symptom query
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g., Redis connection pool timeout, JWT verification mismatch..."
                  className="form-input text-xs flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="btn btn-primary btn-sm flex items-center gap-1 px-3"
                >
                  {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Recall</span>
                </button>
              </form>

              {/* Search Results */}
              <div className="space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-border bg-subtle text-xs space-y-1.5"
                    >
                      <div className="font-semibold text-accent flex items-center gap-1.5">
                        <Brain size={13} /> Recalled Memory #{idx + 1}
                      </div>
                      <div className="text-secondary whitespace-pre-wrap leading-relaxed font-mono text-[11px] bg-black/20 p-2.5 rounded">
                        {typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted text-xs border border-dashed border-border rounded-lg">
                    Enter a symptom query above or click "Seed Standard Playbooks" to explore memories.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Retain Custom Postmortem */}
          <div className="card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-badge icon-badge-subtle">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary">Retain Knowledge / Postmortem</h3>
                  <p className="text-[11px] text-muted">
                    Directly store playbooks, past incident analyses, or runbook lessons into Hindsight
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <form onSubmit={handleRetain} className="space-y-3">
                <textarea
                  rows={5}
                  required
                  placeholder="Paste past incident postmortem, root cause, what worked, what failed..."
                  className="form-input text-xs font-mono"
                  value={postmortemContent}
                  onChange={(e) => setPostmortemContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={retaining}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                  >
                    {retaining ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Brain size={14} className="text-accent" />
                    )}
                    <span>Index in Hindsight Memory</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Reflect & Synthesise (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card border-accent/40 bg-gradient-to-b from-card to-card/80">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-badge icon-badge-accent">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary">Hindsight Reflection</h3>
                  <p className="text-[11px] text-muted">
                    Synthesise insights across all stored incident memories
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={handleReflect} className="space-y-3">
                <label className="form-label text-xs">Strategic SRE / Incident Question</label>
                <textarea
                  rows={3}
                  required
                  className="form-input text-xs"
                  value={reflectQuery}
                  onChange={(e) => setReflectQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={reflecting}
                  className="btn btn-primary btn-sm w-full flex items-center justify-center gap-1.5"
                >
                  {reflecting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Synthesising Memories...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Reflect Across Memories
                    </>
                  )}
                </button>
              </form>

              {/* Reflection Output */}
              {reflectionAnswer && (
                <div className="mt-4 p-4 rounded-lg bg-subtle border border-border space-y-2">
                  <div className="text-xs font-semibold text-accent flex items-center gap-1.5">
                    <Brain size={14} /> Synthesised Memory Reflection
                  </div>
                  <div className="text-xs leading-relaxed text-secondary whitespace-pre-wrap">
                    {reflectionAnswer}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Playbook Reference Card */}
          <div className="card p-4 space-y-3">
            <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-success" />
              Pre-loaded Memory Archetypes
            </div>
            <div className="space-y-2 text-xs text-secondary">
              <div className="p-2 rounded bg-subtle border border-border">
                <span className="font-semibold text-primary">INC-0010:</span> Checkout DB connection pool exhaustion (HikariCP / Postgres index).
              </div>
              <div className="p-2 rounded bg-subtle border border-border">
                <span className="font-semibold text-primary">INC-0011:</span> Auth JWKS cache invalidation bug during key rotation.
              </div>
              <div className="p-2 rounded bg-subtle border border-border">
                <span className="font-semibold text-primary">INC-0012:</span> Payment Stripe webhook concurrency deadlock & Celery queue lag.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
