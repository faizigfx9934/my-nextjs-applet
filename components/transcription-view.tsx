'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  Type,
  Sparkles,
  Loader2,
  Search,
  ExternalLink,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface TranscriptionViewProps {
  transcription: {
    fileName: string;
    lines: string[];
    paragraphs?: string | string[][];
  };
  onBack: () => void;
}

interface Entity {
  text: string;
  type: 'name' | 'year' | 'place';
}

interface AnalysisResult {
  [key: string]: Entity[];
}

export function TranscriptionView({ transcription, onBack }: TranscriptionViewProps) {
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [fontSize, setFontSize] = useState(20);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{ text: string, type: string, lineIndex: number } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [completedParagraphs, setCompletedParagraphs] = useState<Set<number>>(new Set());
  
  const analyzeText = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: transcription.lines }),
      });

      if (!response.ok) throw new Error('Failed to analyze script');

      const data = await response.json();
      const result: AnalysisResult = {};
      
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((item: any) => {
          if (item.index !== undefined && Array.isArray(item.entities)) {
            result[item.index.toString()] = item.entities;
          }
        });
      }
      
      const foundCount = Object.keys(result).length;
      if (foundCount === 0) {
        toast.info('No names, years, or places were found.');
      } else {
        setAnalysis(result);
        toast.success(`Analysis complete! Found entities in ${foundCount} lines.`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze script');
    } finally {
      setIsAnalyzing(false);
    }
  }, [transcription.lines]);

  // Automatic analysis on mount
  useEffect(() => {
    if (transcription.lines.length > 0 && !analysis && !isAnalyzing) {
      analyzeText();
    }
  }, [analysis, analyzeText, isAnalyzing, transcription.lines.length]);

  // Group lines into paragraphs if missing (fallback for old data)
  const paragraphs = useMemo(() => {
    if (!transcription.paragraphs) return [transcription.lines];
    if (typeof transcription.paragraphs === 'string') {
      try {
        return JSON.parse(transcription.paragraphs) as string[][];
      } catch (e) {
        return [transcription.lines];
      }
    }
    return transcription.paragraphs;
  }, [transcription.paragraphs, transcription.lines]);

  const currentParagraph = paragraphs[activeParagraphIndex] || [];

  const handleNextWithFlash = () => {
    const isAlreadyCompleted = completedParagraphs.has(activeParagraphIndex);
    
    if (isAlreadyCompleted) {
      setCompletedParagraphs(prev => {
        const next = new Set(prev);
        next.delete(activeParagraphIndex);
        return next;
      });
      return;
    }

    const isLast = activeParagraphIndex === paragraphs.length - 1;
    
    setCompletedParagraphs(prev => {
      const next = new Set(prev);
      next.add(activeParagraphIndex);
      return next;
    });

    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
      if (!isLast) {
        setActiveParagraphIndex(prev => prev + 1);
      } else {
        toast.success("You've reached the end of the script!");
      }
    }, 300);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Copied to clipboard');
  };

  const searchGoogle = (text: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderLine = (line: string, globalIndex: number) => {
    const lineEntities = analysis?.[globalIndex.toString()] || [];
    if (lineEntities.length === 0) return line;

    const sortedEntities = [...lineEntities].sort((a, b) => b.text.length - a.text.length);
    let highlightedLine: React.ReactNode[] = [line];

    sortedEntities.forEach((entity) => {
      const newHighlightedLine: React.ReactNode[] = [];
      highlightedLine.forEach((part) => {
        if (typeof part !== 'string') {
          newHighlightedLine.push(part);
          return;
        }

        const escapedText = escapeRegExp(entity.text);
        const parts = part.split(new RegExp(`(${escapedText})`, 'gi'));
        parts.forEach((p, i) => {
          if (p.toLowerCase() === entity.text.toLowerCase()) {
            newHighlightedLine.push(
              <span 
                key={`${globalIndex}-${entity.text}-${i}`} 
                className="relative inline-block group/entity"
                onMouseEnter={() => setHoveredEntity({ text: p, type: entity.type, lineIndex: globalIndex })}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                <span className="px-1 rounded font-bold bg-[#4ADE80] text-black shadow-sm cursor-help">
                  {p}
                </span>
                
                <AnimatePresence>
                  {hoveredEntity?.text === p && hoveredEntity?.lineIndex === globalIndex && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-popover text-popover-foreground p-2 rounded-xl border shadow-2xl flex items-center gap-1 min-w-max"
                    >
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 gap-1.5 text-xs font-bold rounded-lg"
                        onClick={() => handleCopy(p, `entity-${globalIndex}-${i}`)}
                      >
                        {copiedIndex === `entity-${globalIndex}-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </Button>
                      <div className="w-px h-4 bg-muted mx-1" />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 gap-1.5 text-xs font-bold rounded-lg hover:text-primary"
                        onClick={() => searchGoogle(p)}
                      >
                        <Search className="w-3 h-3" />
                        Search
                        <ExternalLink className="w-2 h-2 opacity-50" />
                      </Button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-popover" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </span>
            );
          } else if (p) {
            newHighlightedLine.push(p);
          }
        });
      });
      highlightedLine = newHighlightedLine;
    });

    return highlightedLine;
  };

  // Calculate global line index for analysis lookups
  const getGlobalIndex = (localIndex: number) => {
    let globalIndex = 0;
    for (let i = 0; i < activeParagraphIndex; i++) {
      globalIndex += paragraphs[i].length;
    }
    return globalIndex + localIndex;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col relative h-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/80 backdrop-blur-xl p-6 rounded-[2rem] border border-border shadow-xl mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-primary/10 h-12 w-12">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h2 className="font-black text-2xl line-clamp-1 tracking-tighter uppercase">{transcription.fileName}</h2>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
              Section {activeParagraphIndex + 1} of {paragraphs.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={analyzeText} 
            disabled={isAnalyzing}
            className="rounded-xl gap-2 h-11 px-5 font-black uppercase tracking-tight border-2"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
          <div className="flex items-center bg-muted/50 rounded-xl p-1 border-2 border-border">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
              className="h-9 w-9 rounded-lg"
            >
              <Type className="w-3 h-3" />
            </Button>
            <span className="text-xs font-black w-8 text-center">{fontSize}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setFontSize(Math.min(40, fontSize + 2))}
              className="h-9 w-9 rounded-lg"
            >
              <Type className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={toggleFullscreen} className="rounded-xl h-11 w-11 border-2">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area with Side Navigation */}
      <div className="flex-1 flex items-center gap-6 relative min-h-0">
        {/* Previous Button (Side) */}
        <div className="hidden lg:flex items-center justify-center w-20 shrink-0">
          <Button 
            variant="ghost" 
            size="icon"
            disabled={activeParagraphIndex === 0}
            onClick={() => setActiveParagraphIndex(prev => Math.max(0, prev - 1))}
            className="h-20 w-20 rounded-full hover:bg-primary/10 hover:text-primary disabled:opacity-10 transition-all duration-300 border-2 border-transparent hover:border-primary/20"
          >
            <ChevronLeft className="w-10 h-10" />
          </Button>
        </div>

        {/* Content Card */}
        <Card className="flex-1 rounded-[2.5rem] overflow-hidden border-border bg-card shadow-2xl flex flex-col h-full">
          <ScrollArea className="flex-1">
            <div className="p-6 sm:p-12 flex flex-col items-center justify-center min-h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeParagraphIndex}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    backgroundColor: (isFlashing || completedParagraphs.has(activeParagraphIndex)) ? 'rgba(var(--primary), 0.15)' : 'transparent',
                    borderColor: (isFlashing || completedParagraphs.has(activeParagraphIndex)) ? 'rgba(var(--primary), 0.4)' : 'rgba(var(--border), 1)'
                  }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="w-full max-w-5xl rounded-[2rem] border-2 p-10 sm:p-16 shadow-inner relative transition-colors duration-300"
                >
                  <div className="absolute -top-4 left-10 px-6 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-black tracking-[0.2em] uppercase shadow-xl shadow-primary/20">
                    Section {(activeParagraphIndex + 1).toString().padStart(2, '0')}
                  </div>

                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <Button 
                      size="lg" 
                      variant="ghost" 
                      onClick={handleNextWithFlash}
                      className={`rounded-2xl h-12 px-6 gap-3 font-black uppercase tracking-tight transition-all border-2 ${
                        completedParagraphs.has(activeParagraphIndex) 
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                          : 'hover:bg-primary/10 hover:text-primary border-transparent hover:border-primary/20'
                      }`}
                    >
                      <CheckCircle2 className={`w-5 h-5 ${completedParagraphs.has(activeParagraphIndex) ? 'fill-current' : ''}`} />
                      {completedParagraphs.has(activeParagraphIndex) ? 'Completed' : 'Done'}
                    </Button>
                  </div>

                  <div className="space-y-10">
                    {currentParagraph.map((line, localIndex) => {
                      const globalIndex = getGlobalIndex(localIndex);
                      return (
                        <div
                          key={globalIndex}
                          className="group relative flex items-start gap-8 hover:bg-muted/30 p-4 -mx-4 rounded-2xl transition-all duration-200"
                        >
                          <span className="text-xs font-black mt-2 w-12 shrink-0 text-center text-muted-foreground/40 select-none font-mono">
                            {(globalIndex + 1).toString().padStart(3, '0')}
                          </span>
                          <div 
                            className="flex-1 font-bold leading-relaxed tracking-tight text-foreground/90"
                            style={{ fontSize: `${fontSize}px` }}
                          >
                            {renderLine(line, globalIndex)}
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleCopy(line, `line-${globalIndex}`)}
                            >
                              {copiedIndex === `line-${globalIndex}` ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Mobile Navigation (Bottom) */}
          <div className="lg:hidden flex items-center justify-between p-6 border-t border-border bg-card">
            <Button 
              variant="outline" 
              size="lg"
              disabled={activeParagraphIndex === 0}
              onClick={() => setActiveParagraphIndex(prev => Math.max(0, prev - 1))}
              className="rounded-2xl h-14 px-8 font-black uppercase tracking-tight border-2"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Prev
            </Button>
            <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              {activeParagraphIndex + 1} / {paragraphs.length}
            </span>
            <Button 
              variant="outline" 
              size="lg"
              disabled={activeParagraphIndex === paragraphs.length - 1}
              onClick={() => setActiveParagraphIndex(prev => Math.min(paragraphs.length - 1, prev + 1))}
              className="rounded-2xl h-14 px-8 font-black uppercase tracking-tight border-2"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </Card>

        {/* Next Button (Side) */}
        <div className="hidden lg:flex items-center justify-center w-20 shrink-0">
          <Button 
            variant="ghost" 
            size="icon"
            disabled={activeParagraphIndex === paragraphs.length - 1}
            onClick={() => setActiveParagraphIndex(prev => Math.min(paragraphs.length - 1, prev + 1))}
            className="h-20 w-20 rounded-full hover:bg-primary/10 hover:text-primary disabled:opacity-10 transition-all duration-300 border-2 border-transparent hover:border-primary/20"
          >
            <ChevronRight className="w-10 h-10" />
          </Button>
        </div>
      </div>

      {/* Progress Bar (Bottom) */}
      <div className="mt-8 flex items-center justify-center gap-2 shrink-0">
        {paragraphs.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === activeParagraphIndex ? 'w-12 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'w-2 bg-muted-foreground/20'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
