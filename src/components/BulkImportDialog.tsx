import { useMemo, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { CloudUpload } from '@mui/icons-material'
import * as XLSX from 'xlsx'

export type BulkImportMode = 'update' | 'replace' | 'skip'
export type BulkImportField = { key:string; label:string; required?:boolean; aliases?:string[] }

export function BulkImportDialog({ open, title, fields, onClose, onApply }:{open:boolean;title:string;fields:BulkImportField[];onClose:()=>void;onApply:(rows:Record<string,unknown>[],mode:BulkImportMode)=>Promise<void>}) {
  const [rows,setRows]=useState<Record<string,unknown>[]>([])
  const [headers,setHeaders]=useState<string[]>([])
  const [mapping,setMapping]=useState<Record<string,string>>({})
  const [mode,setMode]=useState<BulkImportMode>('update')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const mappedRows=useMemo(()=>rows.map(row=>Object.fromEntries(headers.flatMap(header=>mapping[header]?[[mapping[header],row[header]]]:[]))),[headers,mapping,rows])

  async function choose(file:File) {
    setError('')
    try {
      const book=XLSX.read(await file.arrayBuffer(),{type:'array'}), sheet=book.Sheets[book.SheetNames[0]]
      const next=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:''}), nextHeaders=next.length?Object.keys(next[0]):[]
      const nextMap:Record<string,string>={}
      for(const header of nextHeaders){const normalized=header.toLowerCase().replace(/[^a-z0-9]/g,'');const field=fields.find(item=>[item.key,item.label,...(item.aliases||[])].some(value=>value.toLowerCase().replace(/[^a-z0-9]/g,'')===normalized));if(field)nextMap[header]=field.key}
      setRows(next);setHeaders(nextHeaders);setMapping(nextMap)
    } catch(cause) { setError(cause instanceof Error?cause.message:'Could not read this file.') }
  }

  async function apply() {
    const missing=fields.filter(field=>field.required&&!Object.values(mapping).includes(field.key))
    if(missing.length){setError(`Map required fields: ${missing.map(field=>field.label).join(', ')}`);return}
    setBusy(true);setError('')
    try{await onApply(mappedRows,mode);setRows([]);setHeaders([]);setMapping({});onClose()}catch(cause){setError(cause instanceof Error?cause.message:'Import failed.')}finally{setBusy(false)}
  }

  return <Dialog open={open} onClose={busy?undefined:onClose} fullWidth maxWidth="lg">
    <DialogTitle>{title}</DialogTitle><DialogContent dividers><Stack spacing={2}>
      <Alert severity="info">Upload .csv, .xls or .xlsx. Review field mapping and choose how existing records are handled before applying.</Alert>
      <Button component="label" variant="outlined" startIcon={<CloudUpload/>}>Choose CSV / Excel<input hidden type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event=>{const file=event.target.files?.[0];if(file)void choose(file);event.target.value=''}}/></Button>
      {headers.length?<><Stack direction={{xs:'column',md:'row'}} spacing={1.25} useFlexGap sx={{flexWrap:'wrap'}}>{headers.map(header=><FormControl key={header} size="small" sx={{minWidth:190}}><InputLabel>{header}</InputLabel><Select label={header} value={mapping[header]||''} onChange={event=>setMapping(current=>({...current,[header]:String(event.target.value)}))}><MenuItem value="">Ignore</MenuItem>{fields.map(field=><MenuItem value={field.key} key={field.key}>{field.label}{field.required?' *':''}</MenuItem>)}</Select></FormControl>)}</Stack>
      <FormControl size="small" sx={{maxWidth:320}}><InputLabel>Existing record</InputLabel><Select label="Existing record" value={mode} onChange={event=>setMode(event.target.value as BulkImportMode)}><MenuItem value="update">Update mapped fields</MenuItem><MenuItem value="replace">Replace editable values</MenuItem><MenuItem value="skip">Skip existing records</MenuItem></Select></FormControl>
      <Typography variant="body2">{rows.length} rows found · previewing first 8</Typography><TableContainer sx={{maxHeight:300,border:'1px solid',borderColor:'divider',borderRadius:2}}><Table stickyHeader size="small"><TableHead><TableRow>{headers.map(header=><TableCell key={header}>{header}</TableCell>)}</TableRow></TableHead><TableBody>{rows.slice(0,8).map((row,index)=><TableRow key={index}>{headers.map(header=><TableCell key={header}>{String(row[header]??'')}</TableCell>)}</TableRow>)}</TableBody></Table></TableContainer></>:null}
      {error?<Alert severity="error">{error}</Alert>:null}
    </Stack></DialogContent><DialogActions><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={()=>void apply()} disabled={busy||!rows.length}>{busy?'Importing…':`Import ${rows.length} rows`}</Button></DialogActions>
  </Dialog>
}
