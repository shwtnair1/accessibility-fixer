"use client";

import { useState, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, Sparkles, CheckCircle, AlertCircle } from "lucide-react";

type LogItem = { 
  category: string; 
  action: string; 
  selector: string; 
  summary: string;
  index?: number;
};

type FixResult = {
  code: string;
  log: LogItem[];
  hasChanges?: boolean;
  fixes?: LogItem[];
};

const Index = () => {
  const [sourceCode, setSourceCode] = useState('<button><svg/></button>\n<img src="/x.png"/>\n<a href="#"></a>\n<div onClick={() => {}}/>\n<input />');
  const [result, setResult] = useState<FixResult | null>(null);
  const [editedCode, setEditedCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refining, setRefining] = useState<Record<number, boolean>>({});

  const handleAnalyze = useCallback(async () => {
    if (!sourceCode.trim()) {
      alert("Please paste some JSX or HTML code to analyze");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: sourceCode }),
      });
      
      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`);
      }
      
      const data = await res.json();
      const fixResult: FixResult = {
        code: data.code || sourceCode,
        log: data.log || [],
        hasChanges: (data.log || []).length > 0,
        fixes: data.log || []
      };
      
      setResult(fixResult);
      setEditedCode(fixResult.code || sourceCode);
      
      if (fixResult.hasChanges && fixResult.fixes) {
        console.log(`Found and fixed ${fixResult.fixes.length} accessibility ${fixResult.fixes.length === 1 ? 'issue' : 'issues'}`);
      } else {
        console.log("No accessibility issues detected in your code");
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert("An error occurred while analyzing your code");
    } finally {
      setIsAnalyzing(false);
    }
  }, [sourceCode]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${label} copied to clipboard`);
    } catch (error) {
      console.error("Unable to copy to clipboard");
    }
  }, []);

  const downloadCode = useCallback(() => {
    const blob = new Blob([editedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fixed-code.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log("Fixed code saved to your device");
  }, [editedCode]);

  const getBadgeVariant = (action: string) => {
    if (action === "add" || action.includes("missing") || action.includes("only") || action.includes("clickable")) {
      return "default";
    }
    if (action === "suggest" || action.includes("suggest")) {
      return "secondary";
    }
    if (action === "update" || action.includes("update")) {
      return "outline";
    }
    return "secondary";
  };

  const groupedLog = useMemo(() => {
    if (!result?.fixes) return {};
    
    const groups: Record<string, LogItem[]> = {};
    result.fixes.forEach((fix, index) => {
      const category = fix.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push({
        category,
        action: fix.action || 'fix',
        selector: fix.selector || '',
        summary: fix.summary || '',
        index
      });
    });
    return groups;
  }, [result]);

  const hasResults = useMemo(() => Boolean(result && (result.code || (result.fixes && result.fixes.length > 0))), [result]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Accessibility Fixer
          </h1>
          <p className="text-muted-foreground">
            Transform your JSX/HTML into accessible, inclusive code automatically
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
          {/* Input Section */}
          <Card className="flex flex-col shadow-elegant bg-card/50 backdrop-blur-sm border border-primary/10">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <h2 className="font-semibold text-card-foreground">Input Code</h2>
                </div>
                <Badge variant="secondary" className="text-xs">
                  JSX / HTML
                </Badge>
              </div>
            </div>
            
            <div className="flex-1 p-6 space-y-4">
              <div className="flex-1 min-h-[400px]">
                <textarea
                  className="w-full h-full min-h-[400px] p-4 rounded-lg border bg-code-background text-code-foreground font-mono text-sm placeholder:text-code-muted resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-smooth custom-scroll"
                  placeholder="Paste your JSX or HTML code here..."
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {sourceCode.split('\n').length} lines • {sourceCode.length} characters
                </div>
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !sourceCode.trim()}
                  className="transition-smooth"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Fix Accessibility
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Results Section */}
          <Card className="flex flex-col shadow-elegant bg-card/50 backdrop-blur-sm border border-primary/10">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <h2 className="font-semibold text-card-foreground">Results</h2>
                  {result && result.hasChanges && result.fixes && (
                    <Badge variant="default" className="text-xs">
                      {result.fixes.length} {result.fixes.length === 1 ? 'Fix' : 'Fixes'}
                    </Badge>
                  )}
                </div>
                {hasResults && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(editedCode, "Fixed code")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadCode}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-6">
              {isAnalyzing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="space-y-2">
                      <p className="font-medium">Analyzing your code...</p>
                      <p className="text-sm text-muted-foreground">Checking for accessibility issues</p>
                    </div>
                  </div>
                </div>
              ) : !hasResults ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Ready to analyze</p>
                      <p className="text-sm text-muted-foreground">Paste your code and click "Fix Accessibility"</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="overview" className="flex flex-col h-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="code">Fixed Code</TabsTrigger>
                    <TabsTrigger value="changes">Changes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="flex-1 mt-4 space-y-4">
                    {result && result.hasChanges && result.fixes ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <div>
                            <p className="font-medium text-success">Great! Found {result.fixes.length} accessibility {result.fixes.length === 1 ? 'issue' : 'issues'}</p>
                            <p className="text-sm text-success/80">Your code has been automatically fixed</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(groupedLog).map(([category, items]) => (
                            <div key={category} className="space-y-2">
                              <h3 className="font-medium text-sm text-foreground">{category}</h3>
                              <div className="space-y-2">
                                {items.map((item, idx) => (
                                  <div key={idx} className="p-3 rounded-lg border bg-card/50 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Badge variant={getBadgeVariant(item.action)} className="text-xs">
                                        {item.action}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {item.selector}
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground">{item.summary}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <div>
                          <p className="font-medium text-success">Perfect! No accessibility issues found</p>
                          <p className="text-sm text-success/80">Your code follows accessibility best practices</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="code" className="flex-1 mt-4">
                    <div className="h-[400px] rounded-lg border bg-code-background">
                      <textarea
                        className="w-full h-full p-4 bg-transparent text-code-foreground font-mono text-sm resize-none focus:outline-none custom-scroll"
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value)}
                        readOnly={false}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="changes" className="flex-1 mt-4">
                    <div className="h-[400px] rounded-lg border bg-code-background overflow-auto custom-scroll">
                      <div className="p-4 space-y-2 text-sm font-mono">
                        {sourceCode.split('\n').map((line, idx) => {
                          const fixedLine = editedCode.split('\n')[idx] || '';
                          const isChanged = line !== fixedLine;
                          
                          return (
                            <div key={idx} className="grid grid-cols-2 gap-4">
                              <div className={`p-2 rounded ${isChanged ? 'bg-destructive/10 text-destructive' : 'text-code-muted'}`}>
                                <span className="text-xs text-muted-foreground mr-2">{idx + 1}</span>
                                {line || ' '}
                              </div>
                              <div className={`p-2 rounded ${isChanged ? 'bg-success/10 text-success' : 'text-code-muted'}`}>
                                <span className="text-xs text-muted-foreground mr-2">{idx + 1}</span>
                                {fixedLine || ' '}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </Card>
        </div>

        {/* Enhanced Footer */}
        <div className="text-center space-y-4 pt-8 border-t border-border/50">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Automated fixes</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>WCAG compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span>Best practices</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for frontend developers who care about accessibility. 
            <span className="text-primary ml-1 font-medium">Make the web accessible for everyone.</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;