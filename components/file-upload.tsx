'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileUploadProps {
  onSuccess: () => void;
}

export function FileUpload({ onSuccess }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const processFile = async (file: File) => {
      setIsUploading(true);
      try {
        let paragraphs: string[][] = [];
        let allLines: string[] = [];

        if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const html = result.value;
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const elements = Array.from(doc.body.children);
          
          elements.forEach((el) => {
            const text = el.textContent?.trim();
            if (!text) return;

            // Every element (p, h1, etc.) becomes its own paragraph/section
            paragraphs.push([text]);
          });
        } else if (file.name.endsWith('.pdf')) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            // Split page text into sentences or blocks
            const blocks = pageText.split(/\. /).filter(b => b.trim().length > 0);
            blocks.forEach(block => {
              paragraphs.push([block.trim() + '.']);
            });
          }
        } else {
          const text = await file.text();
          // Split by double newlines to get distinct paragraphs
          const rawParagraphs = text.split(/\r?\n\r?\n/).filter(p => p.trim().length > 0);
          
          rawParagraphs.forEach((p) => {
            // Split each paragraph into lines if it has internal newlines
            const lines = p.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) {
              // The user wants each block to be its own section. 
              // If a paragraph has multiple lines, we can either keep them together or split them.
              // Given the request "move 003 to section 3", it seems they want even more granularity.
              // Let's treat every single line as its own section for now to be safe.
              lines.forEach(line => {
                paragraphs.push([line]);
              });
            }
          });
        }

        // Filter out empty paragraphs and flatten for allLines
        paragraphs = paragraphs.filter(p => p.length > 0);
        allLines = paragraphs.flat();

        if (allLines.length === 0) {
          throw new Error('No text content found in file.');
        }

        if (!auth.currentUser) throw new Error('User not authenticated');

        await addDoc(collection(db, 'transcriptions'), {
          userId: auth.currentUser.uid,
          fileName: file.name,
          lines: allLines,
          paragraphs: JSON.stringify(paragraphs),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
        });

        toast.success('File uploaded and processed successfully!');
        onSuccess();
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to process file');
      } finally {
        setIsUploading(false);
      }
    };

    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-4 border-dashed rounded-[2rem] p-16 text-center cursor-pointer transition-all duration-300 ${
        isDragActive 
          ? 'border-primary bg-primary/10 shadow-2xl shadow-primary/20 scale-[0.99]' 
          : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-6">
        <div className="p-6 rounded-[1.5rem] bg-primary text-primary-foreground shadow-xl shadow-primary/20">
          {isUploading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10" />}
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-black uppercase tracking-tighter">
            {isDragActive ? 'Drop the file here' : 'Click or drag file'}
          </p>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
            Supports .docx, .txt, .md, and .pdf files
          </p>
        </div>
        {!isUploading && (
          <Button variant="outline" className="mt-4 rounded-xl h-12 px-8 font-black uppercase tracking-tight border-2">
            Select File
          </Button>
        )}
      </div>
    </div>
  );
}
