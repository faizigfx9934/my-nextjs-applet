'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { signInWithGoogle, logout } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/file-upload';
import { TranscriptionView } from '@/components/transcription-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';
import { 
  Plus, 
  LogOut, 
  FileText, 
  Trash2, 
  Video, 
  Type,
  LayoutDashboard,
  Clock,
  RotateCcw,
  Trash,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Transcription {
  id: string;
  fileName: string;
  lines: string[];
  createdAt: any;
  status?: 'active' | 'deleted';
}

export default function Home() {
  const { user, loading } = useAuth();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [deletedTranscriptions, setDeletedTranscriptions] = useState<Transcription[]>([]);
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transcriptions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transcription[];
      
      setTranscriptions(allData.filter(t => t.status !== 'deleted'));
      setDeletedTranscriptions(allData.filter(t => t.status === 'deleted'));
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'transcriptions', id), {
        status: 'deleted',
        updatedAt: new Date()
      });
      toast.success('Moved to bin', {
        action: {
          label: 'View Bin',
          onClick: () => setActiveTab('bin')
        }
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to move to bin');
    }
  };

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'transcriptions', id), {
        status: 'active',
        updatedAt: new Date()
      });
      toast.success('Restored transcription');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore');
    }
  };

  const handlePermanentDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to permanently delete this transcription? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'transcriptions', id));
        toast.success('Permanently deleted');
      } catch (error) {
        console.error('Permanent delete error:', error);
        toast.error('Failed to delete permanently');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-12"
        >
          <div className="space-y-6">
            <div className="inline-flex p-4 rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/40 mb-4">
              <Video className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-black tracking-tighter sm:text-8xl uppercase">
                Transcribe<span className="text-primary">Pro</span>
              </h1>
              <p className="text-xl text-muted-foreground font-medium max-w-xl mx-auto">
                The ultimate video editing companion. Convert scripts into a surgical line-by-line view.
              </p>
            </div>
          </div>

          <Card className="max-w-md mx-auto p-8 rounded-[2.5rem] border-border bg-card shadow-2xl">
            <p className="text-muted-foreground mb-8 text-lg">
              Upload scripts, view line-by-line, and edit your videos with professional precision.
            </p>
            <div className="flex flex-col gap-4">
              <Button size="lg" onClick={signInWithGoogle} className="text-lg h-16 rounded-2xl shadow-xl shadow-primary/10 font-black uppercase tracking-tight">
                Get Started with Google
              </Button>
              <ThemeToggle />
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left">
            <div className="p-8 rounded-[2rem] bg-card border border-border space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-primary/10 text-primary">
                <Type className="w-6 h-6" />
              </div>
              <h3 className="font-black text-xl uppercase tracking-tight">Multi-Format</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Upload scripts from Word, PDF, Markdown, or Text files with ease.</p>
            </div>
            <div className="p-8 rounded-[2rem] bg-card border border-border space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-primary/10 text-primary">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 className="font-black text-xl uppercase tracking-tight">Clean View</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Optimized interface designed specifically for side-by-side video editing workflows.</p>
            </div>
            <div className="p-8 rounded-[2rem] bg-card border border-border space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-primary/10 text-primary">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-black text-xl uppercase tracking-tight">Cloud Sync</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Your scripts are securely stored and synced across all your devices instantly.</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter uppercase">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Video className="w-6 h-6" />
            </div>
            TranscribePro
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:inline-block font-bold">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={logout} className="rounded-xl h-11 px-5 gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors font-bold">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {selectedTranscription ? (
            <TranscriptionView 
              transcription={selectedTranscription} 
              onBack={() => setSelectedTranscription(null)} 
            />
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black tracking-tighter uppercase">Your Scripts</h2>
                  <p className="text-muted-foreground font-medium text-lg">Manage and view your video transcriptions line by line.</p>
                </div>
                <div className="flex items-center gap-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
                    <TabsList className="rounded-2xl h-14 p-1.5 bg-card border border-border">
                      <TabsTrigger value="active" className="rounded-xl px-8 font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Active
                      </TabsTrigger>
                      <TabsTrigger value="bin" className="rounded-xl px-8 font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                        Bin {deletedTranscriptions.length > 0 && <span className="bg-foreground/10 text-foreground text-[10px] px-2 py-0.5 rounded-full">{deletedTranscriptions.length}</span>}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger 
                      render={
                        <Button className="rounded-2xl gap-2 h-14 px-8 shadow-xl shadow-primary/10 font-black uppercase tracking-tight">
                          <Plus className="w-5 h-5" /> New Upload
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-border bg-card shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Upload Script</DialogTitle>
                        <DialogDescription className="text-lg">
                          Upload a .docx or .txt file to start transcribing.
                        </DialogDescription>
                      </DialogHeader>
                      <FileUpload onSuccess={() => setIsUploadOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsContent value="active" className="mt-0">
                  {transcriptions.length === 0 ? (
                    <Card className="border-dashed border-2 border-border bg-card/50 py-24 text-center rounded-[2.5rem]">
                      <CardContent className="space-y-8">
                        <div className="p-8 w-fit mx-auto rounded-[2rem] bg-muted text-muted-foreground shadow-inner">
                          <FileText className="w-16 h-16" />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-3xl font-black uppercase tracking-tighter">No scripts yet</h3>
                          <p className="text-muted-foreground max-w-sm mx-auto font-medium text-lg">
                            Upload your first script to start viewing it line-by-line and editing professionally.
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="rounded-2xl h-14 px-10 font-black uppercase tracking-tight border-2">
                          Upload Now
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <AnimatePresence mode="popLayout">
                        {transcriptions.map((t) => (
                          <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            transition={{ 
                              type: "spring",
                              stiffness: 300,
                              damping: 25
                            }}
                            whileHover={{ y: -6 }}
                            className="group"
                          >
                            <Card 
                              className="hover:shadow-2xl transition-all duration-300 rounded-[2rem] overflow-hidden border-border bg-card cursor-pointer h-full flex flex-col group/card"
                              onClick={() => setSelectedTranscription(t)}
                            >
                              <CardHeader className="p-6 pb-2 space-y-0">
                                <div className="flex items-start justify-between">
                                  <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground transition-all duration-300">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => handleDelete(t.id, e)}
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </div>
                                <CardTitle className="line-clamp-1 mt-4 text-lg font-black uppercase tracking-tight group-hover:text-primary transition-colors">{t.fileName}</CardTitle>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold mt-2">
                                  <Clock className="w-4 h-4" />
                                  {t.lines.length} lines • {new Date(t.createdAt?.seconds * 1000).toLocaleDateString()}
                                </div>
                              </CardHeader>
                              <CardContent className="p-6 pt-2 flex-1">
                                <div className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-4 rounded-2xl border border-border">
                                  &ldquo;{t.lines[0]}...&rdquo;
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="bin" className="mt-0">
                  {deletedTranscriptions.length === 0 ? (
                    <Card className="border-dashed border-2 border-border bg-card/50 py-24 text-center rounded-[2.5rem]">
                      <CardContent className="space-y-8">
                        <div className="p-8 w-fit mx-auto rounded-[2rem] bg-muted text-muted-foreground shadow-inner">
                          <Trash2 className="w-16 h-16" />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-3xl font-black uppercase tracking-tighter">Bin is empty</h3>
                          <p className="text-muted-foreground max-w-sm mx-auto font-medium text-lg">
                            Deleted scripts will appear here. You can restore them or delete them permanently.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <AnimatePresence mode="popLayout">
                        {deletedTranscriptions.map((t) => (
                          <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            transition={{ 
                              type: "spring",
                              stiffness: 300,
                              damping: 25
                            }}
                            whileHover={{ y: -6 }}
                            className="group"
                          >
                            <Card className="hover:shadow-2xl transition-all duration-300 rounded-[2rem] overflow-hidden border-border bg-card h-full flex flex-col group/card">
                              <CardHeader className="p-6 pb-2 space-y-0">
                                <div className="flex items-start justify-between">
                                  <div className="p-3 rounded-2xl bg-muted text-muted-foreground">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-10 w-10 rounded-xl text-primary hover:bg-primary/10"
                                      onClick={(e) => handleRestore(t.id, e)}
                                      title="Restore"
                                    >
                                      <RotateCcw className="w-5 h-5" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"
                                      onClick={(e) => handlePermanentDelete(t.id, e)}
                                      title="Delete Permanently"
                                    >
                                      <Trash className="w-5 h-5" />
                                    </Button>
                                  </div>
                                </div>
                                <CardTitle className="line-clamp-1 mt-4 text-lg font-black uppercase tracking-tight text-muted-foreground">{t.fileName}</CardTitle>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold mt-2">
                                  <Clock className="w-4 h-4" />
                                  {t.lines.length} lines • {new Date(t.createdAt?.seconds * 1000).toLocaleDateString()}
                                </div>
                              </CardHeader>
                              <CardContent className="p-6 pt-2 flex-1">
                                <div className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-4 rounded-2xl border border-border opacity-50">
                                  &ldquo;{t.lines[0]}...&rdquo;
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border bg-card py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
          <p>© 2026 TranscribePro. Built for professional video editors.</p>
        </div>
      </footer>
    </div>
  );
}
