import React, { useState, useRef } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Upload, FileText, File, Sparkles, Target, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { processStudyMaterial } from '../lib/gemini';
import { cn } from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';

// Use a CDN for the worker to avoid complex bundler configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Same sidebar links as AIAssistant
import { LayoutDashboard, Target as TargetIcon, Calendar, Settings, Video, BrainCircuit, TrendingUp } from 'lucide-react';
const studentLinks = [
  { label: 'Dashboard', path: '/dashboard/student', icon: LayoutDashboard, color: '#3b82f6' },
  { label: 'My Classes', path: '/dashboard/student/classes', icon: Video, color: '#f43f5e' },
  { label: 'AI Assistant', path: '/dashboard/student/ai', icon: BrainCircuit, color: '#8b5cf6' },
  { label: 'Notes', path: '/dashboard/student/notes', icon: FileText, color: '#10b981' },
  { label: 'Quizzes', path: '/dashboard/student/quizzes', icon: TargetIcon, color: '#f59e0b' },
  { label: 'Learning Path', path: '/dashboard/student/path', icon: TrendingUp, color: '#ec4899' },
  { label: 'Assignments', path: '/dashboard/student/assignments', icon: FileText, color: '#10b981' },
  { label: 'Profile', path: '/dashboard/student/profile', icon: Settings, color: '#64748b' },
];

