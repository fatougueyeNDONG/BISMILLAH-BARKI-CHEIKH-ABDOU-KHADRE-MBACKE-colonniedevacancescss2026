import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface ImportResult {
  success: number;
  errors: { ligne: number; message: string }[];
}

export interface EntityConfig {
  label: string;
  colonnes: string[];
  description: string;
}

interface EntityOption {
  value: string;
  config: EntityConfig;
  onImport: (data: any[]) => ImportResult;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: EntityOption[];
  /** If only one entity, skip the selector */
  singleEntity?: boolean;
}

export default function ImportExcel({ open, onOpenChange, entities, singleEntity }: Props) {
  const [selectedEntity, setSelectedEntity] = useState(entities[0]?.value || '');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentEntity = entities.find(e => e.value === selectedEntity) || entities[0];

  const reset = () => {
    setPreviewData([]); setPreviewHeaders([]); setFileName(''); setResult(null); setStep('select');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (val: boolean) => { if (!val) reset(); onOpenChange(val); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      toast({ title: '❌ Format non supporté', description: 'Fichier Excel (.xlsx, .xls) ou CSV (.csv) requis', variant: 'destructive' });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (!json.length) { toast({ title: '⚠️ Fichier vide', variant: 'destructive' }); return; }
        setPreviewHeaders(Object.keys(json[0]).map(h => h.toLowerCase().trim()));
        setPreviewData(json.slice(0, 100));
        setStep('preview');
      } catch { toast({ title: '❌ Erreur de lecture', variant: 'destructive' }); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (!currentEntity) return;
    const normalized = previewData.map(row => {
      const n: any = {};
      Object.keys(row).forEach(k => { n[k.toLowerCase().trim()] = String(row[k]).trim(); });
      return n;
    });
    const res = currentEntity.onImport(normalized);
    setResult(res);
    setStep('result');
    if (res.success > 0) toast({ title: `✅ ${res.success} ${currentEntity.config.label} importé(s)` });
    if (res.errors.length > 0) toast({ title: `⚠️ ${res.errors.length} erreur(s)`, variant: 'destructive' });
  };

  const handleDownloadTemplate = () => {
    if (!currentEntity) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([currentEntity.config.colonnes]);
    XLSX.utils.book_append_sheet(wb, ws, currentEntity.config.label);
    XLSX.writeFile(wb, `modele_${currentEntity.value}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl rounded-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />Import Excel {singleEntity ? `— ${currentEntity?.config.label}` : ''}
          </DialogTitle>
          <DialogDescription>Importez des données depuis un fichier Excel ou CSV</DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-5">
            {!singleEntity && entities.length > 1 && (
              <div className="space-y-2">
                <Label className="font-semibold">Type de données</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {entities.map(e => <SelectItem key={e.value} value={e.value}>{e.config.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {currentEntity && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">📋 Format attendu : {currentEntity.config.label}</p>
                <p className="text-xs text-muted-foreground">{currentEntity.config.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentEntity.config.colonnes.map(col => <Badge key={col} variant="secondary" className="text-xs font-mono">{col}</Badge>)}
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2 mt-2">
                  <Download className="w-3.5 h-3.5" />Télécharger le modèle
                </Button>
              </div>
            )}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3 hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Glissez votre fichier ici ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 rounded-lg">
                <Upload className="w-4 h-4" />Choisir un fichier
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">📄 {fileName}</p>
                <p className="text-xs text-muted-foreground">{previewData.length} ligne(s) — {currentEntity?.config.label}</p>
              </div>
              <Badge variant="secondary">{previewData.length} lignes</Badge>
            </div>
            <div className="border border-border rounded-lg overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs w-10">#</TableHead>
                    {previewHeaders.map(h => <TableHead key={h} className="text-xs font-mono">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {previewHeaders.map(h => <TableCell key={h} className="text-xs">{String(row[Object.keys(row).find(k => k.toLowerCase().trim() === h) || ''] || '')}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {previewData.length > 10 && <p className="text-xs text-muted-foreground text-center">... et {previewData.length - 10} autres lignes</p>}
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex gap-4">
              {result.success > 0 && (
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div><p className="font-semibold text-emerald-800">{result.success} importé(s)</p><p className="text-xs text-emerald-600">avec succès</p></div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="flex-1 bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-destructive shrink-0" />
                  <div><p className="font-semibold text-destructive">{result.errors.length} erreur(s)</p><p className="text-xs text-muted-foreground">non importées</p></div>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Ligne</TableHead><TableHead className="text-xs">Erreur</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {result.errors.map((err, i) => <TableRow key={i}><TableCell className="text-xs font-mono">{err.ligne}</TableCell><TableCell className="text-xs text-destructive">{err.message}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'select' && <Button variant="outline" onClick={() => handleClose(false)} className="rounded-lg">Fermer</Button>}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={reset} className="rounded-lg">Retour</Button>
              <Button onClick={handleImport} className="rounded-lg bg-primary text-primary-foreground gap-2"><Upload className="w-4 h-4" />Importer {previewData.length} ligne(s)</Button>
            </>
          )}
          {step === 'result' && (
            <>
              <Button variant="outline" onClick={reset} className="rounded-lg">Nouvel import</Button>
              <Button onClick={() => handleClose(false)} className="rounded-lg bg-primary text-primary-foreground">Terminé</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