export function Notes() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'paste'
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState(null);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [uploadedImageData, setUploadedImageData] = useState(null); // { data, mimeType, previewUrl }
  
  const [aiOutput, setAiOutput] = useState('');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    
    const isImage = uploadedFile.type.startsWith('image/');
    const isPDF = uploadedFile.type === 'application/pdf';

    if (!isImage && !isPDF) {
      setError("Please upload a valid PDF or Image file.");
      return;
    }
    
    setFile(uploadedFile);
    setError('');
    setAiOutput('');
    setExtractedText('');
    setUploadedImageData(null);
    setIsExtracting(true);

    try {
      if (isImage) {
        // Read image as Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          setUploadedImageData({
            data: base64String,
            mimeType: uploadedFile.type,
            previewUrl: reader.result
          });
          setIsExtracting(false);
        };
        reader.onerror = () => {
          throw new Error("Failed to read image file.");
        };
        reader.readAsDataURL(uploadedFile);
      } else if (isPDF) {
        // Handle PDF
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        
        const maxPages = Math.min(pdf.numPages, 50);
        
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        
        if (pdf.numPages > 50) {
          fullText += `\n[Note: Document exceeded 50 pages. Only the first 50 pages were extracted for AI analysis.]`;
        }
        
        if (!fullText.trim()) {
          throw new Error("Could not extract any readable text from this PDF. It might be scanned images. Try taking a screenshot and uploading it as an image instead.");
        }
        
        setExtractedText(fullText);
        setIsExtracting(false);
      }
    } catch (err) {
      console.error("File Processing Error:", err);
      setError("Failed to read file: " + err.message);
      setIsExtracting(false);
      setFile(null);
    }
  };

  const handleAction = async (actionType) => {
    let materialToProcess = null;

    if (activeTab === 'upload') {
      if (uploadedImageData) {
        materialToProcess = { type: 'image', ...uploadedImageData };
      } else if (extractedText) {
        materialToProcess = { type: 'text', data: extractedText };
      }
    } else {
      if (textInput.trim()) {
        materialToProcess = { type: 'text', data: textInput };
      }
    }
    
    if (!materialToProcess) {
      setError("Please provide some text or upload a document/image first.");
      return;
    }
    
    setError('');
    setIsProcessingAI(true);
    setAiOutput('');
    
    try {
      const response = await processStudyMaterial(materialToProcess, actionType);
      setAiOutput(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              AI Study Notes
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Upload PDFs or paste lectures to generate instant study material.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-1 border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="flex bg-slate-50 p-1 rounded-t-xl border-b-2 border-slate-100">
                <button 
                  onClick={() => setActiveTab('upload')}
                  className={cn("flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center", activeTab === 'upload' ? "bg-white text-[#10b981] shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload File
                </button>
                <button 
                  onClick={() => setActiveTab('paste')}
                  className={cn("flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center", activeTab === 'paste' ? "bg-white text-[#10b981] shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  <FileText className="w-4 h-4 mr-2" /> Paste Text
                </button>
              </div>

              <div className="p-6 bg-white min-h-[300px] flex flex-col justify-center">
                {activeTab === 'upload' ? (
                  <div className="text-center">
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    {!file && !isExtracting && (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-3 border-dashed border-slate-200 rounded-3xl p-10 cursor-pointer hover:border-[#10b981] hover:bg-[#10b981]/5 transition-all group"
                      >
                        <div className="w-16 h-16 bg-[#10b981]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <File className="w-8 h-8 text-[#10b981]" />
                        </div>
                        <p className="font-bold text-slate-700 text-lg">Click to upload PDF or Image</p>
                        <p className="text-slate-400 font-bold text-sm mt-2">Extract text and analyze with AI</p>
                      </div>
                    )}

                    {isExtracting && (
                      <div className="py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-[#10b981] mx-auto mb-4" />
                        <p className="font-bold text-slate-600">Reading PDF document...</p>
                      </div>
                    )}

                    {file && !isExtracting && (
                      <div className="bg-[#10b981]/10 border-2 border-[#10b981]/20 rounded-2xl p-6 text-left">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <File className="w-8 h-8 text-[#10b981] mr-3" />
                            <div>
                              <p className="font-bold text-slate-800 line-clamp-1">{file.name}</p>
                              <p className="text-sm font-bold text-[#10b981]">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready for AI</p>
                            </div>
                          </div>
                          <button onClick={() => { setFile(null); setUploadedImageData(null); setExtractedText(''); }} className="text-slate-400 hover:text-red-500 font-bold text-sm bg-white px-3 py-1 rounded-lg border-2 border-slate-100 shadow-sm">
                            Remove
                          </button>
                        </div>
                        {uploadedImageData ? (
                          <div className="mt-4 flex justify-center">
                            <img src={uploadedImageData.previewUrl} alt="Uploaded preview" className="max-h-48 rounded-xl shadow-sm border-2 border-white object-contain bg-white" />
                          </div>
                        ) : (
                          <div className="mt-4 p-3 bg-white/50 rounded-xl text-xs font-mono text-slate-500 overflow-hidden h-20 relative border-2 border-white">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#e6fcf5] pointer-events-none" />
                            {extractedText.substring(0, 300)}...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your lecture notes, article, or raw text here..."
                    className="w-full h-[300px] p-4 border-2 border-slate-100 rounded-2xl focus:border-[#10b981] focus:ring-[#10b981]/20 font-medium text-slate-700 resize-none custom-scrollbar bg-slate-50"
                  />
                )}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handleAction('summarize')} variant="outline" className="py-6 font-bold border-2 hover:bg-[#8b5cf6]/5 hover:text-[#8b5cf6] hover:border-[#8b5cf6]/30 flex flex-col items-center justify-center h-auto text-slate-600 bg-white shadow-sm">
                <Sparkles className="w-6 h-6 mb-2 text-[#8b5cf6]" />
                Summarize
              </Button>
              <Button onClick={() => handleAction('extract')} variant="outline" className="py-6 font-bold border-2 hover:bg-[#14b8a6]/5 hover:text-[#14b8a6] hover:border-[#14b8a6]/30 flex flex-col items-center justify-center h-auto text-slate-600 bg-white shadow-sm">
                <FileText className="w-6 h-6 mb-2 text-[#14b8a6]" />
                Key Points
              </Button>
              <Button onClick={() => handleAction('questions')} variant="outline" className="py-6 font-bold border-2 hover:bg-[#f59e0b]/5 hover:text-[#f59e0b] hover:border-[#f59e0b]/30 flex flex-col items-center justify-center h-auto text-slate-600 bg-white shadow-sm">
                <Target className="w-6 h-6 mb-2 text-[#f59e0b]" />
                Exam Prep
              </Button>
              <Button onClick={() => handleAction('revision')} variant="outline" className="py-6 font-bold border-2 hover:bg-[#f43f5e]/5 hover:text-[#f43f5e] hover:border-[#f43f5e]/30 flex flex-col items-center justify-center h-auto text-slate-600 bg-white shadow-sm">
                <BookOpen className="w-6 h-6 mb-2 text-[#f43f5e]" />
                Revision
              </Button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7">
            <Card className="h-full min-h-[500px] p-0 overflow-hidden border-t-4 border-t-[#10b981] shadow-sm flex flex-col bg-white">
              <div className="px-6 py-4 border-b-2 border-slate-100 bg-slate-50 flex items-center">
                <BrainCircuit className="w-5 h-5 text-[#10b981] mr-2" />
                <h2 className="font-bold text-slate-700">AI Analysis Result</h2>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl border-2 border-red-100 font-bold flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
                
                {isProcessingAI && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin text-[#10b981] mb-4" />
                    <p className="font-bold text-lg">AI is analyzing material...</p>
                    <p className="text-sm">This may take a few seconds for large documents.</p>
                  </div>
                )}

                {!isProcessingAI && !error && !aiOutput && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-slate-100">
                      <Sparkles className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-lg text-slate-400">Ready to assist</p>
                    <p className="text-sm font-medium">Upload material and select an action to begin.</p>
                  </div>
                )}

                {!isProcessingAI && aiOutput && (
                  <div className="prose prose-slate max-w-none prose-p:font-bold prose-headings:font-black prose-a:text-[#10b981] prose-strong:text-slate-800 prose-ul:font-bold prose-ol:font-bold marker:text-[#10b981]">
                    <ReactMarkdown>{aiOutput}</ReactMarkdown>
                  </div>
                )}
              </div>
            </Card>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
